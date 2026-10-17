import {
  evaluationCriteria,
  evaluationSnapshot,
  evaluationToken,
  workspaceEvaluationPrompt,
  parseWorkspaceEvaluation,
  evaluationCharts,
} from "./workspace-evaluation.js";
import { auditLabels } from "./library-audit.js";

const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const list = (values) =>
  values.length
    ? `<ul>${values.map((v) => `<li>${e(v)}</li>`).join("")}</ul>`
    : '<p class="muted">None reported.</p>';
const coverageLabels = {
  evidenced: "Evidenced coverage",
  partial: "Partial evidence",
  noEvidence: "No supplied evidence",
  unknown: "Unknown",
  notApplicable: "No mixed comparison",
};

export function openWorkspaceEvaluation({
  workspace,
  initialPlanId,
  initialLibraryId,
  modal,
  dialog,
  stillCurrent,
  getWorkspace = () => workspace,
  download,
}) {
  const isPlan = !!initialPlanId;
  const chooser = (items, type, initial) =>
    items.length
      ? items
          .map(
            (item) =>
              `<label class="check-label"><input type="checkbox" data-evaluation-scope="${type}" value="${e(item.id)}" ${item.id === initial ? "checked" : ""}>${e(type === "plan" ? item.title : item.name)}</label>`,
          )
          .join("")
      : `<p class="muted">No ${type === "plan" ? "plans" : "libraries"} in this workspace.</p>`;
  modal(
    `<h2>${isPlan ? "Evaluate plan" : "Evaluate libraries and plans"}</h2><p>Reflect on existing content and the criteria you choose. People decide what belongs in worship. This report offers evidence, strengths, gaps and uncertainties; it cannot change your plan.</p><div class="evaluation-choices"><fieldset><legend>Include plans</legend>${chooser(workspace.plans, "plan", initialPlanId)}</fieldset><fieldset><legend>Include libraries</legend>${chooser(workspace.libraries, "library", initialLibraryId)}</fieldset></div><p class="muted">Choose any combination from this workspace. Mixed reports compare the plan's existing coverage with the combined library content, without suggesting songs to add.</p><fieldset class="evaluation-criteria"><legend>Evaluation criteria</legend>${evaluationCriteria.map((c) => `<label class="check-label"><input type="checkbox" data-evaluation-criterion="${e(c.id)}" checked>${e(c.label)}</label>`).join("")}</fieldset><label>Your own evaluation questions<textarea id="scope-custom" rows="2" maxlength="3006" placeholder="Optional: one question per line, up to six; 500 characters each."></textarea></label><label>Purpose and desired balance<textarea id="scope-purpose" rows="3" maxlength="2000" placeholder="Describe your goals. There is no assumed ideal balance or overall worship score."></textarea></label><label class="check-label"><input id="scope-words" type="checkbox">Include stored song words I have permission to share</label><p class="muted">The request includes selected plan names, themes, Scripture references, order, item titles, keys and duration estimates, plus selected library names and song metadata. Private notes, files, song evaluations, unselected plans/libraries and account settings are excluded. No Approval song details are withheld. Nothing is sent automatically.</p><button class="button primary" id="prepare-scope-evaluation">Prepare ChatGPT request</button><details id="scope-request-section" hidden><summary>Review the selected snapshot and request</summary><label>Evaluation request<textarea id="scope-request" readonly rows="8"></textarea></label></details><div class="form-actions"><button class="button" id="copy-scope-evaluation" disabled>Copy evaluation request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div><label>ChatGPT evaluation JSON<textarea id="audit-json" rows="5" maxlength="2500000" placeholder="Paste the JSON response, then preview the report."></textarea></label><p id="scope-error" role="alert"></p><p id="scope-status" role="status">Prepare a request before previewing the report.</p><button class="button primary" id="preview-scope-evaluation" disabled>Preview evaluation report</button><section id="scope-preview" tabindex="-1" aria-label="Plan and library evaluation report"></section>`,
  );
  const q = (selector) => dialog.querySelector(selector),
    preview = q("#scope-preview"),
    error = q("#scope-error"),
    status = q("#scope-status");
  let prepared = null;
  const options = () => ({
    planIds: [
      ...dialog.querySelectorAll('[data-evaluation-scope="plan"]:checked'),
    ].map((el) => el.value),
    libraryIds: [
      ...dialog.querySelectorAll('[data-evaluation-scope="library"]:checked'),
    ].map((el) => el.value),
    criteria: [
      ...dialog.querySelectorAll("[data-evaluation-criterion]:checked"),
    ].map((el) => el.dataset.evaluationCriterion),
    custom: q("#scope-custom")
      .value.split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    purpose: q("#scope-purpose").value,
    includeWords: q("#scope-words").checked,
  });
  const invalidate = () => {
    prepared = null;
    preview.innerHTML = "";
    q("#copy-scope-evaluation").disabled = true;
    q("#preview-scope-evaluation").disabled = true;
    q("#scope-request-section").hidden = true;
    q("#scope-request").value = "";
    error.textContent = "";
    status.textContent =
      "Selection or criteria changed. Prepare a fresh request.";
  };
  for (const input of dialog.querySelectorAll(
    "[data-evaluation-scope],[data-evaluation-criterion],#scope-words",
  ))
    input.onchange = invalidate;
  q("#scope-custom").oninput = invalidate;
  q("#scope-purpose").oninput = invalidate;
  const current = () => {
    if (
      !prepared ||
      !stillCurrent() ||
      prepared.token !== evaluationToken(getWorkspace(), options())
    )
      throw new Error(
        "The workspace, evidence, selection, criteria or AI mode changed. Prepare a fresh request.",
      );
  };
  q("#prepare-scope-evaluation").onclick = () => {
    invalidate();
    try {
      if (!stillCurrent())
        throw new Error(
          "This workspace or AI mode changed. Reopen the evaluation.",
        );
      const config = options(),
        requestId = crypto.randomUUID(),
        currentWorkspace = getWorkspace();
      const request = workspaceEvaluationPrompt(
        currentWorkspace,
        config,
        requestId,
      );
      prepared = {
        requestId,
        snapshot: evaluationSnapshot(currentWorkspace, config),
        token: evaluationToken(currentWorkspace, config),
      };
      q("#scope-request").value = request;
      q("#scope-request-section").hidden = false;
      q("#scope-request-section").open = true;
      q("#copy-scope-evaluation").disabled = false;
      q("#preview-scope-evaluation").disabled = false;
      status.textContent =
        "Request ready. Review what will be shared, copy it to ChatGPT, then paste the JSON report below.";
    } catch (err) {
      error.textContent = err.message;
    }
  };
  q("#copy-scope-evaluation").onclick = async () => {
    try {
      current();
      try {
        await navigator.clipboard.writeText(q("#scope-request").value);
        status.textContent =
          "Copied. Submit the request in ChatGPT to generate the report.";
      } catch {
        q("#scope-request-section").open = true;
        q("#scope-request").focus();
        q("#scope-request").select();
        status.textContent =
          "Use your browser's Copy command on the selected request.";
      }
    } catch (err) {
      error.textContent = err.message;
    }
  };
  q("#audit-json").oninput = () => {
    preview.innerHTML = "";
    status.textContent = "Response changed. Preview it again.";
  };
  q("#preview-scope-evaluation").onclick = () => {
    preview.innerHTML = "";
    try {
      current();
      const snapshot = prepared.snapshot,
        report = parseWorkspaceEvaluation(
          q("#audit-json").value,
          snapshot,
          prepared.requestId,
        ),
        charts = evaluationCharts(report, snapshot);
      const preferredType = isPlan ? "plan" : "library";
      const primaryScope =
        charts.find(
          (c) => c.id === (isPlan ? "plan-combined" : "library-union"),
        )?.id ||
        charts.find(
          (c) =>
            c.id ===
            `${preferredType}:${isPlan ? initialPlanId : initialLibraryId}`,
        )?.id ||
        charts.find((c) => c.id.startsWith(`${preferredType}:`))?.id ||
        charts[0]?.id;
      charts.sort(
        (a, b) => Number(b.id === primaryScope) - Number(a.id === primaryScope),
      );
      const chartMarkup = charts
        .map(
          (scope) =>
            `<details class="evaluation-cohort" ${scope.id === primaryScope ? "open" : ""}><summary><strong>${e(scope.name)}</strong> <span class="scope-chart-count">${scope.total} ${scope.denominator}</span></summary><p>${scope.total} ${scope.denominator}${scope.minutes !== null ? ` · ${scope.minutes} estimated minutes (all timed items)` : ""}. Unknowns are included in the total.</p>${
              scope.charts.length
                ? `<div class="audit-charts">${scope.charts
                    .map(
                      (chart) =>
                        `<section class="audit-chart"><h5>${e(chart.label)}</h5>${chart.multiple ? "<p>Trinitarian references can overlap.</p>" : ""}${Object.entries(
                          chart.counts,
                        )
                          .map(
                            ([category, count]) =>
                              `<div class="audit-bar-row"><span>${e(auditLabels[category] || category)}</span><meter min="0" max="${Math.max(1, scope.total)}" value="${count}" aria-label="${e(scope.name + ": " + chart.label + ": " + (auditLabels[category] || category))}">${count}</meter><strong>${count} (${scope.total ? Math.round((count / scope.total) * 100) : 0}%)</strong></div>`,
                          )
                          .join("")}</section>`,
                    )
                    .join("")}</div>`
                : ""
            }</details>`,
        )
        .join("");
      preview.innerHTML = `<h3>${isPlan ? "Plan evaluation report" : "Library and plan evaluation report"}</h3><p class="evaluation-boundary">Provisional AI interpretation. Verify evidence and prose. This evaluates your existing choices; people decide the plan. No ideal percentages or worship score are assumed.</p><p>${e(report.summary)}</p><details open><summary>Charts of existing content</summary><p class="muted">Counts are calculated from this response. BPM bands describe recorded tempo, not energy. Duration values are human estimates.</p>${chartMarkup}</details><h4>Strong areas</h4>${list(report.strengths)}<h4>Gaps or weak areas</h4>${list(report.weaknesses)}<h4>Limitations and missing evidence</h4>${list(report.limitations)}<h4>Selected criteria</h4>${report.criteria.map((row) => `<details class="evaluation-finding"><summary><strong>${e(snapshot.criteria.find((c) => c.id === row.id).label)}</strong>${row.coverage.status !== "notApplicable" ? ` · ${e(coverageLabels[row.coverage.status])}` : ""}</summary>${row.findings.map((f) => `<p><strong>${e(snapshot.scopes.find((s) => s.id === f.scopeId).name)}</strong> — ${e(f.observation)}</p>${f.evidenceSongIds.length ? `<details><summary>Existing records cited as evidence (${f.evidenceSongIds.length})</summary>${list(f.evidenceSongIds.map((id) => snapshot.songs.find((s) => s.id === id).title))}</details>` : ""}`).join("")}${row.coverage.status !== "notApplicable" ? `<p class="evaluation-coverage"><strong>${e(coverageLabels[row.coverage.status])}</strong> · ${e(row.coverage.explanation)}</p>` : ""}</details>`).join("")}<details><summary>Song evidence (${report.songs.length})</summary>${report.songs.map((s) => `<p><strong>${e(snapshot.songs.find((song) => song.id === s.id).title)}</strong> · ${e(s.evidence)}</p>${s.sources.map((source) => `<p><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.label)}</a></p>`).join("")}`).join("")}</details><p>Libraries, plans and personal song choices are unchanged. Download to retain this report and its selected snapshot.</p><button class="button" id="download-scope-evaluation">Download evaluation report</button><button class="button" data-action="close">Close report</button>`;
      q("#download-scope-evaluation").onclick = () => {
        try {
          current();
          download(
            "plan-library-evaluation.json",
            JSON.stringify({ ...report, snapshot, charts }, null, 2),
            "application/json",
          );
        } catch (err) {
          error.textContent = err.message;
        }
      };
      error.textContent = "";
      status.textContent =
        "Report ready below. Your workspace has not changed.";
      preview.focus({ preventScroll: true });
      preview.scrollIntoView({ block: "start", behavior: "instant" });
    } catch (err) {
      error.textContent = err.message;
    }
  };
}
