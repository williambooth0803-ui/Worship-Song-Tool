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
    this.persisted = false;
    this.workspaceVersion = undefined;
    this.workspaceRequest = 0;
    try {
      this.storage ||= globalThis.localStorage;
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
          saved.session?.refresh_token && saved.session?.user?.id
        )
          { this.session = saved.session; this.persisted = true; }
      } catch {
        /* An unavailable session store leaves the user signed out. */
      }
      // Upgrade existing tab-only sessions once; credentials stay out of backups.
      if (!this.session && !storage) {
        try {
          const old = JSON.parse(globalThis.sessionStorage?.getItem("faithful-repertoire-session"));
          if (old?.project === this.config.url && old.session?.access_token && old.session?.refresh_token && old.session?.user?.id)
            this.setSession(old.session);
          globalThis.sessionStorage?.removeItem("faithful-repertoire-session");
        } catch { /* Storage may be blocked. */ }
      }
    }
  }
  get configured() {
    return Boolean(this.config);
  }
  get user() {
    return this.session?.user || null;
  }
  syncStoredSession() {
    let saved;
    try { saved = JSON.parse(this.storage.getItem("faithful-repertoire-session")); }
    catch { return false; }
    const next = saved?.project === this.config?.url && saved.session?.access_token && saved.session?.refresh_token && saved.session?.user?.id ? saved.session : null;
    const changed = this.user?.id !== next?.user?.id;
    if (changed) { this.workspaceVersion = undefined; this.workspaceRequest++; }
    this.session = next;
    this.persisted = Boolean(next);
    return changed;
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
      this.persisted = Boolean(session) && this.storage.getItem("faithful-repertoire-session") !== null;
    } catch {
      /* The current tab can remain signed in without persistence. */
      this.persisted = false;
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
      binary = false,
      responseType = "json",
      signal,
    } = {},
  ) {
    if (!this.config)
      throw new Error(
        "Accounts are not configured yet. You can continue using this browser workspace.",
      );
    if (authenticated && !this.session) throw new Error("Sign in first.");
    const owner = authenticated ? this.user?.id : null;
    const requestToken = authenticated ? this.session.access_token : null;
    const response = await this.fetcher(`${this.config.url}${path}`, {
      method,
      signal: signal || AbortSignal.timeout(20000),
      headers: {
        apikey: this.config.key,
        "Content-Type": "application/json",
        ...(authenticated
          ? { Authorization: `Bearer ${requestToken}` }
          : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: binary ? body : JSON.stringify(body) }),
    });
    signal?.throwIfAborted();
    if (authenticated && owner !== this.user?.id) throw new Error("The signed-in account changed. Please try again.");
    if (
      response.status === 401 &&
      authenticated &&
      refresh &&
      this.session?.refresh_token
    ) {
      try {
        await this.refreshSession(requestToken, { signal });
      } catch (err) {
        if ([400, 401, 403].includes(err.status)) {
          if (owner === this.user?.id) this.setSession(null);
          throw new Error("Your session expired. Sign in again; your browser workspace is preserved.");
        }
        throw err;
      }
      return this.request(path, {
        method,
        body,
        authenticated,
        refresh: false,
        headers,
        binary,
        responseType,
        signal,
      });
    }
    const data =
      response.status === 204 ? null : response.ok && responseType === "blob" ? await response.blob() : await response.json().catch(() => null);
    signal?.throwIfAborted();
    if (!response.ok)
      if (response.status === 409 && path.startsWith("/rest/v1/workspaces"))
        throw new WorkspaceConflictError();
    if (!response.ok) {
      const error = new Error(
        data?.msg ||
          data?.error_description ||
          data?.message ||
          "The account request failed. Please try again.",
      );
      error.status = response.status;
      throw error;
    }
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
  attachmentPath(path) {
    if (typeof path !== "string" || !path.startsWith(this.userId() + "/") || path.split("/").length !== 3 || path.includes("..") || path.length > 600)
      throw new Error("This attachment belongs to a different account or has an invalid path.");
    return path.split("/").map(encodeURIComponent).join("/");
  }
  async uploadSongFile(path, file) {
    if (!file || file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("Choose a nonempty file up to 10 MB.");
    return this.request("/storage/v1/object/song-files/" + this.attachmentPath(path), { method: "POST", authenticated: true, binary: true, body: file, headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" } });
  }
  async downloadSongFile(path) {
    return this.request("/storage/v1/object/authenticated/song-files/" + this.attachmentPath(path), { authenticated: true, responseType: "blob" });
  }
  async deleteSongFile(path) {
    this.attachmentPath(path);
    return this.request("/storage/v1/object/song-files", { method: "DELETE", authenticated: true, body: { prefixes: [path] } });
  }
  async signUp(email, password, redirectTo) {
    const result = await this.request(
      `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
      { method: "POST", body: { email, password } },
    );
    if (result.access_token) this.setSession(result);
    return { signedIn: Boolean(result.access_token) };
  }
  async refreshSession(failedToken = this.session?.access_token, { signal } = {}) {
    // A delayed 401 may refer to a token another tab has already refreshed.
    // Compare the token actually used by that request, not the current token.
    const owner = this.user?.id, token = failedToken;
    const refresh = async () => {
      if (this.persisted) this.syncStoredSession();
      if (owner !== this.user?.id) throw new Error("The signed-in account changed. Please try again.");
      if (token !== this.session?.access_token) return;
      const session = await this.request(
      "/auth/v1/token?grant_type=refresh_token",
      { method: "POST", body: { refresh_token: this.session.refresh_token }, signal },
    );
      if (owner !== this.user?.id) throw new Error("The signed-in account changed. Please try again.");
      this.setSession(session);
    };
    if (this.refreshing) return this.refreshing;
    this.refreshing = globalThis.navigator?.locks
      ? globalThis.navigator.locks.request("faithful-repertoire-refresh:" + this.config.url, { signal: signal || AbortSignal.timeout(10000) }, refresh)
      : refresh();
    try { await this.refreshing; } finally { this.refreshing = null; }
  }
  async restoreSession({ signal } = {}) {
    if (!this.session) return;
    const originalUserId = this.session.user?.id;
    try {
      const user = await this.request("/auth/v1/user", { authenticated: true, signal });
      if (this.session?.user?.id === originalUserId) {
        this.session.user = user;
        this.setSession(this.session);
      }
    } catch (err) {
      if ([400, 401, 403].includes(err.status) && this.session?.user?.id === originalUserId) this.setSession(null);
      else throw err;
    }
  }
  async acceptConfirmation(fragment, { signal } = {}) {
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
      signal,
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
  async authorizationDetails(id) {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id))
      throw new Error("Invalid authorization request.");
    return this.request(`/auth/v1/oauth/authorizations/${id}`, {
      authenticated: true,
    });
  }
  async decideAuthorization(id, action) {
    if (
      !/^[a-zA-Z0-9_-]{1,200}$/.test(id) ||
      !["approve", "deny"].includes(action)
    )
      throw new Error("Invalid authorization decision.");
    return this.request(`/auth/v1/oauth/authorizations/${id}/consent`, {
      method: "POST",
      authenticated: true,
      body: { action },
    });
  }
  async listConnections() {
    const rows = await this.request(
      `/rest/v1/mcp_connections?user_id=eq.${this.userId()}&select=client_id,client_name,enabled,authorized_at,share_profile,share_libraries,share_plans,share_notes,share_lyrics`,
      { authenticated: true },
    );
    if (!Array.isArray(rows)) throw new Error("Invalid connection response.");
    return rows;
  }
  async saveConnection(client, permissions) {
    if (!/^[0-9a-f-]{36}$/i.test(client.id))
      throw new Error("Invalid connection client.");
    await this.request(
      "/rest/v1/mcp_connections?on_conflict=user_id,client_id",
      {
        method: "POST",
        authenticated: true,
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: {
          user_id: this.userId(),
          client_id: client.id,
          client_name: String(client.name || "ChatGPT").slice(0, 200),
          enabled: true,
          ...Object.fromEntries(
            ["profile", "libraries", "plans", "notes", "lyrics"].map((k) => [
              "share_" + k,
              permissions[k] === true,
            ]),
          ),
        },
      },
    );
  }
  async disableConnection(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new Error("Invalid connection client.");
    const rows = await this.request(
      `/rest/v1/mcp_connections?user_id=eq.${this.userId()}&client_id=eq.${id}`,
      {
        method: "PATCH",
        authenticated: true,
        headers: { Prefer: "return=representation" },
        body: { enabled: false },
      },
    );
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0].enabled !== false)
      throw new Error("Access could not be disabled. Please retry.");
  }
  async revokeGrant(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new Error("Invalid connection client.");
    return this.request(`/auth/v1/user/oauth/grants?client_id=${id}`, {
      method: "DELETE",
      authenticated: true,
    });
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
