import test from "node:test";
import assert from "node:assert/strict";
import {
  AccountClient,
  WorkspaceConflictError,
  validateAccountConfig,
} from "../public/accounts.js";
import { defaultProfile } from "../public/core.js";
import { syncCatalog } from "../public/catalog.js";

const config = {
  supabaseUrl: "https://fixture.supabase.co",
  supabasePublishableKey: "sb_publishable_fixture_only_not_a_real_key",
};
const user = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "fixture@example.com",
};
const session = {
  access_token: "fixture-access",
  refresh_token: "fixture-refresh",
  user,
};
function storage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) || null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}
const response = (value, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("persistent sessions are shared by clients and sign-out is observed without copying credentials to workspace data", async () => {
  const store=storage(),first=new AccountClient(config,{storage:store,fetcher:async()=>response(session)});
  await first.signIn("fixture@example.com","secret");
  const second=new AccountClient(config,{storage:store});assert.equal(second.user.id,user.id);
  first.setSession(null);assert.equal(second.syncStoredSession(),true);assert.equal(second.user,null);
});
test("temporary provider failures do not discard a persistent session",async()=>{
  const client=new AccountClient(config,{storage:storage(),fetcher:async()=>response({message:"Try later"},503)});
  client.setSession(session);await assert.rejects(client.restoreSession(),/Try later/);assert.equal(client.user.id,user.id);
});
test("file operations reject other owners before sending a request and send uploads as binary",async()=>{
  const calls=[],client=new AccountClient(config,{storage:storage(),fetcher:async(url,options)=>{calls.push({url,options});return response({Key:"stored"});}});
  client.setSession(session);
  await assert.rejects(client.uploadSongFile("10000000-0000-4000-8000-000000000001/song/file.pdf",new Blob(["data"])),/different account/);
  assert.equal(calls.length,0);
  const file=new Blob(["binary"],{type:"application/pdf"});await client.uploadSongFile(user.id+"/song/file.pdf",file);
  assert.equal(calls[0].options.body,file);assert.match(calls[0].options.headers.Authorization,/fixture-access/);
});
test("client build accepts only public keys and HTTPS settings", () => {
  assert.ok(validateAccountConfig(config));
  assert.equal(validateAccountConfig({}), null);
  assert.throws(() =>
    validateAccountConfig({
      ...config,
      supabasePublishableKey: "sb_secret_forbidden",
    }),
  );
  const claims = Buffer.from(JSON.stringify({ role: "service_role" })).toString(
    "base64url",
  );
  assert.throws(() =>
    validateAccountConfig({
      ...config,
      supabasePublishableKey: `header.${claims}.signature`,
    }),
  );
  assert.throws(() =>
    validateAccountConfig({
      ...config,
      supabaseUrl: "http://fixture.supabase.co",
    }),
  );
});
test("unconfigured accounts cannot simulate a successful login", async () => {
  const client = new AccountClient(
    {},
    {
      storage: storage(),
      fetcher: () => {
        throw new Error("should not request");
      },
    },
  );
  await assert.rejects(
    client.signIn("test@example.com", "test-password"),
    /not configured/,
  );
  assert.equal(client.user, null);
});
test("sign-in uses provider authentication and tokens stay outside workspace data", async () => {
  const store = storage(),
    calls = [];
  const client = new AccountClient(config, {
    storage: store,
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return response(session);
    },
  });
  await client.signIn("fixture@example.com", "fixture-password");
  assert.equal(client.user.id, user.id);
  assert.match(calls[0].url, /grant_type=password/);
  const workspace = syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "My songs", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
  assert.ok(!JSON.stringify(workspace).includes("fixture-access"));
  assert.equal(new AccountClient(config, { storage: store }).user.id, user.id);
});
test("signup requiring email confirmation does not fabricate a signed-in session", async () => {
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: async () => response({ user }),
  });
  assert.equal(
    (
      await client.signUp(
        "fixture@example.com",
        "fixture-password",
        "https://example.com",
      )
    ).signedIn,
    false,
  );
  assert.equal(client.user, null);
});
test("expired access token refreshes once before retrying an authenticated operation", async () => {
  const calls = [];
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: async (url, options) => {
      calls.push({ url, authorization: options.headers.Authorization });
      if (url.includes("grant_type=refresh_token"))
        return response({ ...session, access_token: "fixture-refreshed" });
      if (calls.length === 1) return response({ msg: "expired" }, 401);
      return response(user);
    },
  });
  client.setSession(session);
  await client.request("/auth/v1/user", { authenticated: true });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].authorization, "Bearer fixture-refreshed");
});
test("save is owner-scoped and validates cloud data before sending", async () => {
  let saved;
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: async (url, options) => {
      if (!options.body) return response([]);
      saved = JSON.parse(options.body);
      return response([{ updated_at: "2026-10-11T10:00:00.000Z" }]);
    },
  });
  client.setSession(session);
  const workspace = syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "My songs", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
  await client.saveWorkspace(workspace);
  assert.equal(saved.user_id, user.id);
  assert.deepEqual(saved.workspace.profile, workspace.profile);
  await assert.rejects(
    client.saveWorkspace({ ...workspace, version: 999 }),
    /not supported/,
  );
});
test("sign-out clears local tokens even when the remote operation fails", async () => {
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: async () => response({ msg: "unavailable" }, 503),
  });
  client.setSession(session);
  await assert.rejects(client.signOut());
  assert.equal(client.user, null);
});
test("conditional workspace updates protect newer copies and first-save collisions", async () => {
  const workspace = syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "Mine", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
  const date = "2026-10-11T10:00:00.123456+00:00",
    calls = [];
  let conflict = false;
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "GET")
        return response([{ workspace, updated_at: date }]);
      return response(
        conflict ? [] : [{ updated_at: "2026-10-11T11:00:00.000Z" }],
      );
    },
  });
  client.setSession(session);
  await client.loadWorkspace();
  await client.saveWorkspace(workspace);
  assert.equal(calls[1].options.method, "PATCH");
  const url = new URL(calls[1].url);
  assert.equal(url.searchParams.get("user_id"), `eq.${user.id}`);
  assert.equal(url.searchParams.get("updated_at"), `eq.${date}`);
  conflict = true;
  await assert.rejects(client.saveWorkspace(workspace), WorkspaceConflictError);
  const fresh = new AccountClient(config, {
    storage: storage(),
    fetcher: async (url, options) =>
      options.method === "GET"
        ? response([])
        : response({ message: "Duplicate" }, 409),
  });
  fresh.setSession(session);
  await assert.rejects(fresh.saveWorkspace(workspace), WorkspaceConflictError);
});
test("responses for a previous account cannot replace the new account version", async () => {
  let resolve;
  const client = new AccountClient(config, {
    storage: storage(),
    fetcher: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  client.setSession(session);
  const pending = client.loadWorkspace();
  client.setSession({
    ...session,
    user: { ...user, id: "00000000-0000-0000-0000-000000000002" },
  });
  resolve(response([]));
  await assert.rejects(pending, /account changed/);
  assert.equal(client.workspaceVersion, undefined);
});
