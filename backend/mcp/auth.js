import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ConnectionError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}
export function validateSettings({ supabaseUrl, publishableKey, resourceUrl }) {
  const project = new URL(supabaseUrl),
    resource = new URL(resourceUrl);
  for (const url of [project, resource])
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.search
    )
      throw new Error(
        "Connector URLs must use public HTTPS without credentials or query strings.",
      );
  if (project.pathname !== "/" || !publishableKey)
    throw new Error("Supply the Supabase project URL and public key.");
  if (String(publishableKey).startsWith("sb_secret_"))
    throw new Error(
      "The connector uses a public key and user-scoped access, not a privileged secret key.",
    );
  if (!String(publishableKey).startsWith("sb_publishable_")) {
    let claims;
    try {
      claims = decodeJwt(publishableKey);
    } catch {
      throw new Error("Use a public publishable or anon project key.");
    }
    if (claims.role !== "anon")
      throw new Error("A privileged project key is forbidden.");
  }
  return {
    supabaseUrl: project.origin,
    publishableKey,
    resourceUrl: resource.href.replace(/\/$/, ""),
    issuer: project.origin + "/auth/v1",
  };
}
export function tokenVerifier(
  settings,
  keySet = createRemoteJWKSet(
    new URL(settings.issuer + "/.well-known/jwks.json"),
    { timeoutDuration: 5000, cooldownDuration: 30000 },
  ),
) {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, keySet, {
        issuer: settings.issuer,
        audience: "authenticated",
        algorithms: ["ES256", "RS256"],
        requiredClaims: ["sub", "exp", "iat", "client_id", "role"],
        clockTolerance: 5,
      });
      if (
        payload.role !== "authenticated" ||
        !uuid.test(payload.sub) ||
        !uuid.test(payload.client_id) ||
        payload.iat > Date.now() / 1000 + 5
      )
        throw new Error("Invalid connector identity.");
      return {
        userId: payload.sub,
        clientId: payload.client_id,
        issuedAt: payload.iat,
        token,
      };
    } catch {
      throw new ConnectionError(
        "Sign in and authorize this connection in Faithful Repertoire.",
        401,
      );
    }
  };
}
export function assertGrant(connection, identity) {
  if (
    !connection ||
    connection.user_id !== identity.userId ||
    connection.client_id !== identity.clientId ||
    connection.enabled !== true
  )
    throw new ConnectionError(
      "This connection is disabled or has not been approved.",
    );
  const authorized = Date.parse(connection.authorized_at);
  if (
    !Number.isFinite(authorized) ||
    identity.issuedAt < Math.floor(authorized / 1000)
  )
    throw new ConnectionError(
      "This token predates the current authorization. Reconnect in ChatGPT.",
      401,
    );
}
export function createAccountReader(
  settings,
  identity,
  fetcher = globalThis.fetch,
) {
  const request = async (path) => {
    const response = await fetcher(settings.supabaseUrl + path, {
      method: path.includes("/rpc/") ? "POST" : "GET",
      headers: {
        apikey: settings.publishableKey,
        Authorization: `Bearer ${identity.token}`,
        "Content-Type": "application/json",
      },
      ...(path.includes("/rpc/") ? { body: "{}" } : {}),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (data?.message === "mcp_rate_limit_exceeded")
        throw new ConnectionError(
          "Too many reads. Please try again in a minute.",
          429,
        );
      if (
        data?.code === "42501" ||
        response.status === 401 ||
        response.status === 403
      )
        throw new ConnectionError(
          "Access is unavailable or has been revoked.",
          response.status === 401 ? 401 : 403,
        );
      throw new ConnectionError(
        "Account access is unavailable. Check the connector setup and retry.",
        503,
      );
    }
    return data;
  };
  return {
    async connection() {
      const rows = await request(
        `/rest/v1/mcp_connections?user_id=eq.${identity.userId}&client_id=eq.${identity.clientId}&select=user_id,client_id,enabled,authorized_at&limit=1`,
      );
      if (!Array.isArray(rows) || rows.length > 1)
        throw new ConnectionError("Invalid account connection response.", 503);
      assertGrant(rows[0], identity);
      return rows[0];
    },
    async snapshot() {
      const data = await request("/rest/v1/rpc/mcp_read_snapshot");
      if (
        !data ||
        !["manual", "limited", "full"].includes(data.ai_mode) ||
        !data.permissions ||
        !Array.isArray(data.songs) ||
        !Array.isArray(data.libraries) ||
        !Array.isArray(data.plans)
      )
        throw new ConnectionError("Invalid saved account response.", 503);
      return data;
    },
  };
}
