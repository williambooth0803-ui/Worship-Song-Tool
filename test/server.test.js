import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("server serves the app, reports AI availability, and fails safely without credentials", async (t) => {
  const child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: "3199",
      WORSHIP_AI_KEY: "",
      FRAME_ANCESTORS: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill());
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => {
      throw new Error("Server failed to start.");
    }),
  ]);
  const base = "http://127.0.0.1:3199";
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Faithful Repertoire/);
  assert.match(
    page.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
  assert.doesNotMatch(
    page.headers.get("content-security-policy"),
    /frame-ancestors/,
  );
  const status = await fetch(base + "/api/status").then((r) => r.json());
  assert.equal(status.aiConfigured, false);
  const analysis = await fetch(base + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test" }),
  });
  assert.equal(analysis.status, 503);
  assert.match((await analysis.json()).error, /not configured/);
  const lookup = await fetch(base + "/api/index-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ criteria: "Fixture" }),
  });
  assert.equal(lookup.status, 503);
  assert.equal((await fetch(base + "/server.js")).status, 404);
  assert.equal((await fetch(base + "/app.js")).status, 200);
});
test("manual and invalid AI modes are rejected before any provider call", async (t) => {
  const child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: "3197",
      WORSHIP_AI_KEY: "fixture-not-a-real-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill());
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => {
      throw new Error("Server failed to start");
    }),
  ]);
  for (const aiMode of ["manual", "invalid"]) {
    const response = await fetch("http://127.0.0.1:3197/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Fixture title",
        lyrics: "Fixture evidence",
        aiMode,
      }),
    });
    assert.equal(response.status, 400);
    const lookup = await fetch("http://127.0.0.1:3197/api/index-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiMode,
        criteria: "A criterion",
        songs: [{ id: "a", title: "Song" }],
      }),
    });
    assert.equal(lookup.status, 400);
  }
});
test("AI library lookup uses only supplied IDs and rejects unsupported provider evidence", async (t) => {
  const child = spawn(
    process.execPath,
    ["--import", "./test/fixtures/provider-stub.mjs", "server.js"],
    {
      env: {
        ...process.env,
        PORT: "3196",
        WORSHIP_AI_KEY: "fixture-not-a-real-key",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => {
      throw new Error("Server failed to start");
    }),
  ]);
  const query = (criteria) =>
    fetch("http://127.0.0.1:3196/api/index-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiMode: "full",
        criteria,
        songs: [
          { id: "test-song", title: "Fixture title", text: "God is faithful." },
        ],
      }),
    });
  const response = await query("faithfulness");
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.results[0].id, "test-song");
  assert.deepEqual(result.results[0].evidence, ["God is faithful."]);
  assert.equal((await query("invent evidence")).status, 502);
});
