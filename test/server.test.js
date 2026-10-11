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
  assert.match(await page.text(), /Hymn & Heart/);
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
  assert.equal((await fetch(base + "/server.js")).status, 404);
  assert.equal((await fetch(base + "/app.js")).status, 200);
});
