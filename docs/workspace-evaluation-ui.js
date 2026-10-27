import {evaluationDialog,renderEvaluationReport} from './evaluation-report-ui.js';
import {
  evaluationCriteria,
  evaluationSnapshot,
  evaluationToken,
  workspaceEvaluationPrompt,
  parseWorkspaceEvaluation,
} from "./workspace-evaluation.js";

const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function openWorkspaceEvaluation({
  workspace,
  initialPlanId,
  initialLibraryId,
  modal,
  dialog,
  stillCurrent,
  getWorkspace = () => workspace,
  download,
  onSave,
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
  evaluationDialog({modal,dialog,title:isPlan ? "Evaluate plan" : initialLibraryId ? "Evaluate library" : "Evaluate content",html:
    `<p>Reflect on existing content and the criteria you choose. People decide what belongs in worship. This report offers evidence, strengths, gaps and uncertainties; it cannot change your plan.</p><div class="evaluation-choices"><fieldset><legend>Include plans</legend>${chooser(workspace.plans, "plan", initialPlanId)}</fieldset><fieldset><legend>Include libraries</legend>${chooser(workspace.libraries, "library", initialLibraryId)}</fieldset></div><p class="muted">Choose any combination from this workspace. Mixed reports compare the plan's existing coverage with the combined library content, without suggesting songs to add.</p><fieldset class="evaluation-criteria"><legend>Evaluation criteria · words first</legend>${evaluationCriteria.filter(c=>!["tempo","participation"].includes(c.id)).map((c) => `<label class="check-label"><input type="checkbox" data-evaluation-criterion="${e(c.id)}" checked>${e(c.label)}</label>`).join("")}</fieldset><label class="check-label evaluation-score-options"><input id="scope-assessments" type="checkbox" checked>Include three 0–10 assessments</label><p class="muted">Scripture relevance uses the recorded passage; theology considers soundness and gospel coverage; flow considers the plan’s logical sequence. Each score includes a short reason. Library flow is not applicable.</p><details class="evaluation-musical-checks"><summary>Optional musical checks</summary>${evaluationCriteria.filter(c=>["tempo","participation"].includes(c.id)).map(c=>`<label class="check-label"><input type="checkbox" data-evaluation-criterion="${e(c.id)}">${e(c.label)}</label>`).join('')}</details><p class="muted">Tempo/timing and musical participation checks are optional. Unselected musical details stay out of the request.</p><label>Your own evaluation questions<textarea id="scope-custom" rows="2" maxlength="3006" placeholder="Optional: one question per line, up to six; 500 characters each."></textarea></label><label>Purpose and desired balance<textarea id="scope-purpose" rows="3" maxlength="2000" placeholder="Describe your goals. There is no assumed ideal balance or overall worship score."></textarea></label><label class="check-label"><input id="scope-words" type="checkbox">Include stored song words I have permission to share</label><p class="muted">Requests use concise, sourced section summaries. Including permitted stored words can avoid lyric searches.</p><p class="muted">The request focuses on words and shares selected plan names, themes, Scripture references, order and item titles, plus selected library names and song identities. Tempo, timing, key and range are included only when their optional musical criteria are selected. Private notes, files, song evaluations, unselected plans/libraries and account settings are excluded. No Approval song details are withheld. Nothing is sent automatically.</p><button class="button primary" id="prepare-scope-evaluation">Prepare ChatGPT request</button><details id="scope-request-section" hidden><summary>Review the selected snapshot and request</summary><label>Evaluation request<textarea id="scope-request" readonly rows="8"></textarea></label></details><div class="form-actions"><button class="button" id="copy-scope-evaluation" disabled>Copy evaluation request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div><label>ChatGPT evaluation JSON<textarea id="audit-json" rows="5" maxlength="2500000" placeholder="Paste the JSON response, then preview the report."></textarea></label><p id="scope-error" role="alert"></p><p id="scope-status" role="status">Prepare a request before previewing the report.</p><button class="button primary" id="preview-scope-evaluation" disabled>Preview evaluation report</button><section id="scope-preview" tabindex="-1" aria-label="Plan and library evaluation report"></section>`,
  });
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
    includeAssessments:q("#scope-assessments").checked,
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
    "[data-evaluation-scope],[data-evaluation-criterion],#scope-words,#scope-assessments",
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
      const snapshot=prepared.snapshot,report=parseWorkspaceEvaluation(q("#audit-json").value,snapshot,prepared.requestId);
      renderEvaluationReport({container:preview,report,snapshot,download,assertCurrent:current,onSave,
        preferredScope:snapshot.scopes.some(s=>s.type==="plan")&&snapshot.scopes.filter(s=>s.type==="plan").length>1?"plan-combined":snapshot.scopes.filter(s=>s.type==="library").length>1&&!isPlan?"library-union":undefined});
      error.textContent="";status.textContent="Report ready below.";
      preview.focus({preventScroll:true});preview.scrollIntoView({block:"start",behavior:"instant"});
    }catch(err){error.textContent=err.message;}
  };
}
