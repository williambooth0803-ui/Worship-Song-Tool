import test from "node:test";
import assert from "node:assert/strict";
import { waitForOAuthDiscovery } from "../scripts/oauth-discovery.mjs";

const base = "https://example.supabase.co";
const metadata = {
  issuer: base + "/auth/v1",
  authorization_endpoint: base + "/auth/v1/oauth/authorize",
  token_endpoint: base + "/auth/v1/oauth/token",
  registration_endpoint: base + "/auth/v1/oauth/clients/register",
  code_challenge_methods_supported: ["S256"],
};

test("deployment tolerates delayed discovery and transient public request failures", async () => {
  let calls = 0;
  let waits = 0;
  const result = await waitForOAuthDiscovery(base, {
    fetchImpl: async (url, options) => {
      assert.equal(url, base + "/.well-known/oauth-authorization-server/auth/v1");
      assert.equal(options.method, undefined);
      assert.equal(options.headers.Authorization, undefined);
      calls++;
      if (calls === 1) return new Response("", { status: 404 });
      if (calls === 2) throw new Error("Temporary connection failure");
      if (calls === 3) return new Response("", { status: 503 });
      return Response.json(metadata);
    },
    wait: async () => { waits++; },
  });
  assert.deepEqual(result, metadata);
  assert.equal(calls, 4);
  assert.equal(waits, 3);
});

test("deployment stops after bounded discovery retries", async () => {
  let calls = 0;
  let waits = 0;
  await assert.rejects(waitForOAuthDiscovery(base, {
    fetchImpl: async () => { calls++; return new Response("", { status: 404 }); },
    wait: async () => { waits++; },
  }), /verification window/);
  assert.equal(calls, 8);
  assert.equal(waits, 7);
});

test("deployment reports permanent discovery errors without retrying", async () => {
  await assert.rejects(waitForOAuthDiscovery(base, {
    fetchImpl: async () => new Response("", { status: 403 }),
    wait: async () => assert.fail("A permission failure must not retry"),
  }), /discovery failed \(403\)/);
});

test("deployment rejects a successful HTTP response with unsafe or invalid discovery", async () => {
  for (const response of [
    Response.json({ ...metadata, issuer: "https://other.example/auth/v1" }),
    Response.json({ ...metadata, token_endpoint: "https://other.example/token" }),
    Response.json({ ...metadata, registration_endpoint: undefined }),
    Response.json({ ...metadata, code_challenge_methods_supported: ["plain"] }),
    new Response("not JSON"),
  ]) {
    await assert.rejects(waitForOAuthDiscovery(base, {
      fetchImpl: async () => response,
      wait: async () => assert.fail("Invalid discovery must not retry"),
    }), /unexpected metadata/);
  }
});
