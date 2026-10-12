import {
  detailAttributes,
  attributeOrder,
  isAiField,
  significant,
  specificScriptures,
} from "./song-details.js";
import { mcpEndpoint } from "./connection.js";
import { seedSongs } from "./seeds.js";
import {
  catalogSongs,
  allCatalogSongs,
  syncCatalog,
  discoverSongs,
  approvalLabels,
  invalidateApproval,
} from "./catalog.js";
import { songTypes } from "./repertoire-data.js";
import {
  songCollections,
  depthLabels,
  collectionSongs,
  existingMatch,
  importSongs,
  songsFromCSV,
} from "./collections.js";
import {
  copyPlan,
  songUsage,
  elapsedTime,
  selectedArrangement,
  rangeSpan,
  planOutline,
} from "./planning.js";
import { textStats } from "./text-stats.js";
import { templateFromPlan, planFromTemplate } from "./plan-templates.js";
import { validateWorkspace, MAX_BACKUP_BYTES } from "./backup.js";
import {
  denominations,
  statements,
  aiModes,
  composePrinciples,
  withProfileDefaults,
  restrictAssistance,
  reviewForDisplay,
  themesForDisplay,
} from "./profile.js";
import { siteConfig } from "./config.js";
import { AccountClient, WorkspaceConflictError } from "./accounts.js";
import { workspaceSignature, saveLabel } from "./saving.js";
import {
  indexFields,
  indexedValue,
  filterIndex,
  indexCSV,
  indexEntries,
  indexText,
} from "./song-index.js";
import { criteriaEvidence, validateCriteriaResults, chatGPTCriteriaPrompt } from "./criteria.js";
import {
  defaultProfile,
  dimensions,
  overall,
  recommendation,
  searchSongs,
  planDuration,
  validateReview,
} from "./core.js";

const STORE = "hymn-heart-v1";
let activeStore = STORE;
const accounts = new AccountClient(siteConfig);
let accountReady = !accounts.session;
let wizardDraft = null;
let importDraft = null,
  collectionDepth = "essentials",
  songPage = 1,
  indexPageNumber = 1;
let typeFilter = "",
  reviewFilter = "";
const PAGE_SIZE = 24,
  INDEX_PAGE_SIZE = 50;
const disclosureState = new Map();
let accountSave = { phase: "local", signature: null, remoteAvailable: false };
let indexQuery = "",
  indexRules = [],
  indexSort = "title",
  indexDescending = false,
  indexColumn = "scriptures";
let activeIndexViewId = "";
let browseField = "words",
  browseQuery = "";
const staticEdition = document.documentElement.dataset.edition === "static";
const app = document.querySelector("#app"),
  dialog = document.querySelector("#dialog");
const clone = (value) => structuredClone(value);
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
const freshState = () => ({
  version: 1,
  songs: clone(seedSongs),
  profile: clone(defaultProfile),
  libraries: [
    { id: "personal", name: "My repertoire", songIds: [] },
    { id: "review", name: "Songs to review", songIds: [] },
  ],
  plans: [],
  indexViews: [],
  planTemplates: [],
});
let state,
  storageProblem = false;
try {
  const saved = localStorage.getItem(STORE);
  state = syncCatalog(
    saved ? validateWorkspace(JSON.parse(saved)) : freshState(),
  );
} catch {
  state = syncCatalog(freshState());
  storageProblem = true;
}
let view = "discover",
  query = "",
  selected = state.songs[0]?.id,
  libraryId = state.libraries[0]?.id,
  planId = state.plans[0]?.id,
  aiConfigured = false;
let timer;
let themeFilter = "",
  approvalFilter = "",
  sortOrder = "default";
function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove("show"), 4500);
}
function persist() {
  try {
    localStorage.setItem(activeStore, JSON.stringify(state));
    updateSaveStrip();
    return true;
  } catch {
    toast(
      "Browser storage is unavailable or full. Export a backup before leaving.",
    );
    return false;
  }
}
function commitWorkspace(next) {
  try {
    localStorage.setItem(activeStore, JSON.stringify(next));
    state = next;
    updateSaveStrip();
    return true;
  } catch {
    toast(
      "Browser storage is full or unavailable. The current workspace is preserved; export a backup before adding more data.",
    );
    return false;
  }
}
function modal(html) {
  dialog.innerHTML = `<div class="modal-top"><span class="eyebrow">FAITHFUL REPERTOIRE</span><button type="button" data-action="close" class="icon-button" aria-label="Close dialog">×</button></div>${html}`;
  dialog.showModal();
}
const list = (items) =>
  items?.length
    ? `<ul class="detail-list">${items.map((x) => `<li>${e(x)}</li>`).join("")}</ul>`
    : '<p class="muted">Not assessed yet.</p>';
const tagList = (items) =>
  (items || []).map((x) => `<span class="tag">${e(x)}</span>`).join("");
function statusLabel(review) {
  return (
    {
      starter: "Starter assessment",
      manual: "Your assessment",
      ai: "AI draft · review required",
    }[review.status] || "Awaiting assessment"
  );
}
function discoveryControls(pool) {
  const themes = [...new Set(pool.flatMap((song) => song.themes))].sort();
  return `<div class="discovery-controls"><label>Song type<select id="type-filter" aria-label="Song type"><option value="">All types</option>${Object.entries(
    songTypes,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${typeFilter === value ? "selected" : ""}>${e(label)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Assessment<select id="review-filter" aria-label="Assessment"><option value="">All assessments</option><option value="unreviewed" ${reviewFilter === "unreviewed" ? "selected" : ""}>Awaiting assessment</option><option value="assessed" ${reviewFilter === "assessed" ? "selected" : ""}>Has an assessment</option></select></label><label>Theme<select id="theme-filter" aria-label="Theme"><option value="">All themes</option>${themes.map((t) => `<option value="${e(t)}" ${t === themeFilter ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label><label>Church use<select id="approval-filter" aria-label="Church use"><option value="">All decisions</option>${Object.entries(
    approvalLabels,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === approvalFilter ? "selected" : ""}>${e(label)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Sort by<select id="sort-order" aria-label="Sort by">${[
    ["default", "Catalog order"],
    ["title", "Title A–Z"],
    ["rating", "Overall rating"],
    ["substance", "Theological substance"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === sortOrder ? "selected" : ""}>${e(label)}</option>`,
    )
    .join(
      "",
    )}</select></label>${themeFilter || approvalFilter || typeFilter || reviewFilter ? '<button class="text-button" data-action="clear-filters">Clear filters</button>' : ""}</div>`;
}
function churchDecision(song) {
  const decision = song.approval || { status: "unreviewed", notes: "" };
  return `<section class="church-decision ${e(decision.status)}"><div><span class="eyebrow">YOUR CHURCH-USE DECISION</span><strong>${e(approvalLabels[decision.status])}</strong>${decision.notes ? `<p>${e(decision.notes)}</p>` : "<p>Saving a song does not approve it for church use.</p>"}${decision.updatedAt ? `<small>Reviewed ${e(new Date(decision.updatedAt).toLocaleDateString())}</small>` : ""}</div><button class="button" data-action="approval" data-id="${e(song.id)}">Review decision</button></section>`;
}
function catalogComparison(song) {
  if (
    !song.catalogReview ||
    (state.profile.aiMode !== "full" && song.catalogReview.status === "ai")
  )
    return "";
  const base = song.catalogReview;
  if (base.status === "unreviewed")
    return '<details class="catalog-comparison"><summary>Catalog title record</summary><p class="muted">This catalog entry identifies a title and attribution or associated recording. No lyric assessment, musical measurement, source verification or church approval is implied.</p></details>';
  const displayed = reviewForDisplay(song, state.profile.aiMode);
  return `<details class="catalog-comparison"><summary>${song.review.status === "starter" ? "Catalog assessment & provenance" : "Compare with the catalog assessment"}</summary><p class="muted">${base.status === "ai" ? "Prewritten AI draft" : "Catalog assessment"} · revision ${e(song.catalogRevision)}. Verify the exact version. ${aiLabel(song, base, "summary")}</p><table><caption>Assessment scores</caption><thead><tr><th>Dimension</th><th>Catalog</th><th>Current</th></tr></thead><tbody>${Object.entries(
    dimensions,
  )
    .map(
      ([k, label]) =>
        `<tr><th scope="row">${e(label)}</th><td>${base.scores[k] ?? "—"}</td><td>${displayed.scores[k] ?? "—"}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table><p>${e(base.summary)}</p><h3>Catalog claims</h3>${list(base.claims)}<h3>Catalog concerns</h3>${list(base.concerns)}<h3>Catalog Scripture connections</h3>${list(specificScriptures(base.scriptures))}</details>`;
}
function approvalDialog(song) {
  const decision = song.approval;
  modal(
    `<h2>Review ${e(song.title)}</h2><p class="muted">This is your church’s decision, separate from the song’s score. Confirm the exact version and any concerns before approving it.</p>${reviewForDisplay(song, state.profile.aiMode).concern === "serious" ? '<p class="approval-warning">This assessment identifies a serious doctrinal concern. Explain your reasoning if you approve its use.</p>' : ""}<form id="approval-form" data-id="${e(song.id)}"><label>Church-use decision<select name="status" aria-label="Church-use decision">${Object.entries(
      approvalLabels,
    )
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === decision.status ? "selected" : ""}>${e(label)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Reasoning or conditions for use<textarea name="notes" rows="4" maxlength="6000" placeholder="For example: use verses 1–3; explain the biblical image before singing.">${e(decision.notes)}</textarea></label><label class="check-label"><input name="reviewed" type="checkbox">I have reviewed the exact version and any concerns.</label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save church-use decision</button></div></form>`,
  );
  updateApprovalRequirements(document.querySelector("#approval-form"), song);
}
function updateApprovalRequirements(form, song) {
  const value = form.elements.status.value;
  form.elements.reviewed.required = ["approved", "context"].includes(value);
  form.elements.notes.required =
    ["context", "avoid"].includes(value) ||
    (value === "approved" &&
      reviewForDisplay(song, state.profile.aiMode).concern === "serious");
}
function profilePrompt() {
  if (view === "profile") return "";
  if (!state.profile.setupComplete)
    return `<section class="onboarding-prompt"><div><span class="eyebrow">START WITH YOUR CHURCH</span><h2>Make this repertoire your own.</h2><p>Choose your denomination, a statement of faith, and how much AI content you want to see.</p></div><button class="button primary" data-action="setup-profile">Build my profile</button></section>`;
  return "";
}
function wizard(step = 1) {
  if (step === 1) wizardDraft = withProfileDefaults(state.profile);
  const draft = wizardDraft;
  let fields;
  if (step === 1)
    fields = `<h2>What tradition guides your worship?</h2><p class="muted">Start with your church’s denomination. You can define a custom profile.</p><label>Denomination<select name="denomination" aria-label="Denomination">${Object.entries(
      denominations,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${key === draft.denomination ? "selected" : ""}>${e(label)}</option>`,
      )
      .join("")}</select></label>`;
  if (step === 2) {
    const options = Object.entries(statements).filter(
      ([key, s]) =>
        s.denomination === draft.denomination ||
        s.denomination === "all" ||
        key === "custom",
    );
    fields = `<h2>Choose a doctrinal starting point.</h2><p class="muted">These are short working summaries, not the full statements. Review and customize the principles in the next step.</p><label>Statement of faith<select name="statement" aria-label="Statement of faith">${options.map(([key, s]) => `<option value="${key}" ${key === draft.statement ? "selected" : ""}>${e(s.name)}</option>`).join("")}</select></label><label>Additional or custom church convictions<textarea name="customStatement" rows="5" maxlength="6000" ${draft.statement === "custom" ? "required" : ""} placeholder="Paste a summary of your church’s convictions or add points the selected statement doesn’t cover.">${e(draft.customStatement)}</textarea></label>`;
  }
  if (step === 3)
    fields = `<h2>Choose the AI content you want to see.</h2><p class="muted">This preference is personal to your profile. Every mode supports your own reviews, libraries and worship plans. AI requests happen only after an explicit action and require a configured service.</p><div class="mode-options">${Object.entries(
      aiModes,
    )
      .map(
        ([key, mode]) =>
          `<label class="mode-option"><input type="radio" name="aiMode" value="${key}" ${key === draft.aiMode ? "checked" : ""} required><span><strong>${e(mode.title)}</strong><small>${e(mode.description)}</small></span></label>`,
      )
      .join(
        "",
      )}</div><label>Review principles · edit before saving<textarea name="principles" rows="7" maxlength="6000" required>${e(draft.principles)}</textarea></label><p class="muted">The existing catalog uses a Baptist, Reformed-friendly editorial baseline. Changing your profile does not automatically rewrite its ratings.</p>`;
  modal(
    `<div class="wizard-progress">${[1, 2, 3].map((n) => `<span class="${n <= step ? "complete" : ""}">${n}</span>`).join("")}<small>Step ${step} of 3</small></div><form id="wizard-form" data-step="${step}">${fields}<div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">${step === 3 ? "Save my profile" : "Continue"}</button></div></form>`,
  );
}
function resetSelection() {
  selected = state.songs[0]?.id;
  libraryId = state.libraries[0]?.id;
  planId = state.plans[0]?.id;
  view = "discover";
  query = themeFilter = approvalFilter = "";
  typeFilter = reviewFilter = "";
  songPage = indexPageNumber = 1;
  indexRules = [];
  indexQuery = "";
  activeIndexViewId = "";
  importDraft = null;
}
function switchWorkspace(user = null) {
  accountSave = { phase: "local", signature: null, remoteAvailable: false };
  activeStore = user ? `faithful-repertoire-user:${user.id}` : STORE;
  try {
    const saved = localStorage.getItem(activeStore);
    state = syncCatalog(
      saved ? validateWorkspace(JSON.parse(saved)) : freshState(),
    );
  } catch {
    state = syncCatalog(freshState());
    toast(
      "This saved workspace could not be loaded. Restore an exported backup to recover it.",
    );
    return false;
  }
  resetSelection();
  persist();
  render();
  return true;
}
async function saveAccountProfile() {
  if (!accounts.user) return false;
  try {
    await accounts.saveProfile(state.profile);
    return true;
  } catch {
    toast(
      "Your profile is saved in this browser. Account sync failed; retry from My account.",
    );
    return false;
  }
}
async function loadAccountProfile() {
  if (!accounts.user) return;
  const owner = accounts.user.id,
    store = activeStore;
  const profile = await accounts.loadProfile();
  if (accounts.user?.id !== owner || activeStore !== store) return;
  if (profile) {
    state.profile = withProfileDefaults(profile);
    persist();
    render();
  }
  await checkAccountCopy();
}
function saveStrip(open = document.querySelector("#account-save-strip")?.open) {
  if (!accounts.user || activeStore === STORE) return "";
  return `<details class="account-save-strip" id="account-save-strip" ${open ? "open" : ""}><summary>Account sync</summary><div class="sync-menu-content"><span role="status">${e(saveLabel(accountSave, state))}</span><div><button class="text-button" data-action="cloud-save" ${["saving", "checking", "conflict"].includes(accountSave.phase) ? "disabled" : ""}>Save to account</button>${accountSave.remoteAvailable ? '<button class="text-button" data-action="cloud-load">Review account copy</button>' : ""}</div></div></details>`;
}
function updateSaveStrip() {
  const strip = document.querySelector("#account-save-strip");
  if (strip) strip.outerHTML = saveStrip();
}
async function checkAccountCopy() {
  const owner = accounts.user?.id,
    store = activeStore;
  accountSave.phase = "checking";
  updateSaveStrip();
  try {
    const saved = await accounts.loadWorkspace();
    if (accounts.user?.id !== owner || activeStore !== store) return;
    const signature = saved
      ? workspaceSignature(syncCatalog(saved.workspace))
      : null;
    accountSave = {
      phase: "local",
      signature: signature === workspaceSignature(state) ? signature : null,
      remoteAvailable: Boolean(saved),
    };
  } catch {
    if (accounts.user?.id === owner && activeStore === store)
      accountSave.phase = "error";
  }
  updateSaveStrip();
}
function accountDialog(mode = "signin") {
  if (!accountReady)
    return modal(
      "<h2>Checking your sign-in…</h2><p>Please try again in a moment. Your browser workspace is available.</p>",
    );
  if (accounts.user)
    return modal(
      `<h2>Your account</h2><p>${e(accounts.user.email)}</p><p class="muted">This browser keeps a separate workspace for each signed-in account. Account backups include your profile, AI preference, songs, libraries and plans. Save to your account after editing to use this workspace on another device. Newer changes from another device are protected; loading requires confirmation.</p><div class="account-buttons"><button class="button" data-action="sync-profile">Sync my profile</button><button class="button" data-action="copy-browser">Copy browser workspace</button><button class="button primary" data-action="cloud-save">Save account backup</button><button class="button" data-action="cloud-load">Load account backup</button><button class="button" data-action="chatgpt-connections">ChatGPT connections</button><button class="button" data-action="signout">Sign out</button></div><p id="account-error" role="alert"></p>`,
    );
  const enabled = accounts.configured;
  modal(
    `<h2>${mode === "signup" ? "Create your account" : mode === "recover" ? "Reset your password" : "Sign in to your repertoire"}</h2><p class="muted">${enabled ? "Your account can store your profile and a backup of your workspace across browsers." : "Accounts are being prepared. The hosted authentication service is not configured yet. You can use the full browser workspace and build your profile now."}</p><form id="auth-form" data-mode="${mode}"><label>Email<input name="email" type="email" autocomplete="email" required ${enabled ? "" : "disabled"}></label>${mode !== "recover" ? `<label>Password<input name="password" type="password" minlength="10" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required ${enabled ? "" : "disabled"}></label>` : ""}<p id="account-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Continue in this browser</button><button class="button primary" ${enabled ? "" : "disabled"}>${mode === "signup" ? "Create account" : mode === "recover" ? "Send reset email" : "Sign in"}</button></div></form><div class="account-links"><button class="text-button" data-action="account" data-mode="${mode === "signup" ? "signin" : "signup"}">${mode === "signup" ? "Already have an account? Sign in" : "Create an account"}</button><button class="text-button" data-action="account" data-mode="recover">Forgot password?</button></div>`,
  );
}
function confirmCloudRestore(saved, title = "Load your account backup?") {
  const restored = syncCatalog(saved.workspace);
  const owner = accounts.user?.id,
    store = activeStore;
  modal(
    `<h2>${e(title)}</h2><p>${restored.songs.length} songs · ${restored.libraries.length} libraries · ${restored.plans.length} plans</p><p class="muted">This replaces the current account workspace in this browser. Download a backup first if you want to keep it.</p><button class="text-button" data-action="export">Download current workspace</button><p id="account-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="apply-cloud">Load this backup</button></div>`,
  );
  document.querySelector("#apply-cloud").onclick = () => {
    try {
      if (accounts.user?.id !== owner || activeStore !== store)
        throw new Error("Account changed");
      localStorage.setItem(activeStore, JSON.stringify(restored));
      state = restored;
      accountSave = {
        phase: "local",
        signature: saved.updatedAt ? workspaceSignature(state) : null,
        remoteAvailable: Boolean(saved.updatedAt),
      };
      resetSelection();
      dialog.close();
      render();
      toast("Account backup loaded, including your review profile.");
    } catch {
      document.querySelector("#account-error").textContent =
        "Browser storage is full or unavailable. Current data is preserved.";
    }
  };
}
function navigationIcon(id) {
  const paths = {
    discover: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    index: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M9 9v11M13 13h4M13 17h4"/>',
    collections: '<rect x="3" y="5" width="5" height="15" rx="1"/><rect x="9" y="3" width="5" height="17" rx="1"/><path d="m16 6 4-1 3 14-4 1z"/>',
    library: '<path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v15c-3-1-5-1-8 1-3-2-5-2-8-1zM12 6v15"/>',
    plans: '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M8 3v3M16 3v3M4 9h16m-12 6 2 2 5-5"/>',
    profile: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]}</svg>`;
}
function render() {
  for (const node of app.querySelectorAll("details[data-disclosure]"))
    disclosureState.set(node.dataset.disclosure, node.open);
  const count = new Set(state.libraries.flatMap((x) => x.songIds)).size;
  app.innerHTML = `<aside class="sidebar"><a class="brand" aria-label="Faithful Repertoire" href="#" data-action="nav" data-view="discover"><span class="brand-mark">✣</span><span class="brand-name">Faithful<br>Repertoire</span></a><nav aria-label="Main navigation">${[
    ["discover", "", "Discover songs"],
    ["index", "", "Song index"],
    ["collections", "", "Collections"],
    ["library", "", "Song libraries"],
    ["plans", "", "Worship plans"],
    ["profile", "", "Rating profile"],
  ]
    .map(
      ([id, icon, text]) =>
        `<button aria-label="${e(text)}" data-action="nav" data-view="${id}" class="nav-item ${view === id ? "active" : ""}" ${view === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${navigationIcon(id)}</span><span class="nav-label">${text}</span>${id === "library" ? `<b>${count}</b>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><button class="text-button" data-action="export">↓ Export your data</button></div></aside><main><header class="topbar"><span>Faithful Repertoire <span class="divider">/</span> ${e({ discover: "Discover", index: "Song index", collections: "Collections", library: "Libraries", plans: "Planning", profile: "Preferences" }[view])}</span><div class="topbar-actions">${saveStrip()}<button class="button" data-action="account">${accounts.user && activeStore !== STORE ? "My account" : "Sign in"}</button><details class="more-menu"><summary>More</summary><div class="menu-items"><button class="text-button" data-action="backup">Backup & restore</button><button class="text-button" data-action="setup-profile">Edit profile</button><button class="text-button" data-action="toggle-ai-labels">AI Labels ${state.profile.aiLabels ? "On" : "Off"}</button></div></details></div></header><div class="page">${profilePrompt()}${view === "discover" || view === "library" ? songWorkspace() : view === "index" ? indexPage() : view === "collections" ? collectionsPage() : view === "plans" ? plansPage() : profilePage()}</div><footer>Faithful Repertoire</footer></main>`;
  for (const node of app.querySelectorAll("details")) {
    const key = node.closest(".detail-panel")
      ? "song:" + selected + ":" + (node.dataset.attribute || node.className)
      : node.closest(".topbar")
        ? "header:" + node.className
        : view + ":" + node.className;
    node.dataset.disclosure = key;
    if (disclosureState.has(key)) node.open = disclosureState.get(key);
  }
}
function songWorkspace() {
  const isLibrary = view === "library";
  const lib =
    state.libraries.find((x) => x.id === libraryId) || state.libraries[0];
  const pool = (
    isLibrary
      ? state.songs.filter((s) => lib?.songIds.includes(s.id))
      : state.songs
  ).map((song) => ({
    ...song,
    themes: themesForDisplay(song, state.profile.aiMode),
  }));
  const songs = discoverSongs(
    searchSongs(pool, query).filter(
      (s) =>
        (!typeFilter || (s.category || "other") === typeFilter) &&
        (!reviewFilter ||
          (reviewFilter === "unreviewed"
            ? reviewForDisplay(s, state.profile.aiMode).status === "unreviewed"
            : reviewForDisplay(s, state.profile.aiMode).status !==
              "unreviewed")),
    ),
    { theme: themeFilter, approval: approvalFilter, sort: sortOrder },
    state.profile,
  );
  const available =
    query.trim() && !isLibrary
      ? searchSongs(
          allCatalogSongs.map((s) => ({
            ...s,
            themes: themesForDisplay(s, state.profile.aiMode),
          })),
          query,
        ).filter((song) => !existingMatch(state, song))
      : [];
  songPage = Math.max(
    1,
    Math.min(songPage, Math.ceil(songs.length / PAGE_SIZE) || 1),
  );
  const shown = songs.slice((songPage - 1) * PAGE_SIZE, songPage * PAGE_SIZE);
  const song =
    state.songs.find(
      (s) => s.id === selected && shown.some((x) => x.id === s.id),
    ) || shown[0];
  if (song) selected = song.id;
  return `<div class="page-heading"><div><h1>${isLibrary ? "Your song libraries" : "Discover songs"}</h1></div><button class="button primary" data-action="${isLibrary ? "new-library" : "new-song"}">+ ${isLibrary ? "New library" : "Add a song"}</button></div>${isLibrary ? `${libraryToolbar(lib)}<div class="library-tabs">${state.libraries.map((l) => `<button class="${l.id === lib?.id ? "selected" : ""}" data-action="library-select" data-id="${e(l.id)}">${e(l.name)} <span>${l.songIds.length}</span></button>`).join("")}</div>` : `<div class="collection-prompt"><button class="text-button" data-action="nav" data-view="collections">Browse collections</button></div>`}<div class="search-row"><label class="search-box"><span>⌕</span><input id="search" type="search" value="${e(query)}" placeholder="Search by title, writer, or theme…" aria-label="Search songs"></label><span class="result-count">${songs.length} song${songs.length === 1 ? "" : "s"}</span></div>${catalogMatches(available)}<details class="filter-panel"><summary>Filters & sorting</summary>${discoveryControls(pool)}</details><div class="song-workspace"><section class="song-list" aria-label="Song results" tabindex="0">${songs.length ? shown.map((s) => songCard(s, s.id === song.id)).join("") : `<div class="empty"><span>♫</span><h3>${query ? "No matching songs" : "A repertoire starts with one song."}</h3><p>${query ? "Try another title or add a song to review." : "Find a song in Discover and save it here."}</p><button class="button" data-action="${query ? "new-song" : "nav"}" data-view="discover">${query ? "Add a song" : "Discover songs"}</button></div>`}${pagination("song", songPage, songs.length, PAGE_SIZE)}<div class="catalog-note">${isLibrary ? "Library membership does not imply church approval." : `${state.songs.length} workspace songs · ${allCatalogSongs.length} titles available in Collections. Prewritten AI drafts; verify the exact version.`}</div></section>${song ? songDetail(song, isLibrary ? lib : null) : '<section class="detail-panel empty"><h2>Your next song belongs here.</h2><p>Save an existing song or add one to begin a review.</p></section>'}</div>`;
}
function catalogMatches(songs) {
  if (!songs.length) return "";
  return `<section class="catalog-matches"><h2>Catalog matches outside your workspace</h2><p class="muted">${songs.length} matching title${songs.length === 1 ? "" : "s"}. Open a record to review it, then choose whether to save it in a library.</p><ul>${songs
    .slice(0, 8)
    .map(
      (song) =>
        `<li><div><strong>${e(song.title)}</strong><small>${e(song.author)}</small></div><button class="button" data-action="catalog-open" data-id="${e(song.id)}">Open record</button></li>`,
    )
    .join(
      "",
    )}</ul>${songs.length > 8 ? '<p class="muted">Showing eight matches. Enter more of the title to narrow the lookup.</p>' : ""}</section>`;
}
function pagination(kind, page, count, size) {
  const pages = Math.ceil(count / size) || 1;
  if (pages === 1) return "";
  return `<div class="pagination"><span>${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count}</span><button class="button" data-action="${kind}-page" data-id="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${pages}</span><button class="button" data-action="${kind}-page" data-id="${page + 1}" ${page === pages ? "disabled" : ""}>Next</button></div>`;
}
function collectionsPage() {
  return `<div class="page-heading"><div><div class="eyebrow">CHOOSE YOUR CATALOG DEPTH</div><h1>Song collections</h1><p>Import the titles relevant to your church. Review songs and arrangements before approving their use.</p></div><button class="button" data-action="csv-import">Import your song list</button></div><div class="collection-levels"><label>Collection depth<select id="collection-depth" aria-label="Collection depth">${Object.entries(
    depthLabels,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}" ${id === collectionDepth ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><div><strong>${e(depthLabels[collectionDepth])}</strong><p>${{ essentials: "A smaller starting selection in each category.", standards: "A broader working repertoire in each category.", all: "Every title currently included in each collection." }[collectionDepth]}</p></div></div><p class="index-help">${allCatalogSongs.length} distinct catalog titles. Selections overlap; imports reuse existing songs and preserve your reviews, notes and church decisions. Depth levels are editorial selections, not popularity rankings. New title records have no invented ratings or lyrics.</p><div class="collection-list">${songCollections
    .map((pack) => {
      const songs = collectionSongs(pack, collectionDepth),
        present = songs.filter((s) => existingMatch(state, s)).length;
      return `<article class="collection-row"><div><h2>${e(pack.name)}</h2><p>${e(pack.description)}</p><small>${e(pack.source)}</small></div><div class="collection-count"><strong>${songs.length}</strong><span>titles · ${present} already in workspace</span></div><button class="button" data-action="collection-preview" data-id="${pack.id}">Preview & import</button></article>`;
    })
    .join("")}</div>${
    state.collectionImports?.length
      ? `<details class="import-history"><summary>Your collection import history</summary><ul>${state.collectionImports
          .slice()
          .reverse()
          .map(
            (item) =>
              `<li>${e(songCollections.find((p) => p.id === item.collectionId)?.name || item.collectionId)} · ${e(depthLabels[item.depth])} · ${e(new Date(item.importedAt).toLocaleDateString())} · ${item.added} new records, ${item.saved} library additions</li>`,
          )
          .join("")}</ul></details>`
      : ""
  }`;
}
function previewCollection(pack, depth = collectionDepth) {
  importDraft = {
    packId: pack.id,
    depth,
    songs: collectionSongs(pack, depth),
    target: "__new__",
    name: `${pack.name} · ${depthLabels[depth]}`,
  };
  importDialog();
}
function importDialog() {
  const draft = importDraft,
    pack = songCollections.find((p) => p.id === draft.packId);
  const present = draft.songs.filter((s) => existingMatch(state, s)).length;
  modal(
    `<h2>${pack ? e(pack.name) : "Import your song list"}</h2><p class="muted">${draft.songs.length} titles · ${draft.songs.length - present} new records · ${present} existing records preserved. Choose which titles to save.</p><form id="collection-import-form">${
      pack
        ? `<label>Depth<select name="depth" aria-label="Import depth">${Object.entries(
            depthLabels,
          )
            .map(
              ([id, label]) =>
                `<option value="${id}" ${id === draft.depth ? "selected" : ""}>${label} (${collectionSongs(pack, id).length})</option>`,
            )
            .join("")}</select></label>`
        : ""
    }<label>Save into<select name="target" aria-label="Import target"><option value="__new__" ${draft.target === "__new__" ? "selected" : ""}>A new library</option>${state.libraries.map((l) => `<option value="${e(l.id)}" ${draft.target === l.id ? "selected" : ""}>${e(l.name)}</option>`).join("")}</select></label><label>New library name<input name="name" maxlength="100" value="${e(draft.name)}" ${draft.target === "__new__" ? "required" : "disabled"}></label><div class="selection-actions"><button type="button" class="text-button" data-action="import-select-all">Select all</button><button type="button" class="text-button" data-action="import-select-none">Select none</button></div><div class="import-song-list">${draft.songs.map((s) => `<label class="import-song"><input type="checkbox" name="songs" value="${e(s.id)}" checked><span><strong>${e(s.title)}</strong><small>${e(s.author)}</small><small>${existingMatch(state, s) ? "Existing record · your review will be kept" : s.review.status === "ai" ? "AI draft rating · verify text" : "Catalog assessment"}</small></span></label>`).join("")}</div><p class="index-help">Library membership is separate from approval. No lyrics are downloaded and no AI requests are sent. CSV title-list imports do not restore ratings; use a JSON backup to transfer complete reviews.</p><p id="import-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">Import selected songs</button></div></form>`,
  );
}
function libraryToolbar(lib) {
  return `<details class="library-toolbar"><summary>Library tools</summary><div><button class="text-button" data-action="rename-library" data-id="${e(lib?.id)}">Rename</button><button class="text-button" data-action="export-library" data-id="${e(lib?.id)}">Export song list</button><button class="text-button" data-action="csv-import">Import song list</button><button class="text-button danger" data-action="delete-library" data-id="${e(lib?.id)}" ${state.libraries.length === 1 ? "disabled" : ""}>Delete library</button></div></details>`;
}
function songCard(s, active) {
  const displayedReview = reviewForDisplay(s, state.profile.aiMode);
  const score = overall(displayedReview, state.profile);
  return `<button class="song-card ${active ? "selected" : ""}" data-action="song-select" data-id="${e(s.id)}"><div class="song-card-top"><span class="song-symbol">♫</span><span class="card-score">${score ?? "—"}${aiLabel(s, displayedReview, "scores")}<small>/10</small></span></div><h3>${e(s.title)}</h3><p>${e(s.author)}</p><div class="tags">${tagList(themesForDisplay(s, state.profile.aiMode).slice(0, 2))}${aiLabel(s, displayedReview, "themes")}</div><div class="card-bottom"><span>${e(s.approval?.status !== "unreviewed" ? approvalLabels[s.approval.status] : statusLabel(displayedReview))}</span><span>›</span></div></button>`;
}
function aiLabel(song, review, field) {
  return state.profile.aiLabels && isAiField(song, review, field)
    ? '<span class="ai-mark" role="img" aria-label="AI generated" title="AI-generated content · review before use">AI</span>'
    : "";
}
function songDetail(song, lib) {
  const visible = reviewForDisplay(song, state.profile.aiMode),
    arrangement = selectedArrangement(song),
    r = arrangement
      ? { ...visible, key: arrangement.key, minutes: arrangement.minutes }
      : visible,
    score = overall(r, state.profile);
  const saved = state.libraries.some((l) => l.songIds.includes(song.id));
  const section = (key, title, body, open = false) =>
    body
      ? `<details class="detail-section attribute-panel" data-attribute="${e(key)}" ${open ? "open" : ""}><summary>${e(title)}${aiLabel(song, r, key)}</summary>${body}</details>`
      : "";
  const ratingMarkup = `<div class="rating-banner"><div class="overall-score">${score ?? "—"}${aiLabel(song, r, "scores")}<span>/10</span></div><div><strong>${e(recommendation(r, state.profile))}</strong><p>${r.status === "ai" ? "Provisional AI assessment" : score === null ? "Awaiting assessment" : "Your weighted rating"}</p></div></div><details class="rating-details"><summary>Rating breakdown</summary><div class="score-grid">${Object.entries(
    dimensions,
  )
    .filter(([key]) => r.scores[key] != null)
    .map(
      ([key, label]) =>
        `<div><div class="score-title">${e(label)}${aiLabel(song, r, "scores")}<strong>${r.scores[key]}</strong></div><meter min="0" max="10" value="${r.scores[key]}" aria-label="${e(label)}"></meter></div>`,
    )
    .join("")}</div></details>`;
  const attrs = {
    rating: ratingMarkup,
    key: section("key", "Preferred key", r.key ? `<p>${e(r.key)}</p>` : ""),
    duration: section(
      "duration",
      "Planning estimate",
      `<p>${e(r.minutes)} min</p>`,
    ),
    summary: section(
      "summary",
      "Assessment",
      significant(r.summary) ? `<p>${e(r.summary)}</p>` : "",
      true,
    ),
    claims: section(
      "claims",
      "What does it actually say?",
      r.claims?.length ? list(r.claims) : "",
    ),
    uses: section(
      "uses",
      "Good places in a service",
      r.uses?.length ? `<div class="tags">${tagList(r.uses)}</div>` : "",
    ),
    themes: section(
      "themes",
      "Themes",
      themesForDisplay(song, state.profile.aiMode).length
        ? `<div class="tags">${tagList(themesForDisplay(song, state.profile.aiMode))}</div>`
        : "",
    ),
    scriptures: section(
      "scriptures",
      "Scripture connections",
      specificScriptures(r.scriptures).length
        ? list(specificScriptures(r.scriptures))
        : "",
    ),
    language: section(
      "language",
      "Language",
      significant(r.language) ? `<p>${e(r.language)}</p>` : "",
    ),
    time: section(
      "time",
      "Meaningful time",
      significant(r.time) ? `<p>${e(r.time)}</p>` : "",
    ),
    musical: section(
      "musical",
      "Musical considerations",
      significant(r.musical) ? `<p>${e(r.musical)}</p>` : "",
    ),
    concerns: section(
      "concerns",
      "Things to consider",
      r.concerns?.length ? list(r.concerns) : "",
    ),
    arrangements: section(
      "arrangements",
      "Arrangements",
      song.arrangements?.length
        ? arrangementSection(song)
        : '<button class="text-button" data-action="new-arrangement" data-id="' +
            e(song.id) +
            '">Add arrangement</button>',
    ),
    text: section("text", "Word index", textStatsSection(song)),
    usage: section("usage", "Service history", usageSection(song)),
    notes: section(
      "notes",
      "Your notes",
      significant(r.notes) ? `<p class="notes-text">${e(r.notes)}</p>` : "",
    ),
    sources: section(
      "sources",
      "Sources & provenance",
      `<p class="muted">${r.status === "ai" ? "AI draft; check the exact song text before church use." : r.status === "starter" ? "Catalog assessment; verify the chosen edition." : "Your editable assessment."}</p>${r.sources?.length ? `<ul>${r.sources.map((x) => `<li><a href="${e(x.url)}" target="_blank" rel="noopener noreferrer">${e(x.label)}</a></li>`).join("")}</ul>` : ""}${catalogComparison(song)}`,
    ),
  };
  for (const metric of song.metadata?.custom || [])
    attrs["custom:" + metric.name] = section(
      "custom:" + metric.name,
      metric.name,
      `<p>${e(metric.value)}</p>`,
    );
  const hidden = new Set(song.detailLayout?.hidden || []);
  return `<article class="detail-panel"><div class="detail-header"><span class="status-badge">${e(statusLabel(r))}</span><button class="text-button" data-action="customize-details" data-id="${e(song.id)}">Customize details</button></div><h2>${e(song.title)}</h2><p class="author">${e(song.author)}</p><p class="version">${e(song.version)}</p><div class="detail-actions"><button class="button primary" data-action="save-song" data-id="${e(song.id)}">${saved ? "✓ Saved · manage libraries" : "+ Save to library"}</button><button class="button" data-action="add-to-plan" data-id="${e(song.id)}">Add to plan ›</button><details class="more-menu"><summary>Edit</summary><div class="menu-items"><button class="text-button" data-action="edit-review" data-id="${e(song.id)}">Edit assessment</button><button class="text-button" data-action="edit-index" data-id="${e(song.id)}">Edit index details</button>${state.profile.aiMode !== "manual" ? `<button class="text-button" data-action="ai-review" data-id="${e(song.id)}">${state.profile.aiMode === "limited" ? "Get limited assistance" : "Draft with AI"}</button>` : ""}</div></details></div>${churchDecision(song)}${attributeOrder(
    song,
  )
    .filter((k) => !hidden.has(k))
    .map((k) => attrs[k] || "")
    .join(
      "",
    )}${r.assistance ? section("assistance", "AI observations", `${state.profile.aiLabels ? '<span class="ai-mark" role="img" aria-label="AI generated">AI</span>' : ""}<p>${e(r.assistance.summary)}</p><p>${e(r.assistance.language)}</p><p>${e(r.assistance.time)}</p>`) : ""}${lib ? `<button class="text-button danger" data-action="remove-library-song" data-id="${e(song.id)}">Remove from ${e(lib.name)}</button>` : ""}</article>`;
}
function customizeDetails(song) {
  modal(
    `<h2>Customize ${e(song.title)}</h2><p class="muted">Show, hide, or reorder details for this song. Empty fields stay hidden. Add your own attributes through Edit index details.</p><form id="detail-layout-form" data-id="${e(song.id)}"><div id="attribute-rows">${attributeOrder(
      song,
    )
      .map(
        (k) =>
          `<div class="attribute-row" data-key="${e(k)}"><label class="check-label"><input type="checkbox" name="visible" value="${e(k)}" ${(song.detailLayout?.hidden || []).includes(k) ? "" : "checked"}>${e(detailAttributes[k] || k.replace(/^custom:/, ""))}</label><div><button type="button" class="icon-button" data-action="attribute-up" aria-label="Move ${e(detailAttributes[k] || k)} up">↑</button><button type="button" class="icon-button" data-action="attribute-down" aria-label="Move ${e(detailAttributes[k] || k)} down">↓</button></div></div>`,
      )
      .join(
        "",
      )}</div><div class="form-actions"><button type="button" class="button" data-action="edit-index" data-id="${e(song.id)}">Add custom attribute</button><button class="button primary">Save details</button></div></form>`,
  );
}
async function connectionsDialog() {
  const owner = accounts.user?.id;
  if (!owner) return accountDialog();
  modal("<h2>ChatGPT connections</h2><p>Loading connections…</p>");
  try {
    const rows = await accounts.listConnections();
    if (accounts.user?.id !== owner) return;
    modal(
      `<h2>ChatGPT connections</h2><p>Read your saved profile, song libraries, and existing plans in ChatGPT. Save browser changes to your account first.</p><label>Connector URL<input readonly value="${e(mcpEndpoint(siteConfig))}" aria-label="Connector URL"></label><p class="muted">In ChatGPT, open Settings → Plugins → Browse directory → Add → Add custom MCP server. Use this URL and OAuth authentication. Menus vary; interfaces using Apps may require Developer mode.</p>${rows.map((row) => `<div class="connection-row"><strong>${e(row.client_name)}</strong><p>${row.enabled ? "Connected" : "Access disabled"} · ${["profile", "libraries", "plans", "notes", "lyrics"].filter((k) => row["share_" + k]).join(", ")}</p><button class="button" data-action="revoke-connection" data-id="${e(row.client_id)}">Revoke access</button></div>`).join("") || "<p>No connections yet.</p>"}<p id="connection-error" role="alert"></p>`,
    );
  } catch {
    modal(
      "<h2>ChatGPT connections</h2><p>The connector backend has not been set up yet. Follow CHATGPT-CONNECTION.md in the repository to enable it.</p>",
    );
  }
}
function indexResults() {
  return filterIndex(
    state.songs,
    {
      query: indexQuery,
      rules: indexRules,
      sort: indexSort,
      descending: indexDescending,
    },
    state.profile,
    state.libraries,
    state.plans,
  );
}
function savedViewsMarkup() {
  const views = state.indexViews || [];
  return `<details class="saved-index-views"><summary>Saved views (${views.length})</summary><div class="saved-view-controls"><label>Saved index view<select id="saved-index-view" aria-label="Saved index view"><option value="">Choose a view</option>${views.map((v) => `<option value="${e(v.id)}" ${v.id === activeIndexViewId ? "selected" : ""}>${e(v.name)}</option>`).join("")}</select></label><button class="button" data-action="apply-index-view">Apply view</button><button class="button" data-action="save-index-view">Save current view</button><details class="more-menu"><summary>Manage views</summary><div class="menu-items"><button class="text-button" data-action="update-index-view">Update selected view</button><button class="text-button" data-action="rename-index-view">Rename selected view</button><button class="text-button danger" data-action="delete-index-view">Delete selected view</button></div></details></div></details>`;
}
function indexViewDialog(existing = null, rename = false) {
  modal(`<h2>${rename ? "Rename saved view" : existing ? "Update saved view" : "Save index view"}</h2><form id="index-view-form" data-id="${e(existing?.id || "")}" data-rename="${rename}"><label>View name<input name="name" maxlength="100" value="${e(existing?.name || "")}" required></label>${rename ? "" : '<p class="muted">Saves the current search, filters, sort order and additional column. Results update as your song records change.</p>'}<p id="view-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">Save view</button></div></form>`);
}
function templatesDialog() {
  const templates = state.planTemplates || [];
  modal(`<h2>Service templates</h2>${templates.length ? `<ul class="template-list">${templates.map((t) => `<li><div><strong>${e(t.title)}</strong><small>${t.items.length} items · ${planDuration(t.items)} min</small></div><button class="button" data-action="use-plan-template" data-id="${e(t.id)}">Use template</button><details class="more-menu"><summary>Manage</summary><div class="menu-items"><button class="text-button" data-action="rename-plan-template" data-id="${e(t.id)}">Rename template</button><button class="text-button danger" data-action="delete-plan-template" data-id="${e(t.id)}">Delete template</button></div></details></li>`).join("")}</ul>` : '<p>Open a plan, then use Plan tools → Save as template to reuse your service order.</p>'}<button class="button" data-action="close">Close templates</button>`);
}
function templateDialog(template = null, rename = false) {
  const source = template || getPlan();
  modal(`<h2>${rename ? "Rename template" : template ? "Create plan from template" : "Save service template"}</h2><form id="template-form" data-id="${e(source.id)}" data-mode="${rename ? "rename" : template ? "use" : "save"}"><label>${template && !rename ? "Service name" : "Template name"}<input name="title" maxlength="200" value="${e(source.title)}" required></label>${template && !rename ? '<label>Date<input name="date" type="date"></label><p class="muted">Creates an independent draft with the service order you saved. Check its songs and details before use.</p>' : !rename ? '<label class="check-label"><input name="keepSongs" type="checkbox" checked>Keep selected songs</label><p class="muted">Uncheck to replace songs with placeholders you fill manually. Templates keep your order, notes and timings and do not count as services.</p>' : ""}<p id="template-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">${template && !rename ? "Create draft" : "Save template"}</button></div></form>`);
}
function prepareChatGPTCriteria(form) {
  if (!form.reportValidity()) return;
  if (state.profile.aiMode !== "full") throw new Error("This search requires Full AI content.");
  if (!accounts.user || activeStore === STORE) throw new Error("Sign in and save this library to your account before searching it in ChatGPT.");
  const values = Object.fromEntries(new FormData(form));
  const library = state.libraries.find((l) => l.id === values.library);
  if (!library?.songIds.length) throw new Error("Choose a library with saved songs.");
  const prompt = chatGPTCriteriaPrompt(library, values.criteria);
  modal(`<h2>Search your library in ChatGPT</h2><p>Save your latest changes to your account, then paste this request into a ChatGPT conversation with Faithful Repertoire connected.</p><label>ChatGPT search request<textarea id="chatgpt-criteria-prompt" rows="12" readonly>${e(prompt)}</textarea></label><div class="form-actions"><button class="button" data-action="copy-criteria-prompt">Copy request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT</a><button class="button" data-action="close">Close</button></div><p class="muted">Only the library name, ID and criterion are in this request. ChatGPT reads your saved account records within your connection permissions. Results stay in ChatGPT; this does not change your reviews or plans.</p>`);
}
function indexPage() {
  const fields = indexFields(state.songs),
    songs = indexResults();
  const fieldOptions = fields
    .map((f) => `<option value="${e(f.id)}">${e(f.label)}</option>`)
    .join("");
  indexPageNumber = Math.max(
    1,
    Math.min(indexPageNumber, Math.ceil(songs.length / INDEX_PAGE_SIZE) || 1),
  );
  const shown = songs.slice(
    (indexPageNumber - 1) * INDEX_PAGE_SIZE,
    indexPageNumber * INDEX_PAGE_SIZE,
  );
  const column = fields.find((f) => f.id === indexColumn) || fields[0];
  const entries = indexEntries(
    state.songs,
    browseField,
    state.profile,
    state.libraries,
    state.plans,
  ).filter((entry) => indexText(entry.value).includes(indexText(browseQuery)));
  const display = (song, field) => {
    const value = indexedValue(
      song,
      field,
      state.profile,
      state.libraries,
      state.plans,
    );
    const aiField = ["rating", ...Object.keys(dimensions)].includes(field)
      ? "scores"
      : field === "languageNotes"
        ? "language"
        : field === "timeNotes"
          ? "time"
          : field;
    return (
      e(Array.isArray(value) ? value.join(", ") : (value ?? "—")) +
      (value != null && value !== ""
        ? aiLabel(song, reviewForDisplay(song, state.profile.aiMode), aiField)
        : "")
    );
  };
  return `<div class="page-heading"><div><h1>Song index</h1></div><div class="index-heading-actions"><button class="button" data-action="export-index">Export results (CSV)</button><button class="text-button" data-action="criteria-search">AI criteria search · optional</button></div></div>${savedViewsMarkup()}<section class="index-tools" aria-label="Index search and filters"><form id="index-search-form"><label>Search across all indexed fields<input name="query" type="search" value="${e(indexQuery)}" placeholder="A word, writer, theme, passage, or note"></label><button class="button primary">Search index</button></form><details class="index-filter-panel"><summary>Add filters</summary><form id="index-filter-form"><label>Field<select name="field" aria-label="Index field">${fieldOptions}</select></label><label>Match<select name="op" aria-label="Index match">${indexOperators("text")}</select></label><label>Value<input name="value" maxlength="1000" aria-label="Index value" list="index-values" required></label><datalist id="index-values">${indexEntries(
    state.songs,
    "title",
    state.profile,
    state.libraries,
    state.plans,
  )
    .slice(0, 200)
    .map((entry) => `<option value="${e(entry.value)}"></option>`)
    .join(
      "",
    )}</datalist><button class="button">Add filter</button></form><p class="index-help">Every added filter must match. “Whole word” searches actual words; “contains” finds a phrase or partial text. Song words search the opening line when a full text has not been entered.</p></details>${indexRules.length ? `<ul class="index-rules">${indexRules.map((r, i) => `<li><span>${e(fields.find((f) => f.id === r.field)?.label || r.field)} ${e({ contains: "contains", equals: "equals", word: "has the word", excludes: "does not contain", gte: "≥", lte: "≤", numeric: "=", missing: "is unrecorded", present: "is recorded" }[r.op])} ${["missing", "present"].includes(r.op) ? "" : e(r.value)}</span><button type="button" class="icon-button" data-action="remove-index-filter" data-id="${i}" aria-label="Remove filter ${i + 1}">×</button></li>`).join("")}</ul>` : ""}<details class="index-directory"><summary>Browse words, themes, keys, and other recorded values</summary><form id="index-browse-form"><label>Browse<select name="field" aria-label="Browse index"><option value="words">Words in song text</option>${fields.map((f) => `<option value="${e(f.id)}" ${f.id === browseField ? "selected" : ""}>${e(f.label)}</option>`).join("")}</select></label><label>Find a value<input name="value" type="search" value="${e(browseQuery)}" placeholder="Type part of a word or value"></label><button class="button">Find values</button></form><p class="index-help">Alphabetical list across your whole catalog. Counts show how many songs contain each value. ${browseField === "words" ? `${state.songs.filter((s) => s.metadata?.lyrics).length} songs have full text stored; remaining entries use opening lines.` : ""} Select a value to add it as a filter.${entries.length > 200 ? " Showing the first 200; narrow the value search to see more." : ""}</p><ul class="index-entry-list">${
    entries
      .slice(0, 200)
      .map(
        (entry) =>
          `<li><button data-action="index-entry" data-field="${e(browseField)}" data-value="${e(entry.value)}"><span>${e(entry.value)}</span><small>${entry.count}</small></button></li>`,
      )
      .join("") || "<li>No recorded values.</li>"
  }</ul></details><div class="index-toolbar"><span class="result-count" role="status">${songs.length} of ${state.songs.length} songs</span><label>Sort<select id="index-sort" aria-label="Index sort">${fields.map((f) => `<option value="${e(f.id)}" ${f.id === indexSort ? "selected" : ""}>${e(f.label)}</option>`).join("")}</select></label><label>Order<select id="index-order" aria-label="Index order"><option value="asc" ${!indexDescending ? "selected" : ""}>Ascending</option><option value="desc" ${indexDescending ? "selected" : ""}>Descending</option></select></label><label>Additional column<select id="index-column" aria-label="Additional column">${fields.map((f) => `<option value="${e(f.id)}" ${f.id === column.id ? "selected" : ""}>${e(f.label)}</option>`).join("")}</select></label><button class="text-button" data-action="reset-index">Reset index</button></div></section><div class="index-table-wrap" role="region" aria-label="Song index results" tabindex="0"><table class="index-table"><caption>Song index · ${songs.length} results</caption><thead><tr><th scope="col">Song / attribution</th><th scope="col">Themes</th><th scope="col">Key</th><th scope="col">Rating</th><th scope="col">${e(column.label)}</th><th scope="col">Details</th></tr></thead><tbody>${shown.map((song) => `<tr><th scope="row"><button class="index-title" data-action="index-open" data-id="${e(song.id)}">${e(song.title)}</button><small>${e(song.author)}</small></th><td>${display(song, "themes")}</td><td>${display(song, "key") || "—"}</td><td>${display(song, "rating")}</td><td class="index-extra">${display(song, column.id) || "—"}</td><td><button class="text-button" data-action="edit-index" data-id="${e(song.id)}" aria-label="Edit index details for ${e(song.title)}">Edit</button></td></tr>`).join("") || '<tr><td colspan="6">No songs match these filters. Remove a filter or enter more song details.</td></tr>'}</tbody></table></div>${pagination("index", indexPageNumber, songs.length, INDEX_PAGE_SIZE)}<p class="index-help">Arrangement measurements apply to your preferred arrangement. Blank values mean unrecorded, not zero. Ratings and assessment fields follow your AI visibility preference. Planning durations are editable estimates. CSV includes all indexed fields for the current results.</p>`;
}
function indexOperators(type) {
  return (
    type === "number"
      ? [
          ["gte", "At least"],
          ["lte", "At most"],
          ["numeric", "Equal to"],
        ]
      : [
          ["contains", "Contains"],
          ["equals", "Exactly matches"],
          ["word", "Whole word"],
          ["excludes", "Does not contain"],
        ]
  )
    .concat([
      ["missing", "Not recorded"],
      ["present", "Recorded"],
    ])
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join("");
}
function customMetricRow(item = { name: "", type: "text", value: "" }) {
  return `<div class="custom-metric-row"><label>Metric name<input name="metric-name" maxlength="100" value="${e(item.name)}" placeholder="Hymnal number"></label><label>Type<select name="metric-type" aria-label="Metric type"><option value="text" ${item.type === "text" ? "selected" : ""}>Text</option><option value="number" ${item.type === "number" ? "selected" : ""}>Number</option></select></label><label>Metric value<input name="metric-value" maxlength="1000" value="${e(item.value)}"></label><button type="button" class="icon-button" data-action="remove-metric" aria-label="Remove custom metric">×</button></div>`;
}
function criteriaDialog() {
  const eligible = state.profile.aiMode === "full";
  modal(
    `<h2>Search a subjective criterion</h2><p class="muted">Look for tentative matches in a library you select. You review the evidence and choose your worship songs.</p>${!eligible ? "<p>Your profile hides subjective AI content. This search requires Full AI content.</p>" : ""}<form id="criteria-form"><label>Your library<select name="library" aria-label="Your library" required>${state.libraries.map((l) => `<option value="${e(l.id)}">${e(l.name)} (${l.songIds.length} songs)</option>`).join("")}</select></label><label>Your criterion<textarea name="criteria" rows="4" maxlength="1000" required placeholder="For example: songs that express dependence on God using concrete, well-structured language."></textarea></label>${aiConfigured ? '<p class="muted">The local AI search uses supplied record excerpts for 1–100 songs. You can also take the request to your connected ChatGPT account.</p>' : '<p class="muted">Prepare a request for your connected ChatGPT account. Save your library to your account first. This uses your ChatGPT connection; the website sends no AI request.</p>'}<p id="criteria-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button>${aiConfigured ? `<button class="button" type="button" data-action="prepare-chatgpt-criteria" ${eligible ? "" : "disabled"}>Prepare ChatGPT search</button>` : ""}<button class="button primary" ${eligible ? "" : "disabled"}>${aiConfigured ? "Search with AI" : "Prepare ChatGPT search"}</button></div></form>`,
  );
}
function indexDetailsDialog(song) {
  const m = song.metadata || {};
  modal(
    `<h2>Index details</h2><p>${e(song.title)}</p><p class="muted">Enter details for your chosen text and arrangement. These are your records; no AI fills these fields.</p><form id="index-details-form" data-id="${e(song.id)}"><label>Themes, separated by commas<input name="themes" maxlength="1000" value="${e(themesForDisplay(song, state.profile.aiMode).join(", "))}"></label><div class="form-columns">${[
      ["tune", "Tune"],
      ["meter", "Poetic meter"],
      ["timeSignature", "Time signature"],
      ["range", "Vocal range"],
      ["vocalDifficulty", "Vocal difficulty"],
      ["instrumentalDifficulty", "Instrumental difficulty"],
      ["languageName", "Language"],
    ]
      .map(
        ([id, label]) =>
          `<label>${label}<input name="${id}" maxlength="300" value="${e(m[id] || "")}"></label>`,
      )
      .join(
        "",
      )}<label>Tempo (BPM)<input name="tempo" type="number" min="20" max="400" step="any" value="${m.tempo ?? ""}"></label></div><label>Instruments, separated by commas<input name="instruments" maxlength="1000" value="${e((m.instruments || []).join(", "))}"></label><label>Your tags, separated by commas<input name="tags" maxlength="1000" value="${e((m.tags || []).join(", "))}" placeholder="Congregation knows, Advent, hymnal 123"></label><details class="index-lyrics"><summary>Song words for indexing</summary><p class="muted">Enter a text you have permission to store. The app does not fetch lyrics. These words are included in your workspace backups and account saves, and are sent to AI only if you explicitly supply them in a separate analysis request.</p><label>Song words<textarea name="lyrics" aria-label="Song words" rows="8" maxlength="30000">${e(m.lyrics || "")}</textarea></label></details><h3>Custom metrics</h3><p class="muted">Use the same metric name across songs to filter or sort them together. Choose Number for numeric comparisons.</p><div id="custom-metrics">${(m.custom?.length ? m.custom : [{}]).map(customMetricRow).join("")}</div><button type="button" class="text-button" data-action="add-metric">+ Add a metric</button><p id="index-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">Save index details</button></div></form>`,
  );
}
function arrangementSection(song) {
  const chosen = selectedArrangement(song);
  return `<section class="detail-section arrangement-section"><div class="section-heading"><h3>Your arrangements</h3><button class="text-button" data-action="new-arrangement" data-id="${e(song.id)}">Add arrangement</button></div><p class="muted">Record what your congregation and musicians actually sing. Range and difficulty apply to the selected key and version.</p>${song.arrangements?.length ? `<ul class="arrangement-list">${song.arrangements.map((a) => `<li><div><strong>${e(a.name)}</strong><small>${e(a.key || "Key not set")} · ${a.minutes} min${a.id === chosen?.id ? " · Preferred" : ""}</small><p>${e(a.lowNote || "—")} to ${e(a.highNote || "—")}${rangeSpan(a) !== null ? ` · ${rangeSpan(a)} semitones` : ""}${a.largestLeap !== null ? ` · largest jump: ${a.largestLeap} semitones` : ""}</p><p>${e(a.vocalDifficulty || "Vocal difficulty unrecorded")} · ${e(a.instrumentalDifficulty || "Instrumental difficulty unrecorded")}</p>${a.wordlessSeconds !== null || a.instrumentalSeconds !== null ? `<small>Wordless vocals: ${a.wordlessSeconds ?? "—"} sec · instrumentals: ${a.instrumentalSeconds ?? "—"} sec. These may overlap.</small>` : ""}${a.notes ? `<p>${e(a.notes)}</p>` : ""}</div><div class="arrangement-actions"><button class="text-button" data-action="edit-arrangement" data-id="${e(song.id)}" data-arrangement="${e(a.id)}">Edit</button>${a.id !== chosen?.id ? `<button class="text-button" data-action="prefer-arrangement" data-id="${e(song.id)}" data-arrangement="${e(a.id)}">Set preferred</button>` : ""}<button class="text-button danger" data-action="delete-arrangement" data-id="${e(song.id)}" data-arrangement="${e(a.id)}">Delete</button></div></li>`).join("")}</ul>` : '<p class="muted">No arrangement records yet. No vocal range or difficulty is inferred from the title or lyrics.</p>'}</section>`;
}
function arrangementDialog(song, a = null) {
  modal(
    `<h2>${a ? "Edit arrangement" : "Add an arrangement"}</h2><p>${e(song.title)}</p><form id="arrangement-form" data-song="${e(song.id)}" ${a ? `data-id="${e(a.id)}"` : ""}><label>Arrangement name<input name="name" maxlength="200" value="${e(a?.name || "")}" placeholder="Acoustic setting · three verses" required></label><div class="form-columns"><label>Arrangement key<input name="key" maxlength="30" value="${e(a?.key || "")}"></label><label>Arrangement duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${a?.minutes || song.review.minutes}" required></label><label>Lowest vocal note<input name="lowNote" maxlength="10" value="${e(a?.lowNote || "")}" placeholder="C4"></label><label>Highest vocal note<input name="highNote" maxlength="10" value="${e(a?.highNote || "")}" placeholder="E5"></label>${[
      ["tempo", "Tempo (BPM)", 20, 400],
      ["largestLeap", "Largest vocal jump (semitones)", 0, 36],
      ["wordlessSeconds", "Wordless vocals (seconds)", 0, 3600],
      ["instrumentalSeconds", "Instrumentals (seconds)", 0, 3600],
    ]
      .map(
        ([id, label, min, max]) =>
          `<label>${label}<input name="${id}" type="number" min="${min}" max="${max}" step="any" value="${a?.[id] ?? ""}" placeholder="Unrecorded"></label>`,
      )
      .join(
        "",
      )}<label>Time signature<input name="timeSignature" maxlength="300" value="${e(a?.timeSignature || "")}"></label><label>Vocal difficulty<input name="vocalDifficulty" maxlength="300" value="${e(a?.vocalDifficulty || "")}" placeholder="High chorus; octave jump on final phrase"></label><label>Instrumental difficulty<input name="instrumentalDifficulty" maxlength="300" value="${e(a?.instrumentalDifficulty || "")}" placeholder="Syncopated rhythm; challenging piano introduction"></label></div><p class="index-help">Scientific pitch names use an octave number: middle C is C4; an octave is 12 semitones. Enter observations from the actual melody. Blank measurements stay unrecorded.</p><label>Instruments, separated by commas<input name="instruments" maxlength="1000" value="${e((a?.instruments || []).join(", "))}"></label><label>Arrangement notes<textarea name="notes" aria-label="Arrangement notes" maxlength="6000" rows="4">${e(a?.notes || "")}</textarea></label><label class="check-label"><input name="preferred" type="checkbox" ${!song.preferredArrangementId || song.preferredArrangementId === a?.id ? "checked" : ""}>Use as my preferred arrangement</label><p id="arrangement-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save arrangement</button></div></form>`,
  );
}
function textStatsSection(song) {
  const stats = textStats(song);
  if (stats.wordCount === null) return "";
  return `<section class="detail-section"><h3>Stored text observations</h3><dl class="text-statistics">${[
    [stats.wordCount, "Words"],
    [stats.uniqueWords, "Unique words"],
    [stats.justCount, "“Just” occurrences"],
    [stats.interiorJust, "Interior “just”"],
    [stats.ohCount, "“Oh” occurrences"],
    [stats.repeatedLines, "Repeated lines"],
  ]
    .map(([count, label]) => `<div><dt>${e(label)}</dt><dd>${count}</dd></div>`)
    .join(
      "",
    )}</dl><p class="muted">These are counts from the text you stored, calculated without AI. They do not establish poor grammar or wasted time. Read “just” and repeated lines in context; meaningful words such as “alleluia” are not treated as “oh”.</p></section>`;
}
function usageSection(song) {
  const usage = songUsage(state.plans, song.id);
  return `<section class="detail-section"><h3>Use in your services</h3><p>${usage.planned} saved plan${usage.planned === 1 ? "" : "s"} · ${usage.completed} marked completed${usage.lastUsed ? ` · Last recorded use: ${e(usage.lastUsed)}` : ""}</p><small class="muted">Only services you mark completed count as recorded use.</small></section>`;
}
function plansPage() {
  const plan = state.plans.find((p) => p.id === planId) || state.plans[0];
  if (plan) planId = plan.id;
  const newSongs = plan?.items.filter(
    (i) =>
      i.type === "song" &&
      !["approved", "context"].includes(
        state.songs.find((s) => s.id === i.songId)?.approval?.status,
      ),
  ).length;
  let elapsed = 0;
  return `<div class="page-heading"><div><h1>Service plans</h1></div><div class="index-heading-actions"><button class="button" data-action="plan-templates">Service templates</button><button class="button primary" data-action="new-plan">+ New worship plan</button></div></div>${
    !plan
      ? `<section class="empty full-empty"><h2>No service plans yet</h2><p>Create a plan or start from one of your saved templates.</p><button class="button primary" data-action="new-plan">Create a worship plan</button></section>`
      : `<div class="plan-layout"><aside class="plan-list">${state.plans.map((p) => `<button data-action="plan-select" data-id="${e(p.id)}" class="${p.id === plan.id ? "selected" : ""}"><strong>${e(p.title)}</strong><span>${e(p.date || "No date set")} · ${planDuration(p.items)} min</span></button>`).join("")}</aside><section class="plan-sheet"><div class="plan-sheet-header"><div><div class="eyebrow">${e(plan.date || "DATE TO BE CONFIRMED")}</div><h2>${e(plan.title)}</h2><p>${e(plan.theme || "")}</p>${plan.passage ? `<span class="tag">${e(plan.passage)}</span>` : ""}</div><div class="duration-total"><strong>${planDuration(plan.items)}</strong><span>minutes</span></div></div><div class="plan-toolbar"><button class="text-button" data-action="edit-plan">Edit service details</button><details class="more-menu"><summary>Plan tools</summary><div class="menu-items"><button class="text-button" data-action="copy-plan">Duplicate plan</button><button class="text-button" data-action="save-plan-template">Save as template</button><button class="text-button" data-action="print-plan">Print / Save PDF</button><button class="text-button danger" data-action="delete-plan">Delete plan</button></div></details><span class="plan-state">${e(plan.status || "draft")}</span></div>${newSongs ? `<div class="plan-notice">${newSongs} song${newSongs === 1 ? "" : "s"} ${newSongs === 1 ? "has" : "have"} not been approved for your church. Confirm suitability before use.</div>` : ""}<ol class="service-items">${plan.items
          .map((item, i) => {
            const song = state.songs.find((s) => s.id === item.songId);
            const offset = elapsedTime(elapsed);
            elapsed += item.minutes;
            return `<li><span class="item-number">${String(i + 1).padStart(2, "0")}</span><div class="service-item-content"><span class="eyebrow">${e(item.role || item.type)} · ${offset} from start</span><h3>${e(song?.title || item.title)}</h3><p>${song ? `<span class="plan-song-meta">${e(item.key || "Key not set")}${item.arrangementName ? ` · ${e(item.arrangementName)}` : ""}</span>` : ""}${e(item.notes || (song ? themesForDisplay(song, state.profile.aiMode).join(", ") : ""))}${song?.approval?.status === "context" ? `<span class="plan-conditions">Conditions: ${e(song.approval.notes)}</span>` : ""}</p></div><span class="item-time">${e(item.minutes)} min</span><div class="item-buttons"><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="-1" aria-label="Move ${e(song?.title || item.title)} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="1" aria-label="Move ${e(song?.title || item.title)} down" ${i === plan.items.length - 1 ? "disabled" : ""}>↓</button><button class="icon-button" data-action="edit-item" data-id="${e(item.id)}" aria-label="Edit ${e(song?.title || item.title)}">✎</button><button class="icon-button danger" data-action="remove-item" data-id="${e(item.id)}" aria-label="Remove ${e(song?.title || item.title)}">×</button></div></li>`;
          })
          .join(
            "",
          )}</ol>${!plan.items.length ? '<div class="empty"><h3>No service items yet</h3><p>Add songs, readings, prayer or other items.</p></div>' : ""}<div class="plan-buttons"><button class="button primary" data-action="nav" data-view="discover">+ Choose a song</button><button class="button" data-action="new-item">+ Reading, prayer, or other item</button><button class="text-button" data-action="export-plan">↓ Export plan</button></div></section></div>`
  }`;
}
function profilePage() {
  return `<div class="page-heading"><div><div class="eyebrow">YOUR CONVICTIONS, EXPLAINED</div><h1>A rating with reasons.</h1><p>Define what matters to your church. Scores should support your judgment.</p></div></div><form id="profile-form" class="profile-panel"><div class="profile-intro"><span>◎</span><div><h2>${e(denominations[state.profile.denomination])}</h2><p>${e(statements[state.profile.statement].name)}</p><button class="text-button" type="button" data-action="setup-profile">Choose denomination & statement of faith</button><p>Accuracy is the foundation. Substance, craftsmanship, and purposeful time distinguish a useful song from an exceptional one.</p></div></div><label>AI content preference<select name="aiMode" aria-label="AI content preference">${Object.entries(
    aiModes,
  )
    .map(
      ([key, mode]) =>
        `<option value="${key}" ${key === state.profile.aiMode ? "selected" : ""}>${e(mode.title)}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="muted">${e(aiModes[state.profile.aiMode].description)}</p><label>AI Labels<select name="aiLabels" aria-label="AI Labels"><option value="on" ${state.profile.aiLabels ? "selected" : ""}>On</option><option value="off" ${!state.profile.aiLabels ? "selected" : ""}>Off</option></select></label><p class="muted">A small AI badge identifies generated ratings and subjective content.</p><h3>Rating weights</h3><p class="muted">Relative weights are normalized automatically. Unassessed dimensions are excluded and clearly marked. A serious doctrinal concern always triggers review, regardless of the average.</p><div class="weight-fields">${Object.entries(
    dimensions,
  )
    .map(
      ([key, label]) =>
        `<label>${e(label)}<div class="weight-input"><input name="${key}" type="number" min="0" max="100" value="${state.profile.weights[key]}" required><span>weight</span></div></label>`,
    )
    .join(
      "",
    )}</div><label class="field-label">Theological & editorial parameters<textarea name="principles" rows="8" maxlength="6000" required>${e(state.profile.principles)}</textarea></label><p class="muted">Changing weights updates displayed ratings. Changing these parameters affects future AI drafts; existing assessments remain intact.</p><button class="button primary" type="submit">Save rating profile</button><div class="profile-note"><strong>Musical suitability stays separate.</strong><p>A text review cannot establish a melody’s range, leaps, or instrumental demands. Record those observations for a specific arrangement.</p></div></form>`;
}
function newSongDialog() {
  modal(
    `<h2>Add a song to review</h2><p class="muted">Identify the exact song and version. No rating is invented from a title.</p><form id="new-song-form"><label>Song title<input name="title" maxlength="200" value="${e(query)}" required></label><label>Writer / attribution<input name="author" maxlength="300" placeholder="Writer, hymn author, or unknown"></label><label>Opening line<input name="firstLine" maxlength="300" placeholder="Helps distinguish songs with the same title"></label><label>Version / arrangement<input name="version" maxlength="300" placeholder="Album, hymn edition, or arrangement"></label><label>Themes, separated by commas<input name="themes" maxlength="500" placeholder="Grace, repentance, resurrection"></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Add song</button></div></form>`,
  );
}
function editReviewDialog(song) {
  const r = reviewForDisplay(song, state.profile.aiMode);
  modal(
    `<h2>Edit ${e(song.title)}</h2><p class="muted">Use 0–10 scores. Leave a score blank when evidence is missing.</p><form id="review-form" data-id="${e(song.id)}"><div class="weight-fields">${Object.entries(
      dimensions,
    )
      .map(
        ([k, label]) =>
          `<label>${e(label)}<input type="number" name="score-${k}" min="0" max="10" step="0.1" value="${r.scores[k] ?? ""}" placeholder="Not assessed"></label>`,
      )
      .join("")}</div><label>Doctrinal concern<select name="concern">${[
      ["none", "No identified doctrinal concern"],
      ["context", "Context or clarification needed"],
      ["serious", "Serious concern — review required"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${r.concern === v ? "selected" : ""}>${l}</option>`,
      )
      .join("")}</select></label>${[
      ["summary", "Assessment summary", r.summary],
      ["claims", "Specific claims · one per line", r.claims.join("\n")],
      ["uses", "Good use cases · one per line", r.uses.join("\n")],
      [
        "scriptures",
        "Scripture connections · label quotation / allusion / thematic",
        r.scriptures.join("\n"),
      ],
      ["language", "Language & craftsmanship", r.language],
      ["time", "Arrangement & purposeful time", r.time],
      ["concerns", "Concerns · one per line", r.concerns.join("\n")],
      [
        "musical",
        "Musical observations · identify arrangement and evidence",
        r.musical,
      ],
      ["notes", "Your notes", r.notes],
    ]
      .map(
        ([name, label, value]) =>
          `<label>${e(label)}<textarea name="${name}" aria-label="${e(label)}" rows="3" maxlength="6000">${e(value)}</textarea></label>`,
      )
      .join(
        "",
      )}<div class="form-columns"><label>Preferred key<input name="key" maxlength="30" value="${e(r.key)}" placeholder="e.g. D"></label><label>Planning duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(r.minutes)}" required></label></div><label>Source links · one HTTPS URL per line<textarea name="sources" rows="2">${e(r.sources.map((s) => s.url).join("\n"))}</textarea></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save assessment</button></div></form>`,
  );
}
function planDialog(plan = null) {
  modal(
    `<h2>${plan ? "Edit worship plan" : "A new worship plan"}</h2><form id="plan-form" ${plan ? `data-id="${e(plan.id)}"` : ""}><label>Service name<input name="title" maxlength="200" value="${e(plan?.title || "Sunday worship")}" required></label><label>Date<input name="date" type="date" value="${e(plan?.date || "")}"></label><label>Theme<input name="theme" maxlength="500" value="${e(plan?.theme || "")}" placeholder="The faithfulness of God"></label><label>Sermon passage<input name="passage" maxlength="200" value="${e(plan?.passage || "")}" placeholder="Psalm 46"></label><label>Service status<select name="status" aria-label="Service status">${[
      ["draft", "Draft"],
      ["ready", "Ready"],
      ["completed", "Completed"],
    ]
      .map(
        ([id, label]) =>
          `<option value="${id}" ${(plan?.status || "draft") === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">${plan ? "Save changes" : "Create plan"}</button></div></form>`,
  );
}
function itemDialog(item = null) {
  const song = state.songs.find((s) => s.id === item?.songId);
  modal(
    `<h2>${item ? "Edit service item" : "Add a service item"}</h2><form id="item-form" ${item ? `data-id="${e(item.id)}"` : ""}>${song ? `<p>${e(song.title)}</p>` : `<label>Item title<input name="title" maxlength="200" value="${e(item?.title || "")}" placeholder="Scripture reading" required></label>`}<label>Place in the service<input name="role" maxlength="100" value="${e(item?.role || "")}" placeholder="Call to worship, prayer, sermon…"></label><div class="form-columns"><label>Duration (minutes)<input name="minutes" type="number" min="0.5" max="180" step="0.5" value="${e(item?.minutes || 3)}" required></label>${song ? `<label>Key<input name="key" maxlength="30" value="${e(item.key || "")}"></label>` : ""}</div><label>Notes / reading text / transitions<textarea name="notes" rows="4" maxlength="6000">${e(item?.notes || "")}</textarea></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save item</button></div></form>`,
  );
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function getPlan() {
  return state.plans.find((p) => p.id === planId);
}
function closeMenus() {
  for (const menu of document.querySelectorAll(
    ".more-menu[open],.account-save-strip[open]",
  )) {
    menu.open = false;
    disclosureState.set(menu.dataset.disclosure, false);
  }
}
window.addEventListener("resize", closeMenus);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenus();
});
document.addEventListener("click", async (event) => {
  for (const menu of document.querySelectorAll(
    ".more-menu[open],.account-save-strip[open]",
  ))
    if (!menu.contains(event.target)) menu.open = false;
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  event.preventDefault();
  const menu = button.closest(".more-menu,.account-save-strip");
  if (menu) {
    menu.open = false;
    disclosureState.set(menu.dataset.disclosure, false);
  }
  if (button.dataset.action === "toggle-ai-labels") {
    state.profile.aiLabels = !state.profile.aiLabels;
    persist();
    render();
    await saveAccountProfile();
    return;
  }
  if (button.dataset.action === "chatgpt-connections")
    return connectionsDialog();
  if (button.dataset.action === "customize-details")
    return customizeDetails(
      state.songs.find((s) => s.id === button.dataset.id),
    );
  if (["attribute-up", "attribute-down"].includes(button.dataset.action)) {
    const row = button.closest(".attribute-row"),
      other =
        button.dataset.action === "attribute-up"
          ? row.previousElementSibling
          : row.nextElementSibling;
    if (other)
      button.dataset.action === "attribute-up"
        ? other.before(row)
        : other.after(row);
    return;
  }
  if (button.dataset.action === "revoke-connection") {
    button.disabled = true;
    try {
      await accounts.disableConnection(button.dataset.id);
      try {
        await accounts.revokeGrant(button.dataset.id);
      } catch {
        document.querySelector("#connection-error").textContent =
          "Access is disabled. ChatGPT sign-in grant removal failed; retry Revoke access.";
        button.disabled = false;
        return;
      }
      await connectionsDialog();
    } catch (err) {
      document.querySelector("#connection-error").textContent = err.message;
      button.disabled = false;
    }
    return;
  }
  const action = button.dataset.action,
    id = button.dataset.id;
  const song = state.songs.find((s) => s.id === id);
  if (action === "copy-criteria-prompt") {
    const prompt = dialog.querySelector("#chatgpt-criteria-prompt");
    try { await navigator.clipboard.writeText(prompt.value); toast("Search request copied."); }
    catch { prompt.focus(); prompt.select(); toast("Select Copy from your browser menu to copy the highlighted request."); }
    return;
  }
  if (action === "prepare-chatgpt-criteria") {
    const form = dialog.querySelector("#criteria-form");
    try { prepareChatGPTCriteria(form); }
    catch (err) { form.querySelector("#criteria-error").textContent = err.message; }
    return;
  }
  if (action === "plan-templates") return templatesDialog();
  if (action === "save-plan-template") return templateDialog();
  if (["use-plan-template", "rename-plan-template", "delete-plan-template"].includes(action)) {
    const template = state.planTemplates?.find((t) => t.id === id);
    if (!template) return;
    if (action === "use-plan-template") return templateDialog(template);
    if (action === "rename-plan-template") return templateDialog(template, true);
    const store = activeStore;
    modal(`<h2>Delete ${e(template.title)}?</h2><p>Existing service plans remain intact.</p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button danger" id="confirm-template-delete">Delete template</button></div>`);
    dialog.querySelector("#confirm-template-delete").onclick = () => {
      if (store !== activeStore) return;
      const next = clone(state);
      next.planTemplates = next.planTemplates.filter((t) => t.id !== id);
      if (!commitWorkspace(validateWorkspace(next))) return;
      templatesDialog();
    };
    return;
  }
  if (action === "save-index-view") return indexViewDialog();
  if (["apply-index-view", "update-index-view", "rename-index-view", "delete-index-view"].includes(action)) {
    const chosen = document.querySelector("#saved-index-view").value;
    const saved = state.indexViews?.find((v) => v.id === chosen);
    if (!saved) return toast("Choose a saved view first.");
    if (action === "apply-index-view") {
      indexQuery = saved.query; indexRules = clone(saved.rules); indexSort = saved.sort;
      indexDescending = saved.descending; indexColumn = saved.column;
      activeIndexViewId = saved.id; indexPageNumber = 1; render(); return;
    }
    if (action === "update-index-view") return indexViewDialog(saved);
    if (action === "rename-index-view") return indexViewDialog(saved, true);
    const store = activeStore;
    modal(`<h2>Delete ${e(saved.name)}?</h2><p>Your song records stay intact.</p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button danger" id="confirm-view-delete">Delete view</button></div>`);
    dialog.querySelector("#confirm-view-delete").onclick = () => {
      if (store !== activeStore) return;
      const next = clone(state);
      next.indexViews = next.indexViews.filter((v) => v.id !== chosen);
      if (!commitWorkspace(validateWorkspace(next))) return;
      if (activeIndexViewId === chosen) activeIndexViewId = "";
      dialog.close(); render();
    };
    return;
  }
  if (action === "catalog-open") {
    const record = allCatalogSongs.find((s) => s.id === id),
      next = clone(state);
    let match = existingMatch(next, record);
    if (!match) {
      match = clone(record);
      next.songs.push(match);
    }
    if (!commitWorkspace(validateWorkspace(syncCatalog(next)))) return;
    selected = match.id;
    query = match.title;
    songPage = 1;
    themeFilter = approvalFilter = typeFilter = reviewFilter = "";
    render();
    return;
  }
  if (action === "new-arrangement") return arrangementDialog(song);
  if (action === "edit-arrangement")
    return arrangementDialog(
      song,
      song.arrangements.find((a) => a.id === button.dataset.arrangement),
    );
  if (action === "prefer-arrangement") {
    song.preferredArrangementId = button.dataset.arrangement;
    invalidateApproval(song);
    persist();
    render();
    toast(
      "Preferred arrangement changed. Review church-use approval for this version.",
    );
    return;
  }
  if (action === "delete-arrangement") {
    const aid = button.dataset.arrangement,
      a = song.arrangements.find((a) => a.id === aid),
      store = activeStore;
    modal(
      `<h2>Delete ${e(a.name)}?</h2><p>Saved service items keep their recorded key, duration and arrangement name.</p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button danger" id="confirm-arrangement-delete">Delete arrangement</button></div>`,
    );
    document.querySelector("#confirm-arrangement-delete").onclick = () => {
      if (store !== activeStore) return;
      song.arrangements = song.arrangements.filter((a) => a.id !== aid);
      if (song.preferredArrangementId === aid) {
        delete song.preferredArrangementId;
        invalidateApproval(song);
      }
      persist();
      dialog.close();
      render();
    };
    return;
  }
  if (action === "print-plan") return window.print();
  if (action === "copy-plan") {
    const plan = getPlan();
    return modal(
      `<h2>Duplicate worship plan</h2><p class="muted">Copy the service order and notes into an independent draft. Your original plan stays intact.</p><form id="copy-plan-form" data-id="${e(plan.id)}"><label>Service name<input name="title" maxlength="200" value="${e(plan.title.slice(0, 190) + " (copy)")}" required></label><label>Date<input name="date" type="date"></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Create copy</button></div></form>`,
    );
  }
  if (action === "delete-plan") {
    const plan = getPlan(),
      store = activeStore;
    modal(
      `<h2>Delete ${e(plan.title)}?</h2><p>This removes the plan and its recorded-use history. Your songs, reviews and libraries stay intact.</p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button danger" id="confirm-plan-delete">Delete this plan</button></div>`,
    );
    document.querySelector("#confirm-plan-delete").onclick = () => {
      if (store !== activeStore) return;
      state.plans = state.plans.filter((p) => p.id !== plan.id);
      planId = state.plans[0]?.id;
      persist();
      dialog.close();
      render();
    };
    return;
  }
  if (action === "collection-preview")
    return previewCollection(songCollections.find((p) => p.id === id));
  if (action === "import-select-all" || action === "import-select-none") {
    dialog
      .querySelectorAll('[name="songs"]')
      .forEach((input) => (input.checked = action === "import-select-all"));
    return;
  }
  if (action === "song-page") {
    songPage = Number(id);
    selected = null;
    render();
    return;
  }
  if (action === "index-page") {
    indexPageNumber = Number(id);
    render();
    return;
  }
  if (action === "csv-import")
    return modal(
      '<h2>Import a song list</h2><p class="muted">Upload a CSV with a Title or Song Title column. Attribution, themes and preferred key are optional. You will preview the songs before importing. Existing matching records are preserved.</p><form id="csv-import-form"><label>Song list CSV<input type="file" name="file" accept=".csv,text/csv" required></label><p id="import-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">Preview song list</button></div></form>',
    );
  if (action === "rename-library") {
    const library = state.libraries.find((l) => l.id === id);
    return modal(
      `<h2>Rename library</h2><form id="rename-library-form" data-id="${e(id)}"><label>Library name<input name="name" value="${e(library.name)}" maxlength="100" required></label><p id="library-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">Save library name</button></div></form>`,
    );
  }
  if (action === "delete-library") {
    const library = state.libraries.find((l) => l.id === id),
      store = activeStore;
    if (state.libraries.length === 1) return;
    modal(
      `<h2>Delete ${e(library.name)}?</h2><p>This removes the library. Its songs, reviews, arrangements and worship plans stay in your workspace.</p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button danger" id="confirm-library-delete">Delete this library</button></div>`,
    );
    document.querySelector("#confirm-library-delete").onclick = () => {
      if (store !== activeStore) return;
      state.libraries = state.libraries.filter((l) => l.id !== id);
      libraryId = state.libraries[0].id;
      persist();
      dialog.close();
      render();
      toast("Library deleted. Songs and reviews retained.");
    };
    return;
  }
  if (action === "export-library") {
    const library = state.libraries.find((l) => l.id === id),
      songs = state.songs.filter((s) => library.songIds.includes(s.id));
    return download(
      "faithful-repertoire-song-list.csv",
      indexCSV(
        songs,
        indexFields(songs),
        state.profile,
        state.libraries,
        state.plans,
      ),
      "text/csv;charset=utf-8",
    );
  }
  if (action === "criteria-search") return criteriaDialog();
  if (action === "edit-index") return indexDetailsDialog(song);
  if (action === "index-entry") {
    if (indexRules.length >= 30)
      return toast("You can combine up to 30 filters.");
    const field =
      button.dataset.field === "words" ? "lyrics" : button.dataset.field;
    const type = indexFields(state.songs).find((f) => f.id === field)?.type;
    indexPageNumber = 1;
    indexRules.push({
      field,
      op:
        button.dataset.field === "words"
          ? "word"
          : type === "number"
            ? "numeric"
            : "equals",
      value: button.dataset.value,
    });
    render();
    return;
  }
  if (action === "index-open") {
    selected = id;
    view = "discover";
    query = song.title;
    songPage = 1;
    themeFilter = approvalFilter = typeFilter = reviewFilter = "";
    if (dialog.open) dialog.close();
    render();
    return;
  }
  if (action === "remove-index-filter") {
    indexRules.splice(Number(id), 1);
    indexPageNumber = 1;
    render();
    return;
  }
  if (action === "reset-index") {
    indexRules = [];
    indexPageNumber = 1;
    indexQuery = "";
    indexSort = "title";
    indexDescending = false;
    render();
    return;
  }
  if (action === "export-index") {
    download(
      "faithful-repertoire-index.csv",
      indexCSV(
        indexResults(),
        indexFields(state.songs),
        state.profile,
        state.libraries,
        state.plans,
      ),
      "text/csv;charset=utf-8",
    );
    return;
  }
  if (action === "add-metric") {
    const rows = document.querySelector("#custom-metrics");
    if (rows.children.length >= 50)
      return toast("You can record up to 50 custom metrics per song.");
    rows.insertAdjacentHTML("beforeend", customMetricRow());
    return;
  }
  if (action === "remove-metric") {
    button.closest(".custom-metric-row").remove();
    return;
  }
  if (action === "setup-profile") return wizard();
  if (action === "account")
    return accountDialog(button.dataset.mode || "signin");
  if (action === "sync-profile") {
    saveAccountProfile().then((saved) => {
      if (saved) toast("Your profile is saved to your account.");
    });
    return;
  }
  if (action === "copy-browser") {
    try {
      const saved = localStorage.getItem(STORE);
      if (!saved) return toast("No separate browser workspace is saved.");
      confirmCloudRestore(
        { workspace: validateWorkspace(JSON.parse(saved)) },
        "Copy your browser workspace into this account?",
      );
    } catch {
      toast(
        "The browser workspace could not be loaded. Restore an exported backup instead.",
      );
    }
    return;
  }
  if (action === "signout") {
    accounts
      .signOut()
      .catch(() =>
        toast(
          "Signed out of this browser. The service could not confirm remote session revocation.",
        ),
      )
      .finally(() => {
        switchWorkspace();
        dialog.close();
        render();
      });
    return;
  }
  if (action === "cloud-save") {
    if (["saving", "checking", "conflict"].includes(accountSave.phase))
      return toast("Review the account copy before saving.");
    modal(
      '<h2>Save an account backup?</h2><p>This uploads your current profile, index details, stored song words, notes, libraries and plans to your account and replaces its existing backup. Sign-in credentials are excluded. If another device has saved since this copy was checked, the upload will stop so you can review its changes.</p><p id="account-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="save-cloud">Save this workspace</button></div>',
    );
    document.querySelector("#save-cloud").onclick = async (event) => {
      event.target.disabled = true;
      const snapshot = clone(state),
        owner = accounts.user?.id,
        store = activeStore;
      accountSave.phase = "saving";
      updateSaveStrip();
      try {
        await accounts.saveWorkspace(snapshot);
        if (accounts.user?.id !== owner || activeStore !== store) return;
        accountSave = {
          phase: "local",
          signature: workspaceSignature(snapshot),
          remoteAvailable: true,
        };
        updateSaveStrip();
        dialog.close();
        toast("Your workspace and profile are saved to your account.");
      } catch (error) {
        if (accounts.user?.id !== owner || activeStore !== store) return;
        accountSave.phase =
          error instanceof WorkspaceConflictError ? "conflict" : "error";
        if (error instanceof WorkspaceConflictError)
          accountSave.remoteAvailable = true;
        updateSaveStrip();
        if (document.querySelector("#account-error"))
          document.querySelector("#account-error").textContent = error.message;
        event.target.disabled = false;
      }
    };
    return;
  }
  if (action === "cloud-load") {
    if (accountSave.phase === "saving") return;
    const owner = accounts.user?.id,
      store = activeStore;
    button.disabled = true;
    accounts
      .loadWorkspace()
      .then((saved) => {
        if (accounts.user?.id !== owner || activeStore !== store) return;
        accountSave.phase = "local";
        accountSave.remoteAvailable = Boolean(saved);
        updateSaveStrip();
        if (!saved) {
          toast("No account backup yet. Save this workspace first.");
          button.disabled = false;
        } else confirmCloudRestore(saved);
      })
      .catch((error) => {
        if (document.querySelector("#account-error"))
          document.querySelector("#account-error").textContent = error.message;
        button.disabled = false;
      });
    return;
  }
  if (action === "approval") return approvalDialog(song);
  if (action === "clear-filters") {
    themeFilter = approvalFilter = "";
    typeFilter = reviewFilter = "";
    songPage = 1;
    render();
    return;
  }
  if (action === "close") return dialog.close();
  if (action === "nav") {
    view = button.dataset.view;
    query = "";
    themeFilter = approvalFilter = "";
    typeFilter = reviewFilter = "";
    songPage = 1;
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (action === "song-select") {
    selected = id;
    render();
    if (innerWidth < 850)
      document
        .querySelector(".detail-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "library-select") {
    libraryId = id;
    query = "";
    themeFilter = approvalFilter = "";
    render();
    return;
  }
  if (action === "plan-select") {
    planId = id;
    render();
    return;
  }
  if (action === "new-song") return newSongDialog();
  if (action === "edit-review") return editReviewDialog(song);
  if (action === "new-library")
    return modal(
      '<h2>Create a library</h2><form id="library-form"><label>Library name<input name="name" required maxlength="100" placeholder="Church approved repertoire"></label><div class="form-actions"><button class="button primary">Create library</button></div></form>',
    );
  if (action === "save-song")
    return modal(
      `<h2>Save ${e(song.title)}</h2><p class="muted">A song can belong to more than one library.</p><form id="save-song-form" data-id="${e(id)}">${state.libraries.map((l) => `<label class="check-label"><input type="checkbox" name="libraries" value="${e(l.id)}" ${l.songIds.includes(id) ? "checked" : ""}>${e(l.name)}</label>`).join("")}<div class="form-actions"><button class="button primary">Save library choices</button></div></form>`,
    );
  if (action === "remove-library-song") {
    const lib = state.libraries.find((l) => l.id === libraryId);
    lib.songIds = lib.songIds.filter((x) => x !== id);
    persist();
    render();
    toast("Removed from this library. Assessment preserved.");
    return;
  }
  if (action === "new-plan") return planDialog();
  if (action === "edit-plan") return planDialog(getPlan());
  if (action === "new-item") return itemDialog();
  if (action === "edit-item")
    return itemDialog(getPlan().items.find((i) => i.id === id));
  if (action === "move-item") {
    const p = getPlan(),
      i = p.items.findIndex((x) => x.id === id),
      to = i + Number(button.dataset.direction);
    if (to >= 0 && to < p.items.length)
      [p.items[i], p.items[to]] = [p.items[to], p.items[i]];
    persist();
    render();
    return;
  }
  if (action === "remove-item") {
    const p = getPlan(),
      i = p.items.findIndex((x) => x.id === id),
      removed = p.items.splice(i, 1)[0];
    persist();
    render();
    modal(
      `<h2>Item removed</h2><p>You can restore it before closing this dialog.</p><button class="button" id="undo-item">Undo removal</button>`,
    );
    document.querySelector("#undo-item").onclick = () => {
      p.items.splice(i, 0, removed);
      persist();
      render();
      dialog.close();
    };
    return;
  }
  if (action === "add-to-plan") {
    if (song.approval?.status === "avoid") {
      toast(
        "This song is marked “Avoid for our church.” Review that decision before adding it to a plan.",
      );
      approvalDialog(song);
      return;
    }
    if (!state.plans.length) {
      toast("Create a plan first, then add this song.");
      view = "plans";
      render();
      planDialog();
      return;
    }
    return modal(
      `<h2>Add ${e(song.title)} to a plan</h2><form id="add-to-plan-form" data-id="${e(id)}"><label>Worship plan<select name="plan">${state.plans.map((p) => `<option value="${e(p.id)}" ${p.id === planId ? "selected" : ""}>${e(p.title)} ${e(p.date)}</option>`).join("")}</select></label><label>Service role<input name="role" maxlength="100" placeholder="Enter the place you choose for this song"></label>${song.arrangements?.length ? `<label>Arrangement<select name="arrangement" aria-label="Plan arrangement"><option value="">Song settings · no arrangement selected</option>${song.arrangements.map((a) => `<option value="${e(a.id)}" ${song.preferredArrangementId === a.id ? "selected" : ""}>${e(a.name)} · ${e(a.key || "key unset")}</option>`).join("")}</select></label>` : ""}<div class="form-columns"><label>Key<input name="key" maxlength="30" value="${e(selectedArrangement(song)?.key ?? song.review.key)}"></label><label>Duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(selectedArrangement(song)?.minutes ?? song.review.minutes)}" required></label></div><div class="form-actions"><button class="button primary">Add to plan</button></div></form>`,
    );
  }
  if (action === "backup")
    return modal(
      `<h2>Keep your repertoire safe.</h2><p class="muted">Your songs, libraries, notes, rating profile and worship plans are saved on this browser. Download a backup to move them to another browser or restore them later.</p><button class="button primary" data-action="export">Download a backup</button><hr class="backup-divider"><h3>Restore a saved backup</h3><p class="muted">Choose a Faithful Repertoire JSON backup. You’ll review it before replacing any current data.</p><form id="restore-form"><label>Backup file<input name="backup" type="file" accept=".json,application/json" required></label><p id="restore-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Review backup</button></div></form>`,
    );
  if (action === "export")
    return download(
      "faithful-repertoire-backup.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
  if (action === "export-plan")
    return download(
      "worship-plan.txt",
      planOutline(getPlan(), state.songs),
      "text/plain",
    );
  if (action === "ai-review" && state.profile.aiMode === "manual") {
    toast("Human reviews only sends no AI requests.");
    return;
  }
  if (action === "ai-review")
    return modal(
      `<h2>Draft a review with AI</h2><p class="muted">${aiConfigured ? "Your supplied text is sent to the AI provider. The draft needs human review; it does not search the web." : "AI drafting is not available in this edition. You can still edit every assessment manually."}</p><form id="ai-form" data-id="${e(id)}"><label>Song text you have permission to use<textarea name="lyrics" rows="9" maxlength="20000" required placeholder="Paste the exact version for analysis. This text is not saved in your library."></textarea></label><label>Arrangement evidence<textarea name="arrangement" rows="3" maxlength="4000" placeholder="For example: 4 minutes, two verses, repeated chorus, 45 seconds of wordless vocals. Leave blank if unknown."></textarea></label><p class="muted">Current rating parameters will be included. Applying a draft preserves the previous assessment and keeps your personal notes.</p><p id="ai-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary" ${aiConfigured ? "" : "disabled"}>Generate draft</button></div></form>`,
    );
});
document.addEventListener("input", (event) => {
  if (event.target.id !== "search") return;
  const position = event.target.selectionStart;
  query = event.target.value;
  songPage = 1;
  render();
  const input = document.querySelector("#search");
  input.focus();
  try {
    input.setSelectionRange(position, position);
  } catch {}
});
document.addEventListener("change", (event) => {
  if (
    event.target.closest("#add-to-plan-form") &&
    event.target.name === "arrangement"
  ) {
    const form = event.target.form,
      song = state.songs.find((s) => s.id === form.dataset.id),
      a = song.arrangements?.find((a) => a.id === event.target.value);
    form.elements.key.value = a?.key ?? song.review.key;
    form.elements.minutes.value = a?.minutes ?? song.review.minutes;
    return;
  }
  if (event.target.id === "collection-depth") {
    collectionDepth = event.target.value;
    render();
    return;
  }
  if (event.target.closest("#collection-import-form")) {
    const form = event.target.form;
    if (event.target.name === "depth") {
      importDraft.target = form.elements.target.value;
      importDraft.name = form.elements.name.value;
      importDraft.depth = event.target.value;
      const pack = songCollections.find((p) => p.id === importDraft.packId);
      importDraft.songs = collectionSongs(pack, importDraft.depth);
      importDialog();
    } else if (event.target.name === "target") {
      form.elements.name.disabled = event.target.value !== "__new__";
      form.elements.name.required = event.target.value === "__new__";
    }
    return;
  }
  if (event.target.closest("#index-filter-form")) {
    const form = event.target.form;
    if (event.target.name === "field") {
      const field = indexFields(state.songs).find(
        (f) => f.id === form.elements.field.value,
      );
      form.elements.op.innerHTML = indexOperators(field.type);
      form.elements.value.type = field.type === "number" ? "number" : "text";
      form.elements.value.step = "any";
      form.elements.value.value = "";
      form.querySelector("#index-values").innerHTML = indexEntries(
        state.songs,
        field.id,
        state.profile,
        state.libraries,
        state.plans,
      )
        .slice(0, 200)
        .map((entry) => `<option value="${e(entry.value)}"></option>`)
        .join("");
    }
    const withoutValue = ["missing", "present"].includes(
      form.elements.op.value,
    );
    form.elements.value.disabled = withoutValue;
    form.elements.value.required = !withoutValue;
    return;
  }
  if (event.target.id === "index-sort") {
    indexSort = event.target.value;
    render();
    return;
  }
  if (event.target.id === "index-order") {
    indexDescending = event.target.value === "desc";
    render();
    return;
  }
  if (event.target.id === "index-column") {
    indexColumn = event.target.value;
    render();
    return;
  }
  if (
    event.target.name === "statement" &&
    event.target.closest("#wizard-form")
  ) {
    event.target.form.elements.customStatement.required =
      event.target.value === "custom";
    return;
  }
  if (event.target.id === "theme-filter") themeFilter = event.target.value;
  else if (event.target.id === "type-filter") typeFilter = event.target.value;
  else if (event.target.id === "review-filter")
    reviewFilter = event.target.value;
  else if (event.target.id === "approval-filter")
    approvalFilter = event.target.value;
  else if (event.target.id === "sort-order") sortOrder = event.target.value;
  else if (
    event.target.closest("#approval-form") &&
    event.target.name === "status"
  ) {
    const form = event.target.form;
    updateApprovalRequirements(
      form,
      state.songs.find((s) => s.id === form.dataset.id),
    );
    return;
  } else return;
  songPage = 1;
  render();
});
document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target,
    fd = new FormData(form),
    values = Object.fromEntries(fd),
    id = form.dataset.id;
  const lines = (key) =>
    String(values[key] || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  if (form.id === "detail-layout-form") {
    const song = state.songs.find((s) => s.id === id),
      rows = [...form.querySelectorAll(".attribute-row")];
    song.detailLayout = {
      order: rows.map((x) => x.dataset.key),
      hidden: rows
        .filter((x) => !x.querySelector("input").checked)
        .map((x) => x.dataset.key),
    };
    persist();
    dialog.close();
    render();
    return;
  }
  if (form.id === "arrangement-form") {
    try {
      const next = clone(state),
        song = next.songs.find((s) => s.id === form.dataset.song);
      const record = {
        id: id || uid(),
        name: values.name.trim(),
        key: values.key.trim(),
        minutes: Number(values.minutes),
        notes: values.notes.trim(),
        lowNote: values.lowNote.trim(),
        highNote: values.highNote.trim(),
        timeSignature: values.timeSignature.trim(),
        vocalDifficulty: values.vocalDifficulty.trim(),
        instrumentalDifficulty: values.instrumentalDifficulty.trim(),
        instruments: values.instruments
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      for (const k of [
        "tempo",
        "largestLeap",
        "wordlessSeconds",
        "instrumentalSeconds",
      ])
        record[k] = values[k] === "" ? null : Number(values[k]);
      song.arrangements ||= [];
      if (id)
        song.arrangements = song.arrangements.map((a) =>
          a.id === id ? record : a,
        );
      else song.arrangements.push(record);
      const wasPreferred = song.preferredArrangementId === record.id;
      if (values.preferred) song.preferredArrangementId = record.id;
      else if (wasPreferred) delete song.preferredArrangementId;
      if (wasPreferred || values.preferred) invalidateApproval(song);
      if (!commitWorkspace(validateWorkspace(next))) return;
      dialog.close();
      render();
      toast(
        "Arrangement saved. Measurements are your observations, not AI estimates.",
      );
    } catch (error) {
      form.querySelector("#arrangement-error").textContent = error.message;
    }
    return;
  }
  if (form.id === "index-view-form") {
    try {
      const next = clone(state);
      next.indexViews ||= [];
      const existing = next.indexViews.find((v) => v.id === id);
      if (id && !existing) throw new Error("This saved view is no longer available.");
      const record = form.dataset.rename === "true" ? { ...existing, name: values.name.trim() } : {
        id: id || uid(), name: values.name.trim(), query: indexQuery,
        rules: clone(indexRules), sort: indexSort, descending: indexDescending, column: indexColumn,
      };
      if (id) next.indexViews = next.indexViews.map((v) => v.id === id ? record : v);
      else next.indexViews.push(record);
      if (!commitWorkspace(validateWorkspace(next))) return;
      activeIndexViewId = record.id;
      dialog.close(); render(); toast("Index view saved.");
    } catch (err) { form.querySelector("#view-error").textContent = err.message; }
    return;
  }
  if (form.id === "template-form") {
    try {
      const next = clone(state);
      next.planTemplates ||= [];
      const mode = form.dataset.mode;
      if (mode === "save") {
        const plan = next.plans.find((p) => p.id === id);
        if (!plan) throw new Error("This plan is no longer available.");
        next.planTemplates.push(templateFromPlan(plan, values.title.trim(), !!values.keepSongs));
      } else {
        const template = next.planTemplates.find((t) => t.id === id);
        if (!template) throw new Error("This template is no longer available.");
        if (mode === "rename") template.title = values.title.trim();
        else {
          const plan = planFromTemplate(template, { title: values.title.trim(), date: values.date });
          next.plans.push(plan);
          if (!commitWorkspace(validateWorkspace(next))) return;
          planId = plan.id; view = "plans";
          dialog.close(); render(); toast("Independent service draft created."); return;
        }
      }
      if (!commitWorkspace(validateWorkspace(next))) return;
      dialog.close(); render(); toast("Service template saved.");
    } catch (err) { form.querySelector("#template-error").textContent = err.message; }
    return;
  }
  if (form.id === "copy-plan-form") {
    const next = clone(state),
      plan = next.plans.find((p) => p.id === id),
      copied = copyPlan(plan, {
        title: values.title.trim(),
        date: values.date,
      });
    next.plans.push(copied);
    if (!commitWorkspace(validateWorkspace(next))) return;
    planId = copied.id;
    dialog.close();
    render();
    toast("Independent draft created.");
    return;
  }
  if (form.id === "csv-import-form") {
    const store = activeStore;
    try {
      const file = fd.get("file");
      if (!file?.size || file.size > 1024 * 1024)
        throw new Error("Choose a CSV file under 1 MB.");
      const songs = songsFromCSV(await file.text());
      if (store !== activeStore || !form.isConnected) return;
      importDraft = {
        packId: null,
        depth: null,
        songs,
        target: view === "library" ? libraryId : "__new__",
        name:
          file.name.replace(/\.csv$/i, "").slice(0, 100) || "Imported songs",
      };
      importDialog();
    } catch (error) {
      if (form.isConnected)
        form.querySelector("#import-error").textContent = error.message;
    }
    return;
  }
  if (form.id === "collection-import-form") {
    try {
      const selected = new Set(fd.getAll("songs"));
      const songs = importDraft.songs.filter((song) => selected.has(song.id));
      const result = importSongs(state, songs, {
        libraryId: values.target === "__new__" ? null : values.target,
        libraryName: values.name,
        collectionId: importDraft.packId,
        depth: importDraft.depth,
      });
      if (!commitWorkspace(result.workspace)) return;
      libraryId = result.libraryId;
      view = "library";
      songPage = 1;
      query = themeFilter = approvalFilter = typeFilter = reviewFilter = "";
      dialog.close();
      render();
      toast(
        `${result.added} new records; ${result.saved} songs added to the library. Existing reviews retained.`,
      );
    } catch (error) {
      form.querySelector("#import-error").textContent = error.message;
    }
    return;
  }
  if (form.id === "rename-library-form") {
    const name = values.name.trim();
    if (
      !name ||
      state.libraries.some(
        (l) => l.id !== id && l.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      form.querySelector("#library-error").textContent =
        "Choose a distinct library name.";
      return;
    }
    state.libraries.find((l) => l.id === id).name = name;
    persist();
    dialog.close();
    render();
    return;
  }
  if (form.id === "criteria-form") {
    const error = form.querySelector("#criteria-error"),
      submit =
        form.querySelector('[type="submit"]') || form.querySelector(".primary");
    const owner = activeStore,
      mode = state.profile.aiMode;
    try {
      if (!aiConfigured) { prepareChatGPTCriteria(form); return; }
      if (mode !== "full" || !aiConfigured)
        throw new Error(
          "This search requires Full AI content and a connected AI service.",
        );
      const library = state.libraries.find((l) => l.id === values.library);
      const songs =
        library?.songIds
          .map((id) => state.songs.find((s) => s.id === id))
          .filter(Boolean) || [];
      if (!songs.length || songs.length > 100)
        throw new Error(
          "Select a library containing 1–100 songs. You can create a smaller library to narrow your search.",
        );
      const evidence = songs.map((song) =>
        criteriaEvidence(song, state.profile),
      );
      submit.disabled = true;
      submit.textContent = "Searching your library…";
      const response = await fetch("./api/index-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: values.criteria,
          aiMode: mode,
          songs: evidence,
        }),
        signal: AbortSignal.timeout(75000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "The AI search could not be completed.",
        );
      const checked = validateCriteriaResults(result, evidence);
      if (
        activeStore !== owner ||
        state.profile.aiMode !== mode ||
        !form.isConnected ||
        !dialog.open
      )
        return;
      const labels = {
        likely: "Likely match",
        possible: "Possible match",
        insufficient: "Insufficient evidence",
        unlikely: "Does not appear to match",
      };
      const renderResults = (items) =>
        items
          .map(
            (item) =>
              `<li><button class="index-title" data-action="index-open" data-id="${e(item.id)}">${e(songs.find((s) => s.id === item.id).title)}</button><small>${labels[item.fit]}</small><p>${e(item.reason)}</p>${item.evidence.map((q) => `<blockquote>${e(q)}</blockquote>`).join("")}</li>`,
          )
          .join("");
      const matches = checked.filter((item) =>
          ["likely", "possible"].includes(item.fit),
        ),
        other = checked.filter(
          (item) => !["likely", "possible"].includes(item.fit),
        );
      modal(
        `<h2>Library criteria search</h2><p>${e(values.criteria)}</p><p class="muted">${matches.length} tentative matches of ${songs.length} songs · ${e(result.model)}. These are AI interpretations of supplied excerpts and records. Results follow library order, with no ranking or service selection.</p><ul class="criteria-results">${renderResults(matches) || "<li>No tentative matches were supported by the supplied records.</li>"}</ul><details><summary>Other results (${other.length})</summary><ul class="criteria-results">${renderResults(other)}</ul></details><p class="muted">Results are temporary. Your assessments, metrics, approval and worship plans are unchanged.</p><button class="button" data-action="close">Close search</button>`,
      );
    } catch (err) {
      if (!form.isConnected) return;
      error.textContent = err.message;
      submit.disabled = false;
      submit.textContent = aiConfigured ? "Search with AI" : "Prepare ChatGPT search";
    }
    return;
  }
  if (form.id === "index-search-form") {
    indexPageNumber = 1;
    indexQuery = values.query;
    render();
    return;
  }
  if (form.id === "index-browse-form") {
    browseField = values.field;
    browseQuery = values.value;
    render();
    document.querySelector(".index-directory").open = true;
    return;
  }
  if (form.id === "index-filter-form") {
    if (indexRules.length >= 30)
      return toast("You can combine up to 30 filters.");
    indexPageNumber = 1;
    indexRules.push({
      field: values.field,
      op: values.op,
      value: values.value || "",
    });
    render();
    return;
  }
  if (form.id === "index-details-form") {
    try {
      const metadata = Object.fromEntries(
        [
          "tune",
          "meter",
          "timeSignature",
          "range",
          "vocalDifficulty",
          "instrumentalDifficulty",
          "languageName",
          "lyrics",
        ].map((k) => [k, values[k].trim()]),
      );
      metadata.tempo = values.tempo === "" ? null : Number(values.tempo);
      for (const key of ["themes", "instruments", "tags"])
        metadata[key] = values[key]
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      metadata.custom = [
        ...form.querySelectorAll(".custom-metric-row"),
      ].flatMap((row) => {
        const name = row.querySelector('[name="metric-name"]').value.trim(),
          type = row.querySelector('[name="metric-type"]').value,
          raw = row.querySelector('[name="metric-value"]').value.trim();
        if (!name && !raw) return [];
        if (!name || !raw)
          throw new Error("Each custom metric needs a name and a value.");
        if (type === "number" && !Number.isFinite(Number(raw)))
          throw new Error("A numeric metric must contain a number.");
        return [{ name, type, value: type === "number" ? Number(raw) : raw }];
      });
      const next = clone(state),
        song = next.songs.find((s) => s.id === id);
      if (
        metadata.lyrics !== (song.metadata?.lyrics || "") ||
        metadata.themes.join(",") !==
          themesForDisplay(song, state.profile.aiMode).join(",")
      )
        invalidateApproval(song);
      if (
        !song.metadata?.themes &&
        JSON.stringify(metadata.themes) ===
          JSON.stringify(themesForDisplay(song, state.profile.aiMode))
      )
        delete metadata.themes;
      song.metadata = metadata;
      state = validateWorkspace(next);
      persist();
      dialog.close();
      render();
      toast("Your index details are saved.");
    } catch (error) {
      form.querySelector("#index-error").textContent = error.message;
    }
    return;
  }
  if (form.id === "wizard-form") {
    const step = Number(form.dataset.step);
    if (step === 1) {
      if (wizardDraft.denomination !== values.denomination) {
        wizardDraft.statement =
          Object.keys(statements).find(
            (key) => statements[key].denomination === values.denomination,
          ) || "nicene";
      }
      wizardDraft.denomination = values.denomination;
      wizard(2);
      return;
    }
    if (step === 2) {
      const changed =
        wizardDraft.statement !== values.statement ||
        wizardDraft.denomination !== state.profile.denomination ||
        wizardDraft.customStatement !== values.customStatement;
      wizardDraft.statement = values.statement;
      wizardDraft.customStatement = values.customStatement;
      if (changed)
        wizardDraft.principles = composePrinciples(
          values.statement,
          values.customStatement,
        );
      wizard(3);
      return;
    }
    state.profile = {
      ...wizardDraft,
      aiMode: values.aiMode,
      principles: values.principles,
      setupComplete: true,
    };
    persist();
    dialog.close();
    render();
    toast("Your worship profile is saved.");
    await saveAccountProfile();
    return;
  }
  if (form.id === "auth-form") {
    const submit = form.querySelector(".primary");
    submit.disabled = true;
    try {
      const redirect = new URL("./", location.href).href;
      if (form.dataset.mode === "recover") {
        await accounts.recover(values.email, redirect);
        modal(
          "<h2>Check your email</h2><p>If an account exists for that address, you’ll receive a password reset link. Open it in this browser to continue.</p>",
        );
        return;
      }
      if (form.dataset.mode === "signup") {
        const result = await accounts.signUp(
          values.email,
          values.password,
          redirect,
        );
        if (!result.signedIn) {
          modal(
            '<h2>Check your email to continue</h2><p>Confirm your email using the link from the account service, then return here to sign in.</p><button class="button primary" data-action="account">Sign in</button>',
          );
          return;
        }
      } else await accounts.signIn(values.email, values.password);
      switchWorkspace(accounts.user);
      await loadAccountProfile();
      accountDialog();
      toast("Signed in. Your browser-only workspace is preserved separately.");
    } catch (error) {
      if (form.isConnected)
        form.querySelector("#account-error").textContent = error.message;
      submit.disabled = false;
    }
    return;
  }
  if (form.id === "password-form") {
    const submit = form.querySelector(".primary");
    submit.disabled = true;
    try {
      await accounts.changePassword(values.password);
      dialog.close();
      toast("Password updated.");
    } catch (error) {
      form.querySelector("#account-error").textContent = error.message;
      submit.disabled = false;
    }
    return;
  }
  if (form.id === "approval-form") {
    const song = state.songs.find((s) => s.id === id);
    song.approval = {
      status: values.status,
      notes: values.notes.trim(),
      updatedAt:
        values.status === "unreviewed" ? null : new Date().toISOString(),
    };
    persist();
    dialog.close();
    render();
    toast("Church-use decision saved.");
    return;
  }
  if (form.id === "restore-form") {
    try {
      const file = fd.get("backup");
      if (!file?.size) throw new Error("Choose a backup file first.");
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error("The backup is too large. The limit is 5 MB.");
      const restored = syncCatalog(
        validateWorkspace(JSON.parse(await file.text())),
      );
      modal(
        `<h2>Restore this workspace?</h2><p>This backup contains <strong>${restored.songs.length} songs</strong>, <strong>${restored.libraries.length} libraries</strong> and <strong>${restored.plans.length} plans</strong>.</p><p class="muted">It will replace the data in this browser. Download your current workspace first if you want to keep it.</p><button class="text-button" data-action="export">Download current workspace</button><p id="confirm-restore-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="confirm-restore">Replace with this backup</button></div>`,
      );
      document.querySelector("#confirm-restore").onclick = () => {
        try {
          // Write successfully before changing the in-memory state.
          localStorage.setItem(activeStore, JSON.stringify(restored));
          state = restored;
          selected = state.songs[0]?.id;
          libraryId = state.libraries[0].id;
          planId = state.plans[0]?.id;
          query = "";
          view = "discover";
          dialog.close();
          render();
          toast("Your workspace has been restored.");
        } catch {
          document.querySelector("#confirm-restore-error").textContent =
            "Browser storage is unavailable or full. Your current workspace has not been replaced.";
        }
      };
    } catch (error) {
      form.querySelector("#restore-error").textContent =
        error instanceof SyntaxError
          ? "This file is not valid JSON. Choose an exported Faithful Repertoire backup."
          : error.message;
    }
    return;
  }
  if (form.id === "new-song-form") {
    if (!values.title.trim()) return;
    const song = {
      id: uid(),
      approval: { status: "unreviewed", notes: "", updatedAt: null },
      title: values.title.trim(),
      author: values.author.trim() || "Unknown attribution",
      firstLine: values.firstLine.trim(),
      version: values.version.trim() || "Version not specified",
      themes: values.themes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      review: {
        scores: { accuracy: null, substance: null, language: null, time: null },
        summary: "",
        claims: [],
        concerns: [],
        uses: [],
        scriptures: [],
        sources: [],
        language: "",
        time: "",
        concern: "none",
        musical: "Not assessed. Add observations for a specific arrangement.",
        key: "",
        minutes: 4,
        notes: "",
        status: "unreviewed",
      },
    };
    state.songs.push(song);
    selected = song.id;
    view = "discover";
    query = song.title;
    songPage = 1;
    themeFilter = approvalFilter = typeFilter = reviewFilter = "";
    toast("Song added. Start an assessment when ready.");
  } else if (form.id === "review-form") {
    const song = state.songs.find((s) => s.id === id),
      prev = clone(song.review);
    delete prev.previous;
    const sources = lines("sources");
    if (sources.some((s) => !/^https:\/\//.test(s))) {
      toast("Source links must start with https://");
      return;
    }
    song.review = {
      ...song.review,
      scores: Object.fromEntries(
        Object.keys(dimensions).map((k) => [
          k,
          values[`score-${k}`] === "" ? null : Number(values[`score-${k}`]),
        ]),
      ),
      summary: values.summary,
      claims: lines("claims"),
      uses: lines("uses"),
      scriptures: lines("scriptures"),
      language: values.language,
      time: values.time,
      concerns: lines("concerns"),
      musical: values.musical || "Not assessed.",
      notes: values.notes,
      concern: values.concern,
      key: values.key,
      minutes: Number(values.minutes),
      sources: sources.map(
        (url) =>
          song.review.sources.find((source) => source.url === url) || {
            url,
            label: url,
          },
      ),
      status: "manual",
      aiFields: [
        "scores",
        "summary",
        "claims",
        "uses",
        "scriptures",
        "language",
        "time",
        "concerns",
        "themes",
      ].filter(
        (k) =>
          isAiField(song, prev, k) &&
          JSON.stringify(prev[k]) ===
            JSON.stringify(
              k === "scores"
                ? Object.fromEntries(
                    Object.keys(dimensions).map((d) => [
                      d,
                      values[`score-${d}`] === ""
                        ? null
                        : Number(values[`score-${d}`]),
                    ]),
                  )
                : ["claims", "uses", "scriptures", "concerns"].includes(k)
                  ? lines(k)
                  : k === "themes"
                    ? prev.themes
                    : values[k],
            ),
      ),
      updatedAt: new Date().toISOString(),
      previous: prev,
    };
    invalidateApproval(song);
    toast(
      "Your assessment has been saved. Church-use approval needs a fresh review.",
    );
  } else if (form.id === "library-form") {
    if (!values.name.trim()) return;
    const lib = { id: uid(), name: values.name.trim(), songIds: [] };
    state.libraries.push(lib);
    libraryId = lib.id;
    view = "library";
    query = "";
    toast("Library created.");
  } else if (form.id === "save-song-form") {
    const libraries = fd.getAll("libraries");
    state.libraries.forEach((l) => {
      l.songIds = l.songIds.filter((s) => s !== id);
      if (libraries.includes(l.id)) l.songIds.push(id);
    });
    toast("Library choices saved.");
  } else if (form.id === "profile-form") {
    const weights = Object.fromEntries(
      Object.keys(dimensions).map((k) => [k, Number(values[k])]),
    );
    if (!Object.values(weights).some((w) => w > 0)) {
      toast("Give at least one dimension a positive weight.");
      return;
    }
    state.profile = {
      ...state.profile,
      weights,
      principles: values.principles,
      aiMode: values.aiMode,
      aiLabels: values.aiLabels !== "off",
      setupComplete: true,
    };
    persist();
    render();
    toast("Rating profile saved. Existing assessments preserved.");
    await saveAccountProfile();
    return;
  } else if (form.id === "plan-form") {
    if (!values.title.trim()) return;
    const plan = id
      ? state.plans.find((p) => p.id === id)
      : { id: uid(), items: [] };
    Object.assign(plan, values, { title: values.title.trim() });
    if (!id) state.plans.push(plan);
    planId = plan.id;
    view = "plans";
    toast("Worship plan saved.");
  } else if (form.id === "add-to-plan-form") {
    const p = state.plans.find((p) => p.id === values.plan);
    const song = state.songs.find((s) => s.id === id),
      arrangement = song.arrangements?.find((a) => a.id === values.arrangement);
    p.items.push({
      ...(arrangement
        ? { arrangementId: arrangement.id, arrangementName: arrangement.name }
        : {}),
      id: uid(),
      type: "song",
      songId: id,
      role: values.role,
      key: values.key,
      minutes: Number(values.minutes),
      notes: "",
    });
    planId = p.id;
    view = "plans";
    toast("Song added to your plan.");
  } else if (form.id === "item-form") {
    const p = getPlan(),
      item = id
        ? p.items.find((i) => i.id === id)
        : { id: uid(), type: "other" };
    Object.assign(item, values, { minutes: Number(values.minutes) });
    if (!id) p.items.push(item);
    toast("Service item saved.");
  } else if (form.id === "ai-form") {
    const song = state.songs.find((s) => s.id === id),
      submit = form.querySelector('button[type="submit"], button.primary'),
      error = form.querySelector("#ai-error");
    submit.disabled = true;
    submit.textContent = "Analyzing supplied text…";
    try {
      const response = await fetch("./api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: song.title,
          author: song.author,
          version: song.version,
          lyrics: values.lyrics,
          arrangement: values.arrangement,
          profile: state.profile.principles,
          aiMode: state.profile.aiMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis failed.");
      const draft = restrictAssistance(
        validateReview(result.review),
        state.profile.aiMode,
      );
      if (!form.isConnected || !dialog.open) return;
      if (state.profile.aiMode === "limited") {
        modal(
          `<h2>Limited assistance observations</h2><p class="muted">These are AI suggestions about the supplied text and arrangement evidence. They do not assign theological ratings or replace your review.</p><p>${e(draft.summary)}</p><h3>Language observations</h3><p>${e(draft.language)}</p><h3>Arrangement observations</h3><p>${e(draft.time)}</p><div class="form-actions"><button class="button" data-action="close">Discard</button><button class="button primary" id="save-assistance">Save assistance notes</button></div>`,
        );
        document.querySelector("#save-assistance").onclick = () => {
          song.review.assistance = {
            summary: draft.summary,
            language: draft.language,
            time: draft.time,
            model: result.model,
            updatedAt: result.generatedAt,
          };
          persist();
          dialog.close();
          render();
          toast(
            "Assistance notes saved. Your assessment and approval are unchanged.",
          );
        };
        return;
      }
      modal(
        `<h2>Review the AI draft</h2><p class="muted">${e(result.model)} · No web research performed. This will replace the current assessment, preserving a copy and your personal notes.</p><p>${e(draft.summary)}</p><div class="draft-scores">${Object.entries(
          dimensions,
        )
          .map(
            ([k, l]) =>
              `<p>${e(l)} <strong>${draft.scores[k] ?? "Not assessed"}</strong></p>`,
          )
          .join(
            "",
          )}</div><h3>Claims</h3>${list(draft.claims)}<h3>Concerns</h3>${list(draft.concerns)}<h3>Scripture connections</h3>${list(draft.scriptures)}<h3>Language</h3><p>${e(draft.language)}</p><h3>Use of time</h3><p>${e(draft.time)}</p><div class="form-actions"><button class="button" data-action="close">Discard</button><button class="button primary" id="apply-draft">Apply draft</button></div>`,
      );
      document.querySelector("#apply-draft").onclick = () => {
        const previous = clone(song.review);
        delete previous.previous;
        song.review = {
          ...song.review,
          ...draft,
          previous,
          status: "ai",
          aiFields: [
            "scores",
            "summary",
            "claims",
            "uses",
            "scriptures",
            "language",
            "time",
            "concerns",
            "themes",
          ],
          updatedAt: result.generatedAt,
          model: result.model,
        };
        if (draft.themes.length) song.themes = draft.themes;
        invalidateApproval(song);
        persist();
        dialog.close();
        render();
        toast("AI draft applied. Review and edit before use.");
      };
      return;
    } catch (err) {
      error.textContent = err.message;
      submit.disabled = false;
      submit.textContent = "Generate draft";
      return;
    }
  } else return;
  persist();
  dialog.close();
  render();
});
render();
if (!storageProblem) persist();
if (accounts.configured) {
  const confirmation = location.hash.includes("access_token=")
    ? location.hash
    : null;
  if (confirmation)
    history.replaceState(null, "", location.pathname + location.search);
  const ready = confirmation
    ? accounts.acceptConfirmation(confirmation)
    : accounts.restoreSession();
  ready
    .then(async (type) => {
      accountReady = true;
      if (accounts.user) {
        switchWorkspace(accounts.user);
        await loadAccountProfile();
      }
      if (type === "recovery")
        modal(
          '<h2>Choose a new password</h2><form id="password-form"><label>New password<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><p id="account-error" role="alert"></p><div class="form-actions"><button class="button primary">Update password</button></div></form>',
        );
      render();
    })
    .catch((error) => {
      accountReady = true;
      toast(error.message);
      render();
    });
}
if (storageProblem)
  toast("Saved data could not be loaded. Export any new work before leaving.");
if (!staticEdition)
  fetch("./api/status")
    .then((r) => r.json())
    .then((result) => {
      aiConfigured = result.aiConfigured;
      render();
    })
    .catch(() => {});
