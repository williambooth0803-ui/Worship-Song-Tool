import { setTimeout as delay } from "node:timers/promises";

// Retry only the public readiness check, never deployment or configuration writes.
export async function waitForOAuthDiscovery(
  supabaseUrl,
  { fetchImpl = fetch, wait = delay, onRetry = () => {} } = {},
) {
  const base = new URL(supabaseUrl).origin;
  const issuer = base + "/auth/v1";
  const url = base + "/.well-known/oauth-authorization-server/auth/v1";
  const attempts = 8;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // A transient connection failure can accompany settings propagation.
    }
    if (response?.ok) {
      const document = await response.json().catch(() => null);
      if (
        document?.issuer !== issuer ||
        document.authorization_endpoint !== issuer + "/oauth/authorize" ||
        document.token_endpoint !== issuer + "/oauth/token" ||
        document.registration_endpoint !== issuer + "/oauth/clients/register" ||
        !document.code_challenge_methods_supported?.includes("S256")
      )
        throw new Error(
          "OAuth settings saved, but discovery returned unexpected metadata. Check Supabase OAuth Server settings before connecting.",
        );
      return document;
    }
    if (
      response &&
      response.status !== 404 &&
      response.status !== 429 &&
      response.status < 500
    )
      throw new Error(
        `OAuth settings saved, but discovery failed (${response.status}). Check Supabase OAuth Server settings before connecting.`,
      );
    if (attempt < attempts) {
      onRetry(attempt);
      await wait(2000);
    }
  }
  throw new Error(
    "OAuth settings saved; discovery did not become ready within the verification window. Check Supabase OAuth Server settings before connecting.",
  );
}
