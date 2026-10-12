import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpHandler } from "../backend/mcp/handler.js";
import { readTools } from "../backend/mcp/tools.js";
import { tokenVerifier, validateSettings } from "../backend/mcp/auth.js";
import { seedSongs } from "../public/seeds.js";
import { defaultProfile } from "../public/core.js";
import { chatgptRedirect } from "../public/connection.js";
import { specificScriptures, isAiField } from "../public/song-details.js";
const user = "10000000-0000-4000-8000-000000000001",
  clientId = "20000000-0000-4000-8000-000000000001";
const config = {
  supabaseUrl: "https://example.supabase.co",
  publishableKey: "sb_publishable_test",
  resourceUrl: "https://example.supabase.co/functions/v1/faithful-mcp",
};
test("library rating filters retain account weights without profile sharing, and reject unshared fields", () => {
  const song = { ...structuredClone(seedSongs[0]), account_rating: 2 };
  const data = {
    ai_mode: "full",
    profile: {},
    permissions: {
      libraries: true,
      profile: false,
      notes: false,
      plans: false,
      lyrics: false,
    },
    songs: [song],
    libraries: [{ id: "mine", name: "Mine", songIds: [song.id] }],
    plans: [],
  };
  const search = readTools.find((tool) => tool.name === "search_my_songs");
  const run = (args) =>
    search.read(data, search.schema.parse({ library_id: "mine", ...args }));
  assert.equal(
    run({ rules: [{ field: "rating", op: "gte", value: 5 }] }).total,
    0,
  );
  assert.equal(run({}).items[0].rating, 2);
  for (const field of ["notes", "completedServices", "lyrics"])
    assert.throws(
      () => run({ rules: [{ field, op: "missing" }] }),
      /sharing is disabled/,
    );
  assert.throws(() => run({ sort: "lyrics" }), /sharing is disabled/);
});
test("connector verifies signatures, issuer, audience, expiry and OAuth identity", async () => {
  const keys = await generateKeyPair("ES256"),
    jwk = await exportJWK(keys.publicKey);
  jwk.kid = "test";
  const verify = tokenVerifier(
    validateSettings(config),
    createLocalJWKSet({ keys: [jwk] }),
  );
  const sign = (overrides = {}, key = keys.privateKey) =>
    new SignJWT({
      sub: user,
      client_id: clientId,
      role: "authenticated",
      ...overrides,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setIssuer(config.supabaseUrl + "/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
  assert.equal((await verify(await sign())).userId, user);
  for (const overrides of [
    { role: "service_role" },
    { client_id: undefined },
    { sub: "invalid" },
  ])
    await assert.rejects(verify(await sign(overrides)), /Sign in/);
  const wrongKeys = await generateKeyPair("ES256");
  await assert.rejects(verify(await sign({}, wrongKeys.privateKey)), /Sign in/);
  for (const claims of [
    { iss: "https://evil.test" },
    { aud: "other" },
    { exp: 1 },
  ]) {
    const token = await new SignJWT({
      sub: user,
      client_id: clientId,
      role: "authenticated",
      iss: config.supabaseUrl + "/auth/v1",
      aud: "authenticated",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      ...claims,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .sign(keys.privateKey);
    await assert.rejects(verify(token), /Sign in/);
  }
  assert.throws(
    () => validateSettings({ ...config, publishableKey: "sb_secret_test" }),
    /privileged/,
  );
});
test("official MCP client can initialize, list and call only six read tools with strict inputs and consent enforcement", async () => {
  const data = {
    ai_mode: "full",
    permissions: {
      profile: true,
      libraries: true,
      plans: true,
      notes: false,
      lyrics: false,
    },
    profile: defaultProfile,
    songs: [structuredClone(seedSongs[0])],
    libraries: [{ id: "mine", name: "My songs", songIds: [seedSongs[0].id] }],
    plans: [],
    updated_at: "2026-10-12T00:00:00Z",
  };
  let enabled = true;
  const reads = [];
  const handler = createMcpHandler(config, {
    verifyToken: async (token) => {
      if (token !== "valid") throw new Error("bad token");
      return {
        token,
        userId: user,
        clientId,
        issuedAt: Math.floor(Date.now() / 1000),
      };
    },
    fetcher: async (url, init) => {
      reads.push({ url, method: init.method });
      return Response.json(
        url.includes("/rpc/")
          ? data
          : [
              {
                user_id: user,
                client_id: clientId,
                enabled,
                authorized_at: "2020-01-01T00:00:00Z",
              },
            ],
      );
    },
  });
  const send = (url, init = {}) => handler(new Request(url, init));
  const missing = await send(config.resourceUrl, { method: "POST" });
  assert.equal(missing.status, 401);
  assert.match(missing.headers.get("www-authenticate"), /resource_metadata/);
  const metadata = await (
    await send(config.resourceUrl + "/.well-known/oauth-protected-resource")
  ).json();
  assert.equal(metadata.resource, config.resourceUrl);
  assert.equal((await send(config.resourceUrl, { method: "PUT" })).status, 405);
  assert.equal(
    (
      await send(config.resourceUrl, {
        method: "POST",
        headers: { origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  const client = new Client({ name: "test-reader", version: "1" });
  const transport = new StreamableHTTPClientTransport(
    new URL(config.resourceUrl),
    {
      requestInit: { headers: { Authorization: "Bearer valid" } },
      fetch: send,
    },
  );
  try {
    await client.connect(transport);
    const list = await client.listTools();
    assert.equal(list.tools.length, 6);
    assert.ok(
      list.tools.every(
        (t) => t.annotations.readOnlyHint && !t.annotations.destructiveHint,
      ),
    );
    const result = await client.callTool({
      name: "list_my_libraries",
      arguments: {},
    });
    assert.equal(result.structuredContent.items[0].name, "My songs");
    assert.equal(result.structuredContent.read_only, true);
    const song = await client.callTool({
      name: "get_my_song",
      arguments: { song_id: seedSongs[0].id },
    });
    assert.equal(song.structuredContent.song.notes_shared, false);
    assert.ok(!JSON.stringify(song).includes("personal_notes"));
    assert.equal(
      (
        await client.callTool({
          name: "get_my_song",
          arguments: { song_id: "other-owner" },
        })
      ).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: "get_my_song",
          arguments: { song_id: seedSongs[0].id, include_text: true },
        })
      ).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: "list_my_libraries",
          arguments: { limit: 999 },
        })
      ).isError,
      true,
    );
    assert.equal(
      (
        await client.callTool({
          name: "list_my_libraries",
          arguments: { user_id: "arbitrary" },
        })
      ).isError,
      true,
    );
    assert.equal(
      (await client.callTool({ name: "write_plan", arguments: {} })).isError,
      true,
    );
    data.permissions.libraries = false;
    assert.equal(
      (await client.callTool({ name: "list_my_libraries", arguments: {} }))
        .isError,
      true,
    );
    enabled = false;
    await assert.rejects(client.listTools(), /403|disabled/);
    assert.ok(
      reads.every(
        (r) => r.method === "GET" || r.url.endsWith("/rpc/mcp_read_snapshot"),
      ),
    );
  } finally {
    await client.close();
  }
});
test("consent redirects reject attacker URLs and lyric references omit vague topical links", () => {
  assert.equal(
    chatgptRedirect(
      "https://chatgpt.com/connector/oauth/callback?code=x",
      "https://chatgpt.com/connector/oauth/callback",
    ),
    "https://chatgpt.com/connector/oauth/callback?code=x",
  );
  for (const url of [
    "https://chatgpt.com.evil.test/callback",
    "http://chatgpt.com/callback",
    "https://me:secret@chatgpt.com/callback",
  ])
    assert.throws(() => chatgptRedirect(url));
  assert.throws(() =>
    chatgptRedirect(
      "https://chatgpt.com/other",
      "https://chatgpt.com/callback",
    ),
  );
  assert.deepEqual(
    specificScriptures([
      "Psalm 46 — thematic foundation",
      "John 19:30 — allusion: it is finished",
      "James 1:17 — thematic connection: gifts",
    ]),
    ["John 19:30 — allusion: it is finished"],
  );
  const song = { metadata: { themes: ["Human theme"] } };
  assert.equal(isAiField(song, { status: "ai" }, "themes"), false);
  assert.equal(isAiField(song, { status: "ai" }, "summary"), true);
  assert.equal(
    isAiField(song, { status: "manual", aiFields: ["summary"] }, "summary"),
    true,
  );
});
