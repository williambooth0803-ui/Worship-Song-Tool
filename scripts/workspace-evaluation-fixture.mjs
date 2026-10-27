import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function checkWorkspaceEvaluationFlows(browser, base) {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("hymn-heart-v1")));
  const withoutHistory = w => {const copy=structuredClone(w);delete copy.evaluationHistory;return copy;};
  const prepare = async () => {
    await page.locator("#prepare-scope-evaluation").click();
    const request = await page.locator("#scope-request").inputValue();
    const response = JSON.parse(
      request.split("Response shape:\n")[1].split("\nSelected snapshot")[0],
    );
    const snapshot = JSON.parse(
      request.split(
        "Selected snapshot (reviewed by the user before copying):\n",
      )[1],
    );
    response.summary =
      "Existing content <script>unsafe()</script> with missing evidence.";
    response.strengths = ["Recorded key and estimated timing are available."];
    response.weaknesses = [
      "Insufficient text evidence to assess the stated gap.",
    ];
    response.limitations = [
      "Synthetic fixture. Verify the exact text before relying on classifications.",
    ];
    for (const song of response.songs)
      song.evidence = "Exact text is unavailable in this fixture.";
    for (const criterion of response.criteria) {
      for (const finding of criterion.findings)
        finding.observation =
          "Recorded content exists; this is an observation, not a selection.";
      criterion.coverage.explanation =
        "Coverage remains unknown until the relevant text is verified.";
    }
    return { response, snapshot, request };
  };
  try {
    await page.goto(base);
    await page
      .getByRole("heading", { name: "Discover songs", exact: true })
      .waitFor();
    await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem("hymn-heart-v1")),
        [a, b, hidden] = w.songs;
      w.profile = { ...w.profile, aiMode: "full", setupComplete: true };
      a.review.notes = "PRIVATE EVALUATION NOTE";
      a.metadata = { ...a.metadata, lyrics: "PRIVATE WORDS" };
      hidden.blacklisted = true;
      w.libraries = [
        {
          id: "fixture-first",
          name: "First library",
          songIds: [a.id, hidden.id],
        },
        { id: "fixture-second", name: "Second library", songIds: [a.id, b.id] },
        {
          id: "fixture-private",
          name: "UNSELECTED PRIVATE LIBRARY",
          songIds: [b.id],
        },
      ];
      const item = (id, song, key = "D") => ({
        id,
        type: "song",
        songId: song.id,
        title: song.title,
        role: "",
        key,
        arrangementName: "",
        minutes: 4,
        notes: "PRIVATE ITEM NOTE",
      });
      w.plans = [
        {
          id: "fixture-morning",
          title: "Morning plan",
          date: "",
          theme: "Hope",
          passage: "Psalm 46",
          status: "draft",
          items: [
            {
              id: "heading",
              type: "heading",
              title: "Gathering",
              role: "",
              key: "",
              minutes: 0,
              notes: "PRIVATE HEADING NOTE",
            },
            item("one", a),
            item("repeat", a, "C"),
            item("blacklist", hidden),
          ],
        },
        {
          id: "fixture-evening",
          title: "Evening plan",
          date: "",
          theme: "",
          passage: "",
          status: "draft",
          items: [item("other", b)],
        },
        {
          id: "fixture-private",
          title: "UNSELECTED PRIVATE PLAN",
          date: "",
          theme: "",
          passage: "",
          status: "draft",
          items: [],
        },
      ];
      localStorage.setItem("hymn-heart-v1", JSON.stringify(w));
    });
    await page.reload();
    await page.locator('.nav-item[data-view="plans"]').click();
    await page
      .getByRole("button", { name: "Evaluate plan", exact: true })
      .click();
    assert.equal(
      await page.locator('[data-evaluation-scope="plan"]:checked').count(),
      1,
    );
    await page.getByLabel("Evening plan", { exact: true }).check();
    await page.getByLabel("First library", { exact: true }).check();
    await page.getByLabel("Second library", { exact: true }).check();
    await page
      .getByLabel("Purpose and desired balance", { exact: true })
      .fill(
        "Understand whether the libraries contain evidenced lament content missing from our plans.",
      );
    await page
      .getByLabel("Your own evaluation questions", { exact: true })
      .fill("What is evidenced about confession?");
    const before = await state(),
      prepared = await prepare();
    assert.equal(prepared.snapshot.scopes.length, 4);
    assert.equal(prepared.snapshot.songs.length, 2);
    for (const privateText of [
      "PRIVATE EVALUATION NOTE",
      "PRIVATE WORDS",
      "PRIVATE ITEM NOTE",
      "PRIVATE HEADING NOTE",
      "UNSELECTED PRIVATE PLAN",
      "UNSELECTED PRIVATE LIBRARY",
      before.songs[2].title,
    ])
      assert.ok(!prepared.request.includes(privateText), privateText);
    assert.match(prepared.request, /Do not recommend, nominate or rank songs/);
    await page.locator("#audit-json").fill(JSON.stringify(prepared.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.equal(await page.locator("#scope-error").textContent(), "");
    assert.equal(await page.locator(".evaluation-cohort").count(), 6);
    assert.equal(
      await page
        .locator("#scope-preview")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    assert.equal(await page.locator("#scope-preview script").count(), 0);
    assert.equal(
      await page.locator("#scope-preview [data-action*=add]").count(),
      0,
    );
    assert.deepEqual(withoutHistory(await state()), withoutHistory(before));
    await page.screenshot({
      path: "/tmp/faithful-plan-evaluation-desktop.png",
      fullPage: true,
    });
    const downloading = page.waitForEvent("download");
    await page.locator("#download-scope-evaluation").click();
    const downloaded = await downloading;
    const report = JSON.parse(await readFile(await downloaded.path(), "utf8"));
    assert.equal(report.snapshot.scopes.length, 4);
    assert.equal(
      report.content.find((c) => c.id === "plan:fixture-morning").total,
      3,
    );
    assert.equal(report.content.find((c) => c.id === "library-union").total, 2);
    await page
      .locator("#audit-json")
      .fill(
        JSON.stringify({
          ...prepared.response,
          recommendations: [before.songs[0].id],
        }),
      );
    assert.equal(await page.locator("#scope-preview").innerHTML(), "");
    await page.locator("#preview-scope-evaluation").click();
    assert.match(
      await page.locator("#scope-error").textContent(),
      /unsupported fields/,
    );
    await page.getByLabel("Direction", { exact: true }).uncheck();
    assert.equal(
      await page.locator("#preview-scope-evaluation").isDisabled(),
      true,
    );
    assert.equal(
      await page.locator("#copy-scope-evaluation").isDisabled(),
      true,
    );
    const fresh = await prepare();
    await page.locator("#audit-json").fill(JSON.stringify(prepared.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.match(
      await page.locator("#scope-error").textContent(),
      /different request/,
    );
    await page.locator("#audit-json").fill(JSON.stringify(fresh.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.equal(await page.locator("#scope-error").textContent(), "");
    assert.deepEqual(withoutHistory(await state()), withoutHistory(before));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      await page
        .locator("#dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    );
    await page.locator("#preview-scope-evaluation").click();
    const region = await page.locator("#scope-preview > h3").boundingBox(),
      bounds = await page.locator("#dialog").boundingBox(),
      close = await page.locator(".evaluation-dialog-header").boundingBox();
    assert.ok(
      region.y >= close.y + close.height + 4 &&
        region.y + region.height < bounds.y + bounds.height,
      "Report heading is visible within the dialog below its sticky close control",
    );
    await page.screenshot({
      path: "/tmp/faithful-plan-evaluation-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Close evaluation", exact: true })
      .click();
    assert.ok(await page.locator(".plan-key").first().isVisible());
    await page.screenshot({
      path: "/tmp/faithful-plan-colors-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: "/tmp/faithful-plan-colors-desktop.png",
      fullPage: true,
    });
    await page.locator('.nav-item[data-view="library"]').click();
    await page
      .getByRole("button", { name: "Run Library Audit", exact: true })
      .click();
    assert.equal(
      await page.locator('[data-evaluation-scope="library"]:checked').count(),
      1,
    );
    assert.equal(
      await page.locator('[data-evaluation-scope="plan"]:checked').count(),
      0,
    );
    await page.getByLabel("Second library", { exact: true }).check();
    const libraries = await prepare();
    assert.equal(
      libraries.response.criteria[0].coverage.status,
      "notApplicable",
    );
    await page.locator("#audit-json").fill(JSON.stringify(libraries.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.equal(await page.locator("#scope-error").textContent(), "");
    assert.equal(await page.locator(".evaluation-cohort").count(), 3);
    assert.deepEqual(withoutHistory(await state()), withoutHistory(before));
    // Exercise live-state guards independently of saved data using the real dialog module.
    await page.evaluate(async () => {
      const { openWorkspaceEvaluation } = await import(
        new URL("workspace-evaluation-ui.js", location.href)
      );
      const w = JSON.parse(localStorage.getItem("hymn-heart-v1")),
        dialog = document.querySelector("#dialog");
      window.evaluationFixture = { workspace: w, current: true };
      openWorkspaceEvaluation({
        workspace: w,
        initialPlanId: w.plans[0].id,
        dialog,
        modal: (html) => {
          dialog.innerHTML = html;
          dialog.scrollTop = 0;
        },
        stillCurrent: () =>
          window.evaluationFixture.current &&
          window.evaluationFixture.workspace.profile.aiMode === "full",
        getWorkspace: () => window.evaluationFixture.workspace,
        download: () => {
          throw new Error("Stale reports must not download.");
        },
      });
    });
    let guard = await prepare();
    await page.evaluate(() => {
      window.evaluationFixture.workspace.plans[0].theme = "Changed text context";
    });
    await page.locator("#audit-json").fill(JSON.stringify(guard.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.match(await page.locator("#scope-error").textContent(), /changed/);
    assert.equal(await page.locator("#scope-preview").innerHTML(), "");
    guard = await prepare();
    await page.evaluate(() => {
      window.evaluationFixture.workspace.profile.aiMode = "manual";
    });
    await page.locator("#audit-json").fill(JSON.stringify(guard.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.match(await page.locator("#scope-error").textContent(), /changed/);
    await page.evaluate(() => {
      window.evaluationFixture.workspace.profile.aiMode = "full";
    });
    guard = await prepare();
    await page.evaluate(() => {
      window.evaluationFixture.current = false;
    });
    await page.locator("#audit-json").fill(JSON.stringify(guard.response));
    await page.locator("#preview-scope-evaluation").click();
    assert.match(await page.locator("#scope-error").textContent(), /changed/);
    assert.deepEqual(withoutHistory(await state()), withoutHistory(before));
    assert.deepEqual(errors, []);
    console.log(
      "PASS: plan evaluation, multiple plans/libraries and mixed scopes, selected/custom criteria, distinct library union and repeated plan counts, private/blacklisted exclusions, no edits, wrong-request/unsupported-field rejection, downloaded snapshot, focus and mobile layout.",
    );
  } finally {
    await page.close();
  }
}
