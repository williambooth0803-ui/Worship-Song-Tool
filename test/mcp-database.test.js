import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { seedSongs } from "../public/seeds.js";
import { defaultProfile } from "../public/core.js";
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  client = "20000000-0000-4000-8000-000000000001";
test("real PostgreSQL: native accounts retain writes; OAuth is isolated, projected, revocable, and rate limited", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$; create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid(),auth.jwt() to authenticated,anon; insert into auth.users values('${owner}'),('${other}');`,
    );
    await db.exec(await readFile("supabase/schema.sql", "utf8"));
    const migration = await readFile("supabase/mcp.sql", "utf8");
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(await readFile("supabase/schema.sql", "utf8"));
    const song = structuredClone(seedSongs[0]);
    song.review = {
      ...song.review,
      status: "ai",
      summary: "SECRET AI summary",
      notes: "SECRET personal note",
      assistance: { summary: "AI objective observation" },
      scores: { accuracy: 2, substance: 10, language: 10, time: null },
    };
    song.themes = ["SECRET AI theme"];
    song.catalogReview = { ...seedSongs[0].review, summary: "Human baseline" };
    song.catalogThemes = ["Grace"];
    song.metadata = { lyrics: "SECRET song words" };
    const workspace = {
      version: 1,
      songs: [song],
      libraries: [{ id: "mine", name: "My library", songIds: [song.id] }],
      plans: [
        {
          id: "plan",
          title: "Sunday",
          items: [
            {
              id: "item",
              type: "song",
              songId: song.id,
              notes: "SECRET service note",
              minutes: 4,
            },
          ],
        },
      ],
      profile: { ...defaultProfile, aiMode: "manual" },
    };
    await db.query(
      "insert into public.workspaces(user_id,workspace) values($1,$2),($3,$4)",
      [
        owner,
        workspace,
        other,
        { ...workspace, songs: [{ ...song, title: "OTHER OWNER PRIVATE" }] },
      ],
    );
    async function identity(
      user,
      oauth = false,
      iat = Math.floor(Date.now() / 1000) + 5,
    ) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims',$1,false)", [
        JSON.stringify({
          sub: user,
          role: "authenticated",
          aud: "authenticated",
          iat,
          ...(oauth ? { client_id: client } : {}),
        }),
      ]);
      await db.exec("set role authenticated");
    }
    await identity(owner);
    await db.query(
      "insert into public.mcp_connections(user_id,client_id,client_name) values($1,$2,$3)",
      [owner, client, "ChatGPT"],
    );
    assert.equal(
      (await db.query("select * from public.workspaces")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.workspaces set workspace=workspace where user_id=$1 returning user_id",
          [owner],
        )
      ).rows.length,
      1,
    );
    await identity(owner, true);
    assert.equal(
      (await db.query("select * from public.workspaces")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.workspaces set workspace=workspace returning user_id",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("insert into public.profiles(user_id,profile) values($1,$2)", [
        owner,
        {},
      ]),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query(
          "update public.mcp_connections set enabled=false returning enabled",
        )
      ).rows.length,
      0,
    );
    const snapshot = () =>
      db
        .query("select public.mcp_read_snapshot() as data")
        .then((x) => x.rows[0].data);
    let data = await snapshot();
    let encoded = JSON.stringify(data);
    assert.equal(data.ai_mode, "manual");
    assert.ok(encoded.includes("Human baseline"));
    assert.ok(!encoded.includes("SECRET"));
    assert.ok(!encoded.includes("OTHER OWNER"));
    assert.equal(data.plans[0].items[0].song_title, song.title);
    await identity(other, true);
    await assert.rejects(snapshot(), /not authorized/);
    await identity(owner);
    await db.exec(
      "update public.mcp_connections set share_libraries=false,share_plans=false,share_profile=false",
    );
    await identity(owner, true);
    data = await snapshot();
    assert.deepEqual(data.songs, []);
    assert.deepEqual(data.plans, []);
    assert.deepEqual(data.profile, {});
    await identity(owner);
    await db.exec(
      "update public.mcp_connections set share_libraries=true,share_notes=true,share_lyrics=true; update public.workspaces set workspace=jsonb_set(workspace,'{profile,aiMode}','\"full\"')",
    );
    await db.exec(
      `update public.workspaces set workspace=jsonb_set(workspace,'{profile,weights}','{"accuracy":100,"substance":0,"language":0,"time":0}')`,
    );
    await identity(owner, true);
    data = await snapshot();
    assert.deepEqual(data.profile, {});
    assert.equal(data.songs[0].account_rating, 2);
    encoded = JSON.stringify(data);
    assert.ok(encoded.includes("SECRET AI summary"));
    assert.ok(encoded.includes("SECRET personal note"));
    assert.ok(encoded.includes("SECRET song words"));
    await identity(owner);
    await db.exec("update public.mcp_connections set enabled=false");
    await identity(owner, true);
    await assert.rejects(snapshot(), /disabled/);
    await identity(owner);
    await db.exec("update public.mcp_connections set enabled=true");
    await identity(owner, true, 1);
    await assert.rejects(snapshot(), /disabled|authorized/);
    await identity(owner, true);
    await db.exec("reset role");
    await db.exec("delete from public.mcp_rate_limits");
    await db.exec("set role authenticated");
    for (let n = 0; n < 60; n++) await snapshot();
    await assert.rejects(snapshot(), /mcp_rate_limit_exceeded/);
    await db.exec("reset role; set role anon");
    await assert.rejects(snapshot(), /permission denied/);
  } finally {
    await db.close();
  }
});
