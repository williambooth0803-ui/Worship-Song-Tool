import { validateWorkspace } from "./backup.js";
export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      "Your account copy changed on another device. Load or review that copy before saving again.",
    );
    this.name = "WorkspaceConflictError";
  }
}

export function validateAccountConfig(config) {
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) return null;
  const url = new URL(config.supabaseUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Use a public Supabase HTTPS project URL.");
  const key = config.supabasePublishableKey;
  if (typeof key !== "string" || key.startsWith("sb_secret_"))
    throw new Error("A secret key cannot be used in the website.");
  if (!key.startsWith("sb_publishable_")) {
    let claims;
    try {
      claims = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
    } catch {
      throw new Error("Use the project’s publishable key or legacy anon key.");
    }
    if (claims.role !== "anon")
      throw new Error("Only a public anon key may be used in the website.");
  }
  return { url: url.origin, key };
}

export class AccountClient {
  constructor(
    config,
    { storage, fetcher = globalThis.fetch.bind(globalThis) } = {},
  ) {
    this.config = validateAccountConfig(config);
    this.storage = storage;
    this.fetcher = fetcher;
    this.session = null;
    this.workspaceVersion = undefined;
    this.workspaceRequest = 0;
    try {
      this.storage ||= globalThis.sessionStorage;
    } catch {
      /* Privacy settings may block storage. */
    }
    this.storage ||= {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    if (this.config) {
      try {
        const saved = JSON.parse(
          this.storage.getItem("faithful-repertoire-session"),
        );
        if (
          saved?.project === this.config.url &&
          saved.session?.access_token &&
          saved.session?.refresh_token
        )
          this.session = saved.session;
      } catch {
        /* An unavailable session store leaves the user signed out. */
      }
    }
  }
  get configured() {
    return Boolean(this.config);
  }
  get user() {
    return this.session?.user || null;
  }
  setSession(session) {
    if (
      session &&
      (!session.access_token || !session.refresh_token || !session.user?.id)
    )
      throw new Error("The sign-in response is incomplete.");
    if (this.session?.user?.id !== session?.user?.id) {
      this.workspaceVersion = undefined;
      this.workspaceRequest++;
    }
    this.session = session;
    try {
      if (session)
        this.storage.setItem(
          "faithful-repertoire-session",
          JSON.stringify({ project: this.config.url, session }),
        );
      else this.storage.removeItem("faithful-repertoire-session");
    } catch {
      /* The current tab can remain signed in without persistence. */
    }
  }
  async request(
    path,
    {
      method = "GET",
      body,
      authenticated = false,
      refresh = true,
      headers = {},
    } = {},
  ) {
    if (!this.config)
      throw new Error(
        "Accounts are not configured yet. You can continue using this browser workspace.",
      );
    if (authenticated && !this.session) throw new Error("Sign in first.");
    const response = await this.fetcher(`${this.config.url}${path}`, {
      method,
      signal: AbortSignal.timeout(20000),
      headers: {
        apikey: this.config.key,
        "Content-Type": "application/json",
        ...(authenticated
          ? { Authorization: `Bearer ${this.session.access_token}` }
          : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (
      response.status === 401 &&
      authenticated &&
      refresh &&
      this.session?.refresh_token
    ) {
      try {
        await this.refreshSession();
      } catch {
        this.setSession(null);
        throw new Error(
          "Your session expired. Sign in again; your browser workspace is preserved.",
        );
      }
      return this.request(path, {
        method,
        body,
        authenticated,
        refresh: false,
        headers,
      });
    }
    const data =
      response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok)
      if (response.status === 409 && path.startsWith("/rest/v1/workspaces"))
        throw new WorkspaceConflictError();
    if (!response.ok)
      throw new Error(
        data?.msg ||
          data?.error_description ||
          data?.message ||
          "The account request failed. Please try again.",
      );
    return data;
  }
  async signIn(email, password) {
    const session = await this.request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password },
    });
    this.setSession(session);
    return this.user;
  }
  async signUp(email, password, redirectTo) {
    const result = await this.request(
      `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
      { method: "POST", body: { email, password } },
    );
    if (result.access_token) this.setSession(result);
    return { signedIn: Boolean(result.access_token) };
  }
  async refreshSession() {
    const session = await this.request(
      "/auth/v1/token?grant_type=refresh_token",
      { method: "POST", body: { refresh_token: this.session.refresh_token } },
    );
    this.setSession(session);
  }
  async restoreSession() {
    if (!this.session) return;
    const originalUserId = this.session.user?.id;
    try {
      const user = await this.request("/auth/v1/user", { authenticated: true });
      if (this.session?.user?.id === originalUserId) {
        this.session.user = user;
        this.setSession(this.session);
      }
    } catch {
      if (this.session?.user?.id === originalUserId) this.setSession(null);
    }
  }
  async acceptConfirmation(fragment) {
    const values = new URLSearchParams(fragment.replace(/^#/, ""));
    if (!values.has("access_token")) return null;
    const access = values.get("access_token"),
      refresh = values.get("refresh_token");
    if (!refresh)
      throw new Error(
        "The confirmation link is incomplete. Sign in with your email and password.",
      );
    const user = await this.request("/auth/v1/user", {
      headers: { Authorization: `Bearer ${access}` },
    });
    this.setSession({ access_token: access, refresh_token: refresh, user });
    return values.get("type");
  }
  async signOut() {
    try {
      if (this.session)
        await this.request("/auth/v1/logout", {
          method: "POST",
          authenticated: true,
        });
    } finally {
      this.setSession(null);
    }
  }
  async recover(email, redirectTo) {
    await this.request(
      `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      { method: "POST", body: { email } },
    );
  }
  async changePassword(password) {
    await this.request("/auth/v1/user", {
      method: "PUT",
      authenticated: true,
      body: { password },
    });
  }
  userId() {
    const value = this.user?.id;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value || "",
      )
    )
      throw new Error("Sign in with a valid account first.");
    return value;
  }
  async loadWorkspace() {
    const owner = this.userId(),
      requestNumber = ++this.workspaceRequest;
    const rows = await this.request(
      `/rest/v1/workspaces?user_id=eq.${owner}&select=workspace,updated_at`,
      { authenticated: true },
    );
    if (this.user?.id !== owner)
      throw new Error("The signed-in account changed. Please try again.");
    if (!Array.isArray(rows) || rows.length > 1)
      throw new Error("The account workspace response was invalid.");
    if (!rows.length) {
      if (requestNumber === this.workspaceRequest) this.workspaceVersion = null;
      return null;
    }
    if (
      typeof rows[0].updated_at !== "string" ||
      !Number.isFinite(Date.parse(rows[0].updated_at))
    )
      throw new Error("The account copy has an invalid save date.");
    if (requestNumber === this.workspaceRequest)
      this.workspaceVersion = rows[0].updated_at;
    return {
      workspace: validateWorkspace(rows[0].workspace),
      updatedAt: rows[0].updated_at,
    };
  }
  async saveWorkspace(workspace) {
    const owner = this.userId(),
      checked = validateWorkspace(workspace);
    if (this.workspaceVersion === undefined) await this.loadWorkspace();
    if (this.user?.id !== owner)
      throw new Error("The signed-in account changed. Please try again.");
    const version = this.workspaceVersion,
      requestNumber = ++this.workspaceRequest;
    const rows = await this.request(
      version === null
        ? "/rest/v1/workspaces?select=updated_at"
        : `/rest/v1/workspaces?user_id=eq.${owner}&updated_at=eq.${encodeURIComponent(version)}&select=updated_at`,
      {
        method: version === null ? "POST" : "PATCH",
        authenticated: true,
        headers: { Prefer: "return=representation" },
        body:
          version === null
            ? { user_id: owner, workspace: checked }
            : { workspace: checked },
      },
    );
    if (this.user?.id !== owner)
      throw new Error("The signed-in account changed. Please try again.");
    if (!Array.isArray(rows) || rows.length !== 1)
      throw new WorkspaceConflictError();
    const date = rows[0].updated_at;
    if (typeof date !== "string" || !Number.isFinite(Date.parse(date)))
      throw new Error(
        "The saved account copy could not be verified. Your browser copy is retained.",
      );
    if (requestNumber === this.workspaceRequest) this.workspaceVersion = date;
    return { updatedAt: date };
  }
  async loadProfile() {
    const rows = await this.request(
      `/rest/v1/profiles?user_id=eq.${this.userId()}&select=profile`,
      { authenticated: true },
    );
    if (!Array.isArray(rows))
      throw new Error("The account profile response was invalid.");
    if (!rows.length) return null;
    return this.validateProfile(rows[0].profile);
  }
  validateProfile(profile) {
    return validateWorkspace({
      version: 1,
      songs: [],
      libraries: [
        { id: "validation", name: "Profile validation", songIds: [] },
      ],
      plans: [],
      profile,
    }).profile;
  }
  async saveProfile(profile) {
    await this.request("/rest/v1/profiles?on_conflict=user_id", {
      method: "POST",
      authenticated: true,
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: { user_id: this.userId(), profile: this.validateProfile(profile) },
    });
  }
}
