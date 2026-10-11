import { seedSongs } from "./seeds.js";
import {
  catalogSongs,
  syncCatalog,
  discoverSongs,
  approvalLabels,
  invalidateApproval,
} from "./catalog.js";
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
import { AccountClient } from "./accounts.js";
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
    return true;
  } catch {
    toast(
      "Browser storage is unavailable or full. Export a backup before leaving.",
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
  return `<div class="discovery-controls"><label>Theme<select id="theme-filter" aria-label="Theme"><option value="">All themes</option>${themes.map((t) => `<option value="${e(t)}" ${t === themeFilter ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label><label>Church use<select id="approval-filter" aria-label="Church use"><option value="">All decisions</option>${Object.entries(
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
    )}</select></label>${themeFilter || approvalFilter ? '<button class="text-button" data-action="clear-filters">Clear filters</button>' : ""}</div>`;
}
function churchDecision(song) {
  const decision = song.approval || { status: "unreviewed", notes: "" };
  return `<section class="church-decision ${e(decision.status)}"><div><span class="eyebrow">YOUR CHURCH-USE DECISION</span><strong>${e(approvalLabels[decision.status])}</strong>${decision.notes ? `<p>${e(decision.notes)}</p>` : "<p>Saving a song does not approve it for church use.</p>"}${decision.updatedAt ? `<small>Reviewed ${e(new Date(decision.updatedAt).toLocaleDateString())}</small>` : ""}</div><button class="button" data-action="approval" data-id="${e(song.id)}">Review decision</button></section>`;
}
function catalogComparison(song) {
  if (!song.catalogReview) return "";
  const base = song.catalogReview;
  const displayed = reviewForDisplay(song, state.profile.aiMode);
  return `<details class="catalog-comparison"><summary>${song.review.status === "starter" ? "Catalog assessment & provenance" : "Compare with the catalog assessment"}</summary><p class="muted">Editorial starter assessment · revision ${e(song.catalogRevision)}. Your personal assessment is stored separately. These notes are not an AI review or independent verification.</p><table><caption>Assessment scores</caption><thead><tr><th>Dimension</th><th>Catalog</th><th>Current</th></tr></thead><tbody>${Object.entries(
    dimensions,
  )
    .map(
      ([k, label]) =>
        `<tr><th scope="row">${e(label)}</th><td>${base.scores[k] ?? "—"}</td><td>${displayed.scores[k] ?? "—"}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table><p>${e(base.summary)}</p><h3>Catalog claims</h3>${list(base.claims)}<h3>Catalog concerns</h3>${list(base.concerns)}<h3>Catalog Scripture connections</h3>${list(base.scriptures)}</details>`;
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
  return `<div class="profile-strip"><span>${e(denominations[state.profile.denomination])} · ${e(statements[state.profile.statement].name)} · ${e(aiModes[state.profile.aiMode].title)}</span><button class="text-button" data-action="setup-profile">Edit profile</button></div>`;
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
}
function switchWorkspace(user = null) {
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
  const profile = await accounts.loadProfile();
  if (profile) {
    state.profile = withProfileDefaults(profile);
    persist();
    render();
  }
}
function accountDialog(mode = "signin") {
  if (!accountReady)
    return modal(
      "<h2>Checking your sign-in…</h2><p>Please try again in a moment. Your browser workspace is available.</p>",
    );
  if (accounts.user)
    return modal(
      `<h2>Your account</h2><p>${e(accounts.user.email)}</p><p class="muted">This browser keeps a separate workspace for each signed-in account. Account backups include your profile, AI preference, songs, libraries and plans. Saving replaces the account backup; loading requires confirmation.</p><div class="account-buttons"><button class="button" data-action="sync-profile">Sync my profile</button><button class="button" data-action="copy-browser">Copy browser workspace</button><button class="button primary" data-action="cloud-save">Save account backup</button><button class="button" data-action="cloud-load">Load account backup</button><button class="button" data-action="signout">Sign out</button></div><p id="account-error" role="alert"></p>`,
    );
  const enabled = accounts.configured;
  modal(
    `<h2>${mode === "signup" ? "Create your account" : mode === "recover" ? "Reset your password" : "Sign in to your repertoire"}</h2><p class="muted">${enabled ? "Your account can store your profile and a backup of your workspace across browsers." : "Accounts are being prepared. The hosted authentication service is not configured yet. You can use the full browser workspace and build your profile now."}</p><form id="auth-form" data-mode="${mode}"><label>Email<input name="email" type="email" autocomplete="email" required ${enabled ? "" : "disabled"}></label>${mode !== "recover" ? `<label>Password<input name="password" type="password" minlength="10" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required ${enabled ? "" : "disabled"}></label>` : ""}<p id="account-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Continue in this browser</button><button class="button primary" ${enabled ? "" : "disabled"}>${mode === "signup" ? "Create account" : mode === "recover" ? "Send reset email" : "Sign in"}</button></div></form><div class="account-links"><button class="text-button" data-action="account" data-mode="${mode === "signup" ? "signin" : "signup"}">${mode === "signup" ? "Already have an account? Sign in" : "Create an account"}</button><button class="text-button" data-action="account" data-mode="recover">Forgot password?</button></div>`,
  );
}
function confirmCloudRestore(saved, title = "Load your account backup?") {
  const restored = syncCatalog(saved.workspace);
  modal(
    `<h2>${e(title)}</h2><p>${restored.songs.length} songs · ${restored.libraries.length} libraries · ${restored.plans.length} plans</p><p class="muted">This replaces the current account workspace in this browser. Download a backup first if you want to keep it.</p><button class="text-button" data-action="export">Download current workspace</button><p id="account-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="apply-cloud">Load this backup</button></div>`,
  );
  document.querySelector("#apply-cloud").onclick = () => {
    try {
      localStorage.setItem(activeStore, JSON.stringify(restored));
      state = restored;
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
function render() {
  const count = new Set(state.libraries.flatMap((x) => x.songIds)).size;
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="nav" data-view="discover"><span class="brand-mark">✣</span><span>Faithful<br>Repertoire<small>WORDS WORTH SINGING</small></span></a><div class="workspace-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">${[
    ["discover", "◈", "Discover songs"],
    ["library", "▤", "Song libraries"],
    ["plans", "▦", "Worship plans"],
    ["profile", "◎", "Rating profile"],
  ]
    .map(
      ([id, icon, text]) =>
        `<button data-action="nav" data-view="${id}" class="nav-item ${view === id ? "active" : ""}"><span>${icon}</span>${text}${id === "library" ? `<b>${count}</b>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><div class="small-heading">A thoughtful repertoire.</div><p>Sound doctrine. Meaningful words.<br>A congregation that can sing.</p><button class="text-button" data-action="export">↓ Export your data</button><div class="local-note">Saved on this browser · no account needed</div></div></aside><main><header class="topbar"><span>Faithful Repertoire <span class="divider">/</span> ${e({ discover: "Discover", library: "Libraries", plans: "Planning", profile: "Preferences" }[view])}</span><div class="topbar-actions"><button class="button" data-action="account">${accounts.user && activeStore !== STORE ? "My account" : "Sign in"}</button><button class="button" data-action="backup">Backup & restore</button><span class="workspace-pill"><span class="dot"></span>Personal workspace</span></div></header><div class="page">${profilePrompt()}${view === "discover" || view === "library" ? songWorkspace() : view === "plans" ? plansPage() : profilePage()}</div><footer>Thoughtful tools for faithful worship. <span>First edition · ${aiConfigured ? "AI drafting available" : "Manual review available"}</span></footer></main>`;
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
    searchSongs(pool, query),
    { theme: themeFilter, approval: approvalFilter, sort: sortOrder },
    state.profile,
  );
  const song =
    state.songs.find(
      (s) => s.id === selected && songs.some((x) => x.id === s.id),
    ) || songs[0];
  if (song) selected = song.id;
  return `<div class="page-heading"><div><div class="eyebrow">${isLibrary ? "MAKE IT YOUR OWN" : "BUILD A FAITHFUL REPERTOIRE"}</div><h1>${isLibrary ? "Your song libraries" : "Find words worth singing."}</h1><p>${isLibrary ? "The songs you know, the notes you trust, the repertoire you’re building." : "Explore the theology, language, and practical place of every song."}</p></div><button class="button primary" data-action="${isLibrary ? "new-library" : "new-song"}">+ ${isLibrary ? "New library" : "Add a song"}</button></div>${isLibrary ? `<div class="library-tabs">${state.libraries.map((l) => `<button class="${l.id === lib?.id ? "selected" : ""}" data-action="library-select" data-id="${e(l.id)}">${e(l.name)} <span>${l.songIds.length}</span></button>`).join("")}</div>` : `<div class="intro-note"><span>✦</span><div><strong>More than “nothing unbiblical.”</strong><span>Look for substantial truth, clear language, and a meaningful use of time.</span></div><button data-action="nav" data-view="profile">Your rating profile ›</button></div>`}<div class="search-row"><label class="search-box"><span>⌕</span><input id="search" type="search" value="${e(query)}" placeholder="Search by title, writer, or theme…" aria-label="Search songs"></label><span class="result-count">${songs.length} song${songs.length === 1 ? "" : "s"}</span></div>${discoveryControls(pool)}<div class="song-workspace"><section class="song-list" aria-label="Song results">${songs.length ? songs.map((s) => songCard(s, s.id === song.id)).join("") : `<div class="empty"><span>♫</span><h3>${query ? "No matching songs" : "A repertoire starts with one song."}</h3><p>${query ? "Try another title or add a song to review." : "Find a song in Discover and save it here."}</p><button class="button" data-action="${query ? "new-song" : "nav"}" data-view="discover">${query ? "Add a song" : "Discover songs"}</button></div>`}<div class="catalog-note">${isLibrary ? "Library membership does not imply church approval." : `${catalogSongs.length} catalog hymns + your own songs. Catalog assessments are editorial drafts, not verified research.`}</div></section>${song ? songDetail(song, isLibrary ? lib : null) : '<section class="detail-panel empty"><h2>Your next song belongs here.</h2><p>Save an existing song or add one to begin a review.</p></section>'}</div>`;
}
function songCard(s, active) {
  const displayedReview = reviewForDisplay(s, state.profile.aiMode);
  const score = overall(displayedReview, state.profile);
  return `<button class="song-card ${active ? "selected" : ""}" data-action="song-select" data-id="${e(s.id)}"><div class="song-card-top"><span class="song-symbol">♫</span><span class="card-score">${score ?? "—"}<small>/10</small></span></div><h3>${e(s.title)}</h3><p>${e(s.author)}</p><div class="tags">${tagList(s.themes.slice(0, 2))}</div><div class="card-bottom"><span>${e(s.approval?.status !== "unreviewed" ? approvalLabels[s.approval.status] : statusLabel(displayedReview))}</span><span>›</span></div></button>`;
}
function songDetail(song, lib) {
  const r = reviewForDisplay(song, state.profile.aiMode),
    score = overall(r, state.profile);
  const saved = state.libraries.some((l) => l.songIds.includes(song.id));
  return `<article class="detail-panel"><div class="detail-header"><span class="eyebrow">SONG SPOTLIGHT</span><span class="status-badge">${e(statusLabel(r))}</span></div><h2>${e(song.title)}</h2><p class="author">${e(song.author)}</p><p class="version">${e(song.version)}</p><div class="detail-actions"><button class="button primary" data-action="save-song" data-id="${e(song.id)}">${saved ? "✓ Saved · manage libraries" : "+ Save to library"}</button><button class="button" data-action="add-to-plan" data-id="${e(song.id)}">Add to plan ›</button></div>${churchDecision(song)}<div class="rating-banner"><div class="overall-score">${score ?? "—"}<span>/10</span></div><div><strong>${e(recommendation(r, state.profile))}</strong><p>${score === null ? "Add an assessment to see a rating." : "Weighted to your theological profile."}</p><small>Unknown dimensions are excluded; this may be a partial score.</small></div></div><div class="score-grid">${Object.entries(
    dimensions,
  )
    .map(
      ([key, label]) =>
        `<div><div class="score-title">${e(label)}<strong>${r.scores[key] ?? "—"}</strong></div><meter min="0" max="10" value="${r.scores[key] ?? 0}" aria-label="${e(label)}"></meter><small>${r.scores[key] === null ? "Not assessed" : `${state.profile.weights[key]}% weight`}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="review-controls"><button class="text-button" data-action="edit-review" data-id="${e(song.id)}">✎ Edit assessment</button>${state.profile.aiMode === "manual" ? `<span class="muted">Human reviews only</span>` : `<button class="text-button" data-action="ai-review" data-id="${e(song.id)}">✦ ${state.profile.aiMode === "limited" ? "Get limited assistance" : "Draft with AI"}</button>`}</div><section class="detail-section"><h3>The assessment</h3><p>${e(r.summary || "No assessment yet. Start a manual review or draft one with AI.")}</p>${r.updatedAt ? `<small class="muted">Last edited ${e(new Date(r.updatedAt).toLocaleDateString())}${r.model ? ` · ${e(r.model)}` : ""}</small>` : ""}</section><section class="detail-section"><h3>What does it actually say?</h3>${list(r.claims)}</section><div class="detail-columns"><section class="detail-section"><h3>Good places in a service</h3><div class="tags">${tagList(r.uses)}</div></section><section class="detail-section"><h3>Themes</h3><div class="tags">${tagList(themesForDisplay(song, state.profile.aiMode))}</div></section></div><section class="detail-section"><h3>Scripture connections</h3>${list(r.scriptures)}<small class="muted">References are review suggestions; verify their context and the chosen song text.</small></section><section class="detail-section"><h3>Language & meaningful time</h3><p>${e(r.language || "Language not assessed.")}</p><p>${e(r.time || "Arrangement not assessed.")}</p></section><section class="detail-section"><h3>Musical considerations <span class="subtle-badge">${r.musical.startsWith("Not assessed") ? "Not assessed" : "Your notes"}</span></h3><p>${e(r.musical)}</p><div class="metadata"><span>Preferred key <strong>${e(r.key || "Not set")}</strong></span><span>Planning duration <strong>${e(r.minutes)} min</strong></span></div><small class="muted">Duration is a planning estimate, not a verified recording length.</small></section>${r.concerns.length ? `<section class="detail-section concern"><h3>Things to consider</h3>${list(r.concerns)}</section>` : ""}<section class="detail-section"><h3>Your notes</h3><p class="notes-text">${e(r.notes || "Add your thoughts, teaching notes, and arrangement choices in Edit assessment.")}</p></section>${r.assistance ? `<section class="detail-section"><h3>Limited assistance notes</h3><p>${e(r.assistance.summary)}</p><p>${e(r.assistance.language)}</p><p>${e(r.assistance.time)}</p><small class="muted">AI observations · verify against your supplied evidence. These did not change your ratings.</small></section>` : ""}${catalogComparison(song)}<section class="detail-section"><h3>Sources & provenance</h3>${r.sources.length ? `<ul class="source-list">${r.sources.map((s) => `<li>${/^https?:\/\//.test(s.url) ? `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.label)} ›</a>` : e(s.label)}</li>`).join("")}</ul>` : '<p class="muted">No external sources attached. AI drafts analyze supplied text without browsing.</p>'}<p class="muted">${r.status === "starter" ? "Starter editorial notes; source links are references for your verification, not a claim of live source review." : r.status === "ai" ? "AI-generated draft. Verify claims and Scripture links before church use." : "Your editable assessment; it does not imply independent verification."}</p>${r.previous ? '<small class="muted">Previous assessment preserved in exported data.</small>' : ""}</section>${lib ? `<button class="text-button danger" data-action="remove-library-song" data-id="${e(song.id)}">Remove from ${e(lib.name)}</button>` : ""}</article>`;
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
  return `<div class="page-heading"><div><div class="eyebrow">FROM REPERTOIRE TO SUNDAY</div><h1>Plan with purpose.</h1><p>Give each song, reading, and moment a meaningful place.</p></div><button class="button primary" data-action="new-plan">+ New worship plan</button></div>${
    !plan
      ? `<section class="empty full-empty"><span>▦</span><h2>Your first service starts here.</h2><p>Create a plan, add a Scripture reading, and choose songs that support its message.</p><button class="button primary" data-action="new-plan">Create a worship plan</button></section>`
      : `<div class="plan-layout"><aside class="plan-list">${state.plans.map((p) => `<button data-action="plan-select" data-id="${e(p.id)}" class="${p.id === plan.id ? "selected" : ""}"><strong>${e(p.title)}</strong><span>${e(p.date || "No date set")} · ${planDuration(p.items)} min</span></button>`).join("")}</aside><section class="plan-sheet"><div class="plan-sheet-header"><div><div class="eyebrow">${e(plan.date || "DATE TO BE CONFIRMED")}</div><h2>${e(plan.title)}</h2><p>${e(plan.theme || "Add a theme and sermon passage to guide your choices.")}</p>${plan.passage ? `<span class="tag">${e(plan.passage)}</span>` : ""}</div><div class="duration-total"><strong>${planDuration(plan.items)}</strong><span>minutes</span></div></div><button class="text-button" data-action="edit-plan">✎ Edit service details</button>${newSongs ? `<div class="plan-notice">${newSongs} song${newSongs === 1 ? "" : "s"} ${newSongs === 1 ? "has" : "have"} not been approved for your church. Confirm suitability before use.</div>` : ""}<ol class="service-items">${plan.items
          .map((item, i) => {
            const song = state.songs.find((s) => s.id === item.songId);
            return `<li><span class="item-number">${String(i + 1).padStart(2, "0")}</span><div class="service-item-content"><span class="eyebrow">${e(item.role || item.type)}</span><h3>${e(song?.title || item.title)}</h3><p>${e(item.notes || (song ? `${item.key || "Key not set"} · ${themesForDisplay(song, state.profile.aiMode).join(", ")}` : ""))}</p></div><span class="item-time">${e(item.minutes)} min</span><div class="item-buttons"><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="-1" aria-label="Move ${e(song?.title || item.title)} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="1" aria-label="Move ${e(song?.title || item.title)} down" ${i === plan.items.length - 1 ? "disabled" : ""}>↓</button><button class="icon-button" data-action="edit-item" data-id="${e(item.id)}" aria-label="Edit ${e(song?.title || item.title)}">✎</button><button class="icon-button danger" data-action="remove-item" data-id="${e(item.id)}" aria-label="Remove ${e(song?.title || item.title)}">×</button></div></li>`;
          })
          .join(
            "",
          )}</ol>${!plan.items.length ? '<div class="empty"><h3>Make room for the message.</h3><p>Add songs from Discover or your library, then readings, prayer, and the sermon.</p></div>' : ""}<div class="plan-buttons"><button class="button primary" data-action="nav" data-view="discover">+ Choose a song</button><button class="button" data-action="new-item">+ Reading, prayer, or other item</button><button class="text-button" data-action="export-plan">↓ Export plan</button></div></section></div>`
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
    )}</select></label><p class="muted">${e(aiModes[state.profile.aiMode].description)}</p><h3>Rating weights</h3><p class="muted">Relative weights are normalized automatically. Unassessed dimensions are excluded and clearly marked. A serious doctrinal concern always triggers review, regardless of the average.</p><div class="weight-fields">${Object.entries(
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
          `<label>${e(label)}<textarea name="${name}" rows="3" maxlength="6000">${e(value)}</textarea></label>`,
      )
      .join(
        "",
      )}<div class="form-columns"><label>Preferred key<input name="key" maxlength="30" value="${e(r.key)}" placeholder="e.g. D"></label><label>Planning duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(r.minutes)}" required></label></div><label>Source links · one HTTPS URL per line<textarea name="sources" rows="2">${e(r.sources.map((s) => s.url).join("\n"))}</textarea></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save assessment</button></div></form>`,
  );
}
function planDialog(plan = null) {
  modal(
    `<h2>${plan ? "Edit worship plan" : "A new worship plan"}</h2><form id="plan-form" ${plan ? `data-id="${e(plan.id)}"` : ""}><label>Service name<input name="title" maxlength="200" value="${e(plan?.title || "Sunday worship")}" required></label><label>Date<input name="date" type="date" value="${e(plan?.date || "")}"></label><label>Theme<input name="theme" maxlength="500" value="${e(plan?.theme || "")}" placeholder="The faithfulness of God"></label><label>Sermon passage<input name="passage" maxlength="200" value="${e(plan?.passage || "")}" placeholder="Psalm 46"></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">${plan ? "Save changes" : "Create plan"}</button></div></form>`,
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
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  event.preventDefault();
  const action = button.dataset.action,
    id = button.dataset.id;
  const song = state.songs.find((s) => s.id === id);
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
    modal(
      '<h2>Save an account backup?</h2><p>This uploads your current profile, notes, libraries and plans to your account and replaces its existing backup. It does not include sign-in credentials or supplied song lyrics.</p><p id="account-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="save-cloud">Save this workspace</button></div>',
    );
    document.querySelector("#save-cloud").onclick = async (event) => {
      event.target.disabled = true;
      try {
        await accounts.saveWorkspace(state);
        dialog.close();
        toast("Your workspace and profile are saved to your account.");
      } catch (error) {
        if (document.querySelector("#account-error"))
          document.querySelector("#account-error").textContent = error.message;
        event.target.disabled = false;
      }
    };
    return;
  }
  if (action === "cloud-load") {
    button.disabled = true;
    accounts
      .loadWorkspace()
      .then((saved) => {
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
    render();
    return;
  }
  if (action === "close") return dialog.close();
  if (action === "nav") {
    view = button.dataset.view;
    query = "";
    themeFilter = approvalFilter = "";
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
      `<h2>Add ${e(song.title)} to a plan</h2><form id="add-to-plan-form" data-id="${e(id)}"><label>Worship plan<select name="plan">${state.plans.map((p) => `<option value="${e(p.id)}" ${p.id === planId ? "selected" : ""}>${e(p.title)} ${e(p.date)}</option>`).join("")}</select></label><label>Service role<input name="role" maxlength="100" placeholder="Opening praise, response…" value="${e(reviewForDisplay(song, state.profile.aiMode).uses[0] || "")}"></label><div class="form-columns"><label>Key<input name="key" maxlength="30" value="${e(song.review.key)}"></label><label>Duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(song.review.minutes)}" required></label></div><div class="form-actions"><button class="button primary">Add to plan</button></div></form>`,
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
  if (action === "export-plan") {
    const p = getPlan();
    return download(
      "worship-plan.txt",
      [
        p.title,
        p.date,
        p.theme,
        p.passage,
        `Estimated duration: ${planDuration(p.items)} minutes`,
        "",
        ...p.items.map(
          (i, n) =>
            `${n + 1}. ${state.songs.find((s) => s.id === i.songId)?.title || i.title} — ${i.minutes} min\n   ${i.role || ""}${i.key ? ` · Key: ${i.key}` : ""}\n   ${i.notes || ""}`,
        ),
      ].join("\n"),
      "text/plain",
    );
  }
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
  render();
  const input = document.querySelector("#search");
  input.focus();
  try {
    input.setSelectionRange(position, position);
  } catch {}
});
document.addEventListener("change", (event) => {
  if (
    event.target.name === "statement" &&
    event.target.closest("#wizard-form")
  ) {
    event.target.form.elements.customStatement.required =
      event.target.value === "custom";
    return;
  }
  if (event.target.id === "theme-filter") themeFilter = event.target.value;
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
    query = "";
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
    p.items.push({
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
