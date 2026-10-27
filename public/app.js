import {retainEvaluation} from './evaluation-history.js';
import {openEvaluationHistory} from './evaluation-history-ui.js';
import {startPWA} from './pwa.js';
import {landingPage} from './landing.js';
import {VersionHistory,CloudHistory} from './version-history.js';
import {openVersionHistory} from './version-history-ui.js';
import {collectionArtwork,collectionIllustration} from './collection-art.js';
import {activeLens,lensList,switchLens,createLens,renameActiveLens} from './lenses.js';
import {catalogAnalysisFor,catalogAnalysisMarkup,catalogAnalysisCoverage} from "./catalog-analysis.js";
import {openWorkspaceEvaluation} from "./workspace-evaluation-ui.js";
import {loadArtistPortraits,portraitPages} from "./artist-portraits.js";
import {saveIndicator} from "./save-status.js";
import {createSongMatcher, completedPlanCounts, recordingRelease, sortCollectionSongs, findCollections, sortCollections} from "./collection-browse.js";
import {catalogRecordings} from "./catalog-recordings.js";
import {OrganizationClient,canEditOrganization,organizationRoles} from "./organizations.js";
import {openOrganizations} from "./organization-ui.js";
import {mergeWorkspaces} from "./workspace-merge.js";
import {songArtwork,hymnaryLink,addStarterLibraries,previousDecision} from "./song-visuals.js";
import {openPlanSongPicker,openPlanImport,insertionMarkup,insertPlanItems,movePlanItem} from "./plan-ui.js";
import {exportPlanJSON} from "./plan-import.js";
import { AutosaveQueue } from "./autosave.js";
import { ratingCriteria, activeCriteria, criterionScore, scoringLabels, scoringRubrics, scoreAnchors, suggestedCriteria, validateCriteria } from "./scoring.js";
import {
  detailAttributes,
  attributeOrder,
  isAiField,
  significant,
  specificScriptures,
} from "./song-details.js";
import { mcpEndpoint } from "./connection.js";
import { seedSongs } from "./seeds.js";
import { visibleSongs, retainedAiReview } from "./song-state.js";
import { objectiveFacts } from "./song-presentation.js";
import { MAX_SONG_FILE_BYTES, deviceFile, filePath } from "./song-files.js";
import { humanFirst } from "./song-state.js";
import { closestSongs } from "./fuzzy-search.js";
import { songResourceLinks } from "./song-resources.js";
import { recordingPlatforms, recordingLinks, recordingURL, validateRecordings } from "./recordings.js";
import { evaluationPrompt, parseEvaluation, applyEvaluation } from "./evaluation.js";
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
  existingMatch as findExistingMatch,
  importSongs,
  songsFromCSV,
} from "./collections.js";
import {
  copyPlan,
  planItemTitle,
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
  normalize,
  planDuration,
  validateReview,
} from "./core.js";

const STORE = "hymn-heart-v1";
let activeStore = STORE;
const versionHistory = new VersionHistory();
let historyRestorePending=false;
let browseCache=null;
function browseData() {
  const mode=effectiveProfile().aiMode;
  if(!browseCache||browseCache.state!==state||browseCache.mode!==mode) {
    const match=createSongMatcher(state.songs),visible=visibleSongs(state.songs);
    const project=song=>({...song,themes:themesForDisplay(song,mode)});
    browseCache={state,mode,match,visible,visibleIds:new Set(visible.map(s=>s.id)),
      pool:visible.map(project),catalog:allCatalogSongs.filter(song=>!match(song)?.blacklisted),
      outside:allCatalogSongs.filter(song=>!match(song)).map(project),counts:completedPlanCounts(state.plans),collections:new Map(),displayRecords:new Map()};
  }
  return browseCache;
}
const browsableSongs=()=>browseData().visible;
const availableCatalog=()=>browseData().catalog;
const existingMatch=(workspace,song)=>workspace===state?browseData().match(song):findExistingMatch(workspace,song);
const accounts = new AccountClient(siteConfig);
const organizationsClient = new OrganizationClient(accounts);
let activeOrganization=null,organizationList=[],organizationInvitations=[],organizationBase=null,organizationRevision=null;
let organizationLoadVersion=0,organizationSyncing=false,organizationServiceAvailable=false,pendingOrganizationRemote=null;
let accountReady = !accounts.session;
let accountCheckController = null, accountCheckVersion = 0, accountCheckSlow = false, accountConnectionMessage = "";
let wizardDraft = null;
let importDraft = null,
  collectionDepth = "all",
  songPage = 1,
  indexPageNumber = 1;
let collectionGroup = "", collectionQuery = "", collectionSort = "relevance";
const collectionOpen = new Set(), collectionPages = new Map(), collectionSettings=new Map();
let searchUpdateTimer=null;
const collectionOptions=id=>({depth:collectionDepth,sort:"alphabetical",query:"",...collectionSettings.get(id)});
let typeFilter = "",
  reviewFilter = "";
const PAGE_SIZE = 24,
  INDEX_PAGE_SIZE = 50;
const disclosureState = new Map();
const songTabs = [["details", "Details & files"], ["links", "Outside links"], ["evaluation", "Evaluation"]];
let detailTab = "details";
function activateSongTab(tab, focus = false) {
  if (!songTabs.some(([key]) => key === tab)) return;
  detailTab = tab;
  closeMenus();
  for (const button of app.querySelectorAll('[data-action="song-tab"]')) {
    const active = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus({preventScroll:true});
  }
  for (const panel of app.querySelectorAll('.song-tab-panel')) panel.hidden = panel.dataset.tab !== tab;
}
function revealSelectedSong() {
  const detail = app.querySelector('.detail-panel');
  const heading = detail?.querySelector('.song-detail-top');
  if (!heading) return;
  const rect = heading.getBoundingClientRect();
  if (innerWidth < 1000 || rect.top < 16 || rect.bottom > innerHeight)
    detail.scrollIntoView({block:"start", behavior:"instant"});
  detail.focus({preventScroll:true});
}
let suppressRailHover = false;
let guestOptIn = sessionStorage.getItem("faithful-guest-opt-in") === "1", unsavedForm = false, localSaveFailed = false;
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
    { id: "review", name: "Needs evaluation", songIds: [] },
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
let personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
let view = location.hash === "#home" ? "home" : location.hash === "#about" ? "about" : "discover",
  query = "",
  selected = null,
  libraryId = state.libraries[0]?.id,
  planId = state.plans[0]?.id,
  aiConfigured = false;
let timer;
let themeFilter = "", approvalFilter = "";
const defaultSongSorts = {evaluate:"rating",discover:"rating",library:"default",blacklist:"default"};
const songSorts = {...defaultSongSorts};
const currentSongSort = () => songSorts[view] || "rating";
function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove("show"), 4500);
}
const syncKey = () => activeStore + ":last-account-save";
function readSyncSignature() { try { return localStorage.getItem(syncKey()); } catch { return null; } }
function rememberAccountSave(signature) { try { localStorage.setItem(syncKey(), signature); } catch {} }
const autosave = new AutosaveQueue({
  save: snapshot => saveActiveWorkspace(snapshot),
  onState: result => {
    if (result.phase === "saving") accountSave.phase = "saving";
    else if (result.phase === "saved") {
      if(activeOrganization) {
        try {
          const merged=validateWorkspace(mergeWorkspaces(result.originalSnapshot,state,result.snapshot));
          const changed=workspaceSignature(merged)!==workspaceSignature(state);state=merged;cacheOrganization();
          if(changed)render();
          if(workspaceSignature(state)!==result.signature)autosave.enqueue(state);
        }catch{accountSave.phase="conflict";autosave.reset(false);updateSaveStrip();return;}
      }
      accountSave = { phase: "local", signature: result.signature, remoteAvailable: true };
      rememberAccountSave(result.signature);
    } else { accountSave.phase = result.phase; if (result.phase === "conflict") accountSave.remoteAvailable = true; }
    updateSaveStrip();
  },
});
function queueAccountSave() {
  if (accounts.user && activeStore !== STORE && accountReady && autosave.enabled && (autosave.running || autosave.pending || accountSave.signature !== workspaceSignature(state))) autosave.enqueue(state);
}
function rememberSignInMarkup(mode) {
  if(mode==='recover')return '';
  return `<label class="check-label remember-sign-in"><input id="remember-me" name="remember" type="checkbox" ${accounts.rememberMe?'checked':''}>Remember me</label><p class="sign-in-hint">Keep me signed in and remember my email on this browser. Leave unchecked on a shared device. Your password stays with your browser’s password manager.</p>${mode==='signup'?'':'<button class="text-button" type="button" data-action="saved-password">Use saved password</button>'}`;
}
function loginScreen(mode = "signin") {
  return `<main class="login-screen" data-screen="auth"><section class="profile-panel"><h1><a class="auth-home-link" href="#home" data-action="nav" data-view="home">Faithful Repertoire</a></h1><h2>${mode === "signup" ? "Create your account" : mode === "recover" ? "Reset your password" : "Sign in to keep your repertoire"}</h2>${accountConnectionMessage ? `<p class="connection-notice" role="status">${e(accountConnectionMessage)}</p>` : ""}<p>Your account keeps your songs, libraries and plans together. Changes save in this browser immediately and autosave to your account when connected.</p>${accounts.configured ? `<form id="auth-form" name="login" method="post" autocomplete="on" data-mode="${mode}"><label for="login-email">Email</label><input id="login-email" name="email" type="email" value="${e(accounts.rememberedEmail)}" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required>${mode !== "recover" ? `<label for="login-password">Password</label><input id="login-password" name="password" type="password" ${mode==="signin"&&accounts.rememberedEmail?"autofocus":""} autocomplete="${mode === "signup" ? "new-password" : "current-password"}" ${mode === "signup" ? 'minlength="10"' : ""} required>` : ""}${rememberSignInMarkup(mode)}<p id="account-error" role="alert"></p><button type="submit" class="button primary">${mode === "signup" ? "Create account" : mode === "recover" ? "Send reset email" : "Sign in"}</button></form><div class="account-links">${mode !== "signin" ? '<button class="text-button" data-action="account" data-mode="signin">Return to sign in</button>' : ""}<button class="text-button" data-action="account" data-mode="signup">Create an account</button><button class="text-button" data-action="account" data-mode="recover">Forgot password?</button></div>` : '<p>Account sign-in is unavailable in this configuration. No private token is required to use the browser workspace.</p>'}<p><a class="about-link about-entry" href="#about" data-action="nav" data-view="about">About Faithful Repertoire</a></p><details><summary>Existing browser-only work or offline use</summary><p>Browser-only work stays on this device and is not saved to an account. Your existing guest workspace has been preserved.</p><button class="button" data-action="guest-opt-in">Use browser-only workspace</button></details></section></main>`;
}
function settingRow(label, description, action, { value = "", view: targetView = "", id = "", disabled = false } = {}) {
  const content = `<span class="setting-copy"><span class="setting-label">${e(label)}</span>${description ? `<span class="setting-description">${e(description)}</span>` : ""}</span><span class="setting-trailing">${value ? `<span class="setting-value">${e(value)}</span>` : ""}${action ? '<span class="setting-chevron" aria-hidden="true">›</span>' : ""}</span>`;
  return action ? `<button class="setting-row" aria-label="${e(label)}" data-action="${action}" ${targetView ? `data-view="${targetView}"` : ""} ${id ? `id="${id}"` : ""} ${disabled ? "disabled" : ""}>${content}</button>` : `<div class="setting-row">${content}</div>`;
}
function settingsPage() {
  const signedIn = Boolean(accounts.user && activeStore !== STORE);
  return `<div class="settings-page"><div class="page-heading"><h1>Settings</h1></div><section aria-labelledby="settings-account-heading"><h2 id="settings-account-heading" class="settings-group-title">Account & saving</h2><div class="settings-group">${signedIn ? settingRow("Signed in", accounts.user.email, "account") + settingRow("Organizations", "Shared libraries, plans and member access", "organizations") + settingRow("Change password", "", "change-password") : settingRow("Sign in", "Keep your repertoire across devices", "account") }<div class="setting-row"><span class="setting-copy"><span class="setting-label">${signedIn ? (activeOrganization ? "Shared sync" : "Account autosave") : "Browser saving"}</span><span id="settings-save-status" class="setting-description" role="status">${signedIn ? e(activeOrganization?organizationSaveLabel():saveLabel(accountSave,state)) : "Saved on this device only"}</span></span><span class="setting-trailing"><span id="settings-save-value" class="setting-value">${signedIn ? (accountSave.phase === "saving" ? "Saving…" : autosave.enabled ? "On" : "Paused") : "On"}</span></span></div>${settingRow("Version history", "Preview and restore earlier workspace versions", "version-history")}${signedIn ? settingRow("Save now / retry", "", "retry-autosave", {id:"settings-save-now",disabled:["saving","checking","conflict","review"].includes(accountSave.phase)}) + settingRow("Review saved account workspace", "", "cloud-load") : ""}</div><p class="settings-footnote">Changes save in this browser after each action. Account uploads pause when offline or when another device has saved a newer copy.</p></section><section aria-labelledby="settings-install-heading"><h2 id="settings-install-heading" class="settings-group-title">App installation</h2><div class="settings-group"><button class="setting-row" data-pwa-install>Install app</button></div><p class="settings-footnote">Use a dedicated home-screen or desktop window. Sign-in, cloud sync and account files need a connection.</p></section><section aria-labelledby="settings-preferences-heading"><h2 id="settings-preferences-heading" class="settings-group-title">Preferences</h2><div class="settings-group">${settingRow("Edit church profile", "", "setup-profile", {value:denominations[state.profile.denomination]})}${settingRow("Evaluation criteria", "", "nav", {view:"profile",value:activeCriteria(state.profile).length+" active"})}<button class="setting-row" role="switch" aria-label="AI labels" aria-checked="${effectiveProfile().aiLabels}" data-action="toggle-ai-labels"><span class="setting-copy"><span class="setting-label">AI labels</span><span class="setting-description">Identify generated ratings and content</span></span><span class="setting-switch" aria-hidden="true"></span></button></div></section><details class="settings-advanced" data-disclosure-key="settings:advanced"><summary>Advanced account tools</summary><div class="settings-group">${settingRow("Backup & restore", "Download or restore a workspace copy", "backup")}${signedIn ? settingRow("Retry profile sync", "", "sync-profile") + settingRow("Private organization drafts", "Unsynced copies kept in this browser", "organization-drafts") + settingRow("Previous church-use decisions", "Move previous decisions into optional libraries", "starter-libraries") + (!activeOrganization ? settingRow("Import previous browser-only workspace", "Review before replacing account data", "copy-browser") : "") + settingRow("ChatGPT connections", "Manage read-only access", "chatgpt-connections") : ""}</div><p class="settings-footnote">Keep an independent backup. Browser storage and account uploads cannot guarantee recovery after every device or network failure.</p></details></div>`;
}
function accountLoadingScreen() {
  return `<main class="account-startup" data-screen="account-loading" aria-busy="true"><div class="account-startup-content"><div class="startup-brand">Faithful Repertoire</div><div class="startup-indicator" aria-hidden="true"></div><h1>Opening your repertoire</h1><p role="status">${accountCheckSlow ? "Your connection is taking a little longer." : "Checking your saved sign-in…"}</p><p class="startup-caption">${accountCheckSlow ? "You can open your saved browser copy while account sync is paused." : "Your saved songs and plans will be ready shortly."}</p>${accountCheckSlow ? '<div class="startup-actions"><button class="button primary" data-action="open-local-account">Open saved browser copy</button><button class="text-button" data-action="retry-account-check">Try again</button></div>' : ""}</div></main>`;
}
async function startAccountCheck(confirmation = null) {
  const version = ++accountCheckVersion, hadSession = Boolean(accounts.user);
  accountCheckController?.abort();
  const controller = new AbortController(); accountCheckController = controller;
  accountReady = false; accountCheckSlow = false; accountConnectionMessage = "";
  autosave.reset(false);
  if (accounts.user && activeStore !== STORE) { accountSave.phase = "checking"; updateSaveStrip(); }
  render();
  const slowTimer = setTimeout(() => {
    if (version !== accountCheckVersion || accountReady) return;
    accountCheckSlow = true;
    if (accounts.user && activeStore === STORE) render();
  }, 4000);
  const deadline = setTimeout(() => controller.abort(new DOMException("Account check timed out", "TimeoutError")), 12000);
  const finishSignedOut = () => {
    if (!accounts.user && hadSession) {
      guestOptIn = false; sessionStorage.removeItem("faithful-guest-opt-in");
      if (activeStore !== STORE) switchWorkspace();
    }
  };
  try {
    const type = confirmation
      ? await accounts.acceptConfirmation(confirmation, {signal:controller.signal})
      : await accounts.restoreSession({signal:controller.signal});
    if (version !== accountCheckVersion) return;
    clearTimeout(slowTimer); clearTimeout(deadline);
    accountReady = true; accountCheckSlow = false;
    finishSignedOut();
    if (accounts.user) {
      if (activeStore === STORE) switchWorkspace(accounts.user);
      await loadAccountProfile();
      try {
        await refreshOrganizations();
        if(!activeOrganization) {
          const last=localStorage.getItem(`faithful-repertoire-last-organization:${accounts.user.id}`),org=organizationList.find(o=>o.id===last);
          if(org)await switchOrganization(org);
        }
      }catch{organizationServiceAvailable=false;}
    }
    if (version !== accountCheckVersion) return;
    if (type === "recovery") modal('<h2>Choose a new password</h2><form id="password-form"><label>New password<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><p id="account-error" role="alert"></p><div class="form-actions"><button class="button primary">Update password</button></div></form>');
    render();
    if(organizationInvitations.length && (confirmation || new URLSearchParams(location.search).has("invitation")))await organizationDialog();
  } catch (error) {
    if (version !== accountCheckVersion) return;
    accountReady = true; accountCheckSlow = false;
    finishSignedOut();
    if (accounts.user) {
      if (activeStore === STORE) switchWorkspace(accounts.user);
      accountSave.phase = "error"; autosave.reset(false);
      accountConnectionMessage = "Your saved browser copy is open. Account sync is paused; retry the connection in Settings.";
    } else accountConnectionMessage = "Your saved sign-in could not be confirmed. Sign in again to open your account.";
    render();
    if (accounts.user) toast(accountConnectionMessage);
  } finally { clearTimeout(slowTimer); clearTimeout(deadline); }
}

function historyContext() {
  return {key:activeStore,owner:accounts.user?.id || null,organization:activeOrganization?.id || null,signedIn:Boolean(accounts.user && activeStore!==STORE)};
}
function historyContextValid(token) {
  return token.key===activeStore && token.owner===(accounts.user?.id || null) && token.organization===(activeOrganization?.id || null);
}
function captureBeforeWrite(next) {
  try {
    const previous=localStorage.getItem(activeStore);
    if(previous && previous!==JSON.stringify(next))versionHistory.capture(activeStore,JSON.parse(previous)).catch(()=>{});
  } catch { /* Current saving must still work if history storage is unavailable. */ }
}
async function prepareHistory(token) {
  if(!historyContextValid(token))throw new Error('The active workspace changed. Open version history again.');
  if(token.signedIn && autosave.enabled && (autosave.running || autosave.pending))await autosave.flush();
  if(!historyContextValid(token))throw new Error('The active workspace changed. Open version history again.');
}
function requireHistorySync(token) {
  if(token.signedIn && (!accountReady || !autosave.enabled || ['error','conflict','review','checking'].includes(accountSave.phase) || accountSave.signature!==workspaceSignature(state)))
    throw new Error('Finish syncing or resolve the saved account copy before restoring. Your current workspace is preserved.');
}
function requireCurrentHistoryPreview(token,signature) {
  if(!historyContextValid(token) || workspaceSignature(state)!==signature)throw new Error('The workspace changed after the preview. Open the version and review its changes again.');
  const cached=localStorage.getItem(token.key);
  if(cached && workspaceSignature(JSON.parse(cached))!==signature)throw new Error('Another tab changed this workspace. Reload its saved browser copy, then preview again.');
}
async function saveHistoryCheckpoint(label,cloudAvailable,token) {
  await prepareHistory(token);
  if(!editableWorkspace())throw new Error('This organization is view only.');
  await versionHistory.capture(token.key,state,{label,force:true});
  if(!historyContextValid(token))throw new Error('The active workspace changed.');
  if(token.signedIn && cloudAvailable) {
    requireHistorySync(token);
    try {await new CloudHistory(accounts).capture(token.organization,label);}
    catch {throw new Error('The version was saved on this device. The account checkpoint failed; check your connection and retry.');}
  }
}
async function restoreHistoryWorkspace(...args) {
  if(historyRestorePending)throw new Error('A workspace restore is already running.');
  historyRestorePending=true;
  try{return await applyHistoryRestore(...args);}finally{historyRestorePending=false;}
}
async function applyHistoryRestore(workspace,expectedSignature,cloudAvailable,token,{preserveAI=true}={}) {
  await prepareHistory(token);
  if(!editableWorkspace())throw new Error('This organization is view only.');
  if(unsavedForm || hasUnsubmittedEdits())throw new Error('Save or discard your form edits before restoring.');
  requireCurrentHistoryPreview(token,expectedSignature);
  requireHistorySync(token);
  const restored=syncCatalog(validateWorkspace(workspace));
  // Restoring an old profile must not turn AI content back on without consent.
  if(preserveAI && !activeOrganization)Object.assign(restored.profile,personalAI);
  await versionHistory.capture(token.key,state,{label:'Before restoring a version',force:true});
  requireCurrentHistoryPreview(token,expectedSignature);
  const enabled=autosave.enabled;
  let result;
  try {
    if(token.signedIn) {
      autosave.reset(false);
      if(cloudAvailable)result=await new CloudHistory(accounts).apply(token.organization,restored,token.organization?null:accounts.workspaceVersion,token.organization?organizationRevision:null);
      else if(token.organization)result=await organizationsClient.save(token.organization,organizationRevision,restored);
      else result=await accounts.saveWorkspace(restored);
      if(!historyContextValid(token))throw new Error('The active workspace changed. The restore completed for the previous workspace; reopen it to load its saved copy.');
      if(token.organization){organizationRevision=result.revision;organizationBase=clone(restored);saveOrganizationBase();}
      else accounts.workspaceVersion=result.updatedAt;
      accountSave={phase:'local',signature:workspaceSignature(restored),remoteAvailable:true};
      rememberAccountSave(accountSave.signature);
    }
    // After a successful account restore, keep the returned data in memory even
    // if localStorage fills up. The server copy must not be silently overwritten.
    if(token.signedIn) {
      state=restored;
      try{localStorage.setItem(activeStore,JSON.stringify(state));localSaveFailed=false;}catch{localSaveFailed=true;}
    } else {
      localStorage.setItem(activeStore,JSON.stringify(restored));state=restored;localSaveFailed=false;
    }
    if(!activeOrganization)personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
    autosave.reset(enabled);resetSelection();dialog.close();render();
    toast(localSaveFailed?'Version restored to your account. Browser storage is full; download a backup.':'Version restored. The previous workspace is saved in version history.');
    if(token.signedIn && !token.organization && !cloudAvailable) {
      try {await accounts.saveProfile(restored.profile);}
      catch {if(historyContextValid(token))toast('Workspace restored. Profile sync failed; retry profile sync in Settings.');}
    }
  } catch(error) {
    if(historyContextValid(token))autosave.reset(enabled);
    if(error.code==='40001' || error.name==='WorkspaceConflictError')throw new Error('Another device saved a newer copy. Sync the account workspace, then preview again.');
    throw error;
  }
}
function persist() {
  browseCache=null;
  if(!activeOrganization)personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
  if(activeOrganization&&!editableWorkspace()&&organizationBase&&workspaceSignature(state)!==workspaceSignature(organizationBase)) {state=clone(organizationBase);toast("This organization is view only.");return false;}
  try {
    captureBeforeWrite(state);
    localStorage.setItem(activeStore, JSON.stringify(state));
    localSaveFailed = false;
    queueAccountSave();
    updateSaveStrip();
    return true;
  } catch {
    localSaveFailed = true;
    toast(
      "Browser storage is unavailable or full. Export a backup before leaving.",
    );
    return false;
  }
}
function commitWorkspace(next) {
  if(!editableWorkspace()){toast("This organization is view only.");return false;}
  try {
    captureBeforeWrite(next);
    localStorage.setItem(activeStore, JSON.stringify(next));
    state = next;
    if(!activeOrganization)personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
    localSaveFailed = false;
    queueAccountSave();
    updateSaveStrip();
    return true;
  } catch {
    localSaveFailed = true;
    toast(
      "Browser storage is full or unavailable. The current workspace is preserved; export a backup before adding more data.",
    );
    return false;
  }
}
function modal(html) {
  unsavedForm = false;
  dialog.classList.remove("workspace-evaluation-dialog");
  if(dialog.getAttribute("aria-labelledby")==="scope-dialog-title")dialog.removeAttribute("aria-labelledby");
  dialog.innerHTML = `<div class="modal-top"><span class="eyebrow">FAITHFUL REPERTOIRE</span><button type="button" data-action="close" class="icon-button" aria-label="Close dialog">×</button></div>${html}`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
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
      starter: "Catalog evaluation",
      manual: "Your evaluation",
      ai: "AI evaluation · verify before use",
    }[review.status] || "Not evaluated"
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
    )}</select></label><label>Evaluation<select id="review-filter" aria-label="Evaluation"><option value="">All evaluations</option><option value="unreviewed" ${reviewFilter === "unreviewed" ? "selected" : ""}>Not evaluated</option><option value="assessed" ${reviewFilter === "assessed" ? "selected" : ""}>Has an evaluation</option></select></label><label>Theme<select id="theme-filter" aria-label="Theme"><option value="">All themes</option>${themes.map((t) => `<option value="${e(t)}" ${t === themeFilter ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label><label>Sort by<select id="sort-order" aria-label="Sort by">${[
    ["default", "Catalog order"],
    ["title", "Title A–Z"],
    ["rating", "Highest rating first"],
    ["substance", "Theological substance"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === currentSongSort() ? "selected" : ""}>${e(label)}</option>`,
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
    (effectiveProfile().aiMode !== "full" && song.catalogReview.status === "ai")
  )
    return "";
  const base = song.catalogReview;
  if (base.status === "unreviewed")
    return '<details class="catalog-comparison"><summary>Catalog title record</summary><p class="muted">This catalog entry identifies a title and attribution or associated recording. No lyric assessment, musical measurement, source verification or church approval is implied.</p></details>';
  const displayed = reviewForDisplay(song, effectiveProfile().aiMode);
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
    `<h2>Review ${e(song.title)}</h2><p class="muted">This is your church’s decision, separate from the song’s score. Confirm the exact version and any concerns before approving it.</p>${reviewForDisplay(song, effectiveProfile().aiMode).concern === "serious" ? '<p class="approval-warning">This assessment identifies a serious doctrinal concern. Explain your reasoning if you approve its use.</p>' : ""}<form id="approval-form" data-id="${e(song.id)}"><label>Church-use decision<select name="status" aria-label="Church-use decision">${Object.entries(
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
      reviewForDisplay(song, effectiveProfile().aiMode).concern === "serious");
}
function profilePrompt() {
  if(!editableWorkspace())return "";
  if (view === "profile") return "";
  if (!state.profile.setupComplete)
    return `<section class="onboarding-prompt"><div><span class="eyebrow">START WITH YOUR CHURCH</span><h2>Make this repertoire your own.</h2><p>Choose your denomination, a statement of faith, and how much AI content you want to see.</p></div><button class="button primary" data-action="setup-profile">Build my profile</button></section>`;
  return "";
}
function wizard(step = 1) {
  if (step === 1) wizardDraft = withProfileDefaults(effectiveProfile());
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
  selected = null;
  Object.assign(songSorts,defaultSongSorts);
  libraryId = state.libraries[0]?.id;
  planId = state.plans[0]?.id;
  view = location.hash === "#home" ? "home" : location.hash === "#about" ? "about" : "discover";
  query = themeFilter = approvalFilter = "";
  typeFilter = reviewFilter = "";
  songPage = indexPageNumber = 1;
  indexRules = [];
  indexQuery = "";
  activeIndexViewId = "";
  importDraft = null;
}
function switchWorkspace(user = null) {
  activeOrganization=null;organizationBase=null;organizationRevision=null;pendingOrganizationRemote=null;organizationLoadVersion++;
  if(!user){organizationList=[];organizationInvitations=[];}
  autosave.reset(false);
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
  personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
  resetSelection();
  persist();
  render();
  return true;
}
async function saveAccountProfile() {
  if(activeOrganization){await savePersonalAIPreferences();return true;}
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
  if(activeOrganization){await syncOrganization(true);return;}
  if (!accounts.user) return;
  const owner = accounts.user.id,
    store = activeStore;
  const profile = await accounts.loadProfile();
  if (accounts.user?.id !== owner || activeStore !== store) return;
  if (profile && !state.profile.setupComplete) {
    state.profile = withProfileDefaults(profile);
    personalAI={aiMode:state.profile.aiMode,aiLabels:state.profile.aiLabels};
    persist();
    render();
  }
  await checkAccountCopy();
}
function saveStrip(open = document.querySelector('#account-save-strip')?.open) {
  const signedIn=Boolean(accounts.user&&activeStore!==STORE);
  const indicator=saveIndicator(accountSave,state,{signedIn,formDirty:unsavedForm||hasUnsubmittedEdits(),localFailed:localSaveFailed,viewOnly:activeOrganization&&!editableWorkspace()});
  const detail=indicator.detail||(signedIn?(activeOrganization?organizationSaveLabel():saveLabel(accountSave,state)):'Saved in this browser only. Sign in to save across devices.');
  return `<details class="account-save-strip save-${indicator.state}" data-save-state="${indicator.state}" id="account-save-strip" ${open?'open':''}><summary><span class="save-status-icon" aria-hidden="true">${indicator.icon}</span><span role="status" aria-live="polite">${indicator.label}</span></summary><div class="sync-menu-content"><span>${e(detail)}</span><div>${signedIn?`<button class="text-button" data-action="retry-autosave" ${['saving','checking','conflict','review'].includes(accountSave.phase)?'disabled':''}>Save now / retry</button>${accountSave.remoteAvailable?'<button class="text-button" data-action="cloud-load">Review saved account workspace</button>':''}`:'<button class="text-button" data-action="export">Export backup</button>'}</div></div></details>`;
}
function updateSaveStrip() {
  const strip = document.querySelector("#account-save-strip");
  if (strip) strip.outerHTML = saveStrip();
  const status = document.querySelector("#settings-save-status"), value = document.querySelector("#settings-save-value"), save = document.querySelector("#settings-save-now");
  if (status && accounts.user) status.textContent = activeOrganization ? organizationSaveLabel() : saveLabel(accountSave,state);
  if (value && accounts.user) value.textContent = accountSave.phase === "saving" ? "Saving…" : autosave.enabled ? "On" : "Paused";
  if (save) save.disabled = ["saving","checking","conflict","review"].includes(accountSave.phase);
}
async function checkAccountCopy() {
  if(activeOrganization){await syncOrganization(true);return;}
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
    const localSignature = workspaceSignature(state), baseline = readSyncSignature();
    const canSave = !saved || signature === localSignature || signature === baseline;
    accountSave = { initialSignature: localSignature, phase: canSave ? "local" : "review", signature: signature === localSignature ? signature : baseline, remoteAvailable: Boolean(saved) };
    autosave.reset(canSave);
    if (signature === localSignature) rememberAccountSave(signature);
    if (canSave && saved && signature !== localSignature) queueAccountSave();
  } catch {
    if (accounts.user?.id === owner && activeStore === store)
      { accountSave.phase = "error"; autosave.reset(false); }
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
      `<h2>Your account</h2><p>${e(accounts.user.email)}</p><p role="status">${e(saveLabel(accountSave,state))}</p><div class="account-buttons"><button class="button" data-action="nav" data-view="settings">Settings</button><button class="button" data-action="signout">Sign out</button></div>`,
    );
  const enabled = accounts.configured;
  if (!guestOptIn && !accounts.user && enabled) { app.innerHTML = loginScreen(mode); return; }
  modal(
    `<h2>${mode === "signup" ? "Create your account" : mode === "recover" ? "Reset your password" : "Sign in to your repertoire"}</h2><p class="muted">${enabled ? "Your account can store your profile and a backup of your workspace across browsers." : "Accounts are being prepared. The hosted authentication service is not configured yet. You can use the full browser workspace and build your profile now."}</p><form id="auth-form" name="login" method="post" autocomplete="on" data-mode="${mode}"><label>Email<input id="login-email" name="email" type="email" value="${e(accounts.rememberedEmail)}" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required ${enabled ? "" : "disabled"}></label>${mode !== "recover" ? `<label>Password<input id="login-password" name="password" type="password" ${mode==="signin"&&accounts.rememberedEmail?"autofocus":""} ${mode === "signup" ? 'minlength="10"' : ""} autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required ${enabled ? "" : "disabled"}></label>` : ""}${rememberSignInMarkup(mode)}<p id="account-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary" ${enabled ? "" : "disabled"}>${mode === "signup" ? "Create account" : mode === "recover" ? "Send reset email" : "Sign in"}</button></div></form><div class="account-links"><button class="text-button" data-action="account" data-mode="${mode === "signup" ? "signin" : "signup"}">${mode === "signup" ? "Already have an account? Sign in" : "Create an account"}</button><button class="text-button" data-action="account" data-mode="recover">Forgot password?</button></div>`,
  );
}
function confirmCloudRestore(saved, title = "Load your account backup?") {
  const restored = syncCatalog(saved.workspace);
  const owner = accounts.user?.id,
    store = activeStore;
  modal(
    `<h2>${e(title)}</h2><p>${restored.songs.length} songs · ${restored.libraries.length} libraries · ${restored.plans.length} plans</p><p class="muted">This replaces the current account workspace in this browser. Download a backup first if you want to keep it.</p><button class="text-button" data-action="export">Download current workspace</button><p id="account-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button class="button primary" id="apply-cloud">Load this backup</button></div>`,
  );
  document.querySelector("#apply-cloud").onclick = async () => {
    try {
      if (accounts.user?.id !== owner || activeStore !== store)
        throw new Error("Account changed");
      await versionHistory.capture(store,state,{label:"Before loading an account backup",force:true});
      if(accounts.user?.id !== owner || activeStore !== store)throw new Error("The active workspace changed.");
      localStorage.setItem(activeStore, JSON.stringify(restored));
      state = restored;
      accountSave = {
        phase: "local",
        signature: saved.updatedAt ? workspaceSignature(state) : null,
        remoteAvailable: Boolean(saved.updatedAt),
      };
      if (saved.updatedAt) rememberAccountSave(workspaceSignature(state));
      autosave.reset(true);
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
    settings: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    blacklist: '<circle cx="12" cy="12" r="8"/><path d="m6 6 12 12"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]}</svg>`;
}
function cancelSearchUpdate() {clearTimeout(searchUpdateTimer);searchUpdateTimer=null;}
function scheduleSearchUpdate(kind,id=null) {
  cancelSearchUpdate();const store=activeStore,currentView=view;
  const region=kind==='songs'?app.querySelector('.song-workspace'):kind==='collections'?app.querySelector('.collection-list'):app.querySelector(`[data-collection="${id}"] .collection-song-results`);region?.setAttribute('aria-busy','true');
  searchUpdateTimer=setTimeout(()=>{
    searchUpdateTimer=null;if(activeStore!==store||view!==currentView)return;
    if(kind==='collection'){updateCollectionResults(id);return;}
    if(kind==='collections'){
      app.querySelector('.collection-search-results').innerHTML=collectionMatchesMarkup();
      app.querySelector('.collection-list').innerHTML=collectionListMarkup();app.querySelector('.collection-list').setAttribute('aria-busy','false');
      hydrateCollectionPortraits();restrictOrganizationControls();return;
    }
    const oldSelected=selected,oldDetail=app.querySelector('.detail-panel');
    const template=document.createElement('template');template.innerHTML=songWorkspace();
    const fresh=template.content;
    app.querySelector('.result-count').textContent=fresh.querySelector('.result-count').textContent;
    app.querySelector('.catalog-search-results').replaceChildren(...fresh.querySelector('.catalog-search-results').childNodes);
    const workspace=fresh.querySelector('.song-workspace');
    if(oldSelected===selected&&oldDetail&&!oldDetail.classList.contains('empty')&&!workspace.querySelector('.detail-panel').classList.contains('empty'))workspace.querySelector('.detail-panel').replaceWith(oldDetail);
    app.querySelector('.song-workspace').replaceWith(workspace);restrictOrganizationControls();
  },60);
}
document.addEventListener('compositionend',event=>{
  if(event.target.id==='search'){query=event.target.value;songPage=1;scheduleSearchUpdate('songs');}
  else if(event.target.id==='collection-search'){collectionQuery=event.target.value;scheduleSearchUpdate('collections');}
  else if(event.target.dataset.collectionSearch){const id=event.target.dataset.collectionSearch;collectionSettings.set(id,{...collectionSettings.get(id),query:event.target.value});collectionPages.set(id,1);scheduleSearchUpdate('collection',id);}
});
function aboutPage() {
  return `<article class="about-page"><h1>About Faithful Repertoire</h1><p class="about-intro">Helping worship leaders think deeply about the words they lead, with practical tools for thoughtful preparation.</p><h2>From words to worship planning</h2><p>Discover songs and collections, then bring a selected song into Evaluate. Set your evaluation parameters, study the words, and record a personal evaluation or review an optional AI draft. Human evaluations remain primary.</p><ol class="about-flow"><li><strong>Evaluation parameters</strong> — define your convictions and the criteria that matter to your church.</li><li><strong>Initial evaluation</strong> — consider the words personally, with optional AI assistance and explicit review of its claims and sources.</li><li><strong>Libraries</strong> — record your own decisions about readiness, concerns and context.</li><li><strong>Plans and evaluation</strong> — create the order yourself, then examine an existing plan against your chosen purpose.</li></ol><p>You choose songs, approvals and service order. AI reports describe selected songs, libraries and existing plans; they do not select replacements or build setlists.</p><h2>Recommended use</h2><ul class="recommended-use"><li><strong>Build a working repertoire.</strong> Discover a song, read its evaluation and sources, listen to your chosen version, and add your own assessment. Keep useful songs in a library you can return to each week.</li><li><strong>Organize by occasion and people.</strong> Make Christmas and Easter libraries, or separate groups for youth, college, children and Sunday school. A song can belong to several libraries without duplicating its record.</li><li><strong>Record your level of approval.</strong> Use libraries such as Ready to use, Needs review and Use with context. Add notes about wording, teaching or arrangements that affect your decision.</li><li><strong>Use a lens for each setting.</strong> Keep one set of criteria and evaluations for Sunday congregational worship and another for an intimate prayer service. Switch the analysis lens to view the same songs, libraries and plans with that purpose in mind.</li><li><strong>Prepare a service.</strong> Assemble and order the plan yourself, record keys and arrangements, then evaluate the existing plan for its themes, Scripture context and participation. Save recurring structures as plan templates.</li><li><strong>Look back across a season or year.</strong> In Plans, open the evaluation tool and select a group of existing plans—for example, the last year's services. Ask which themes recur, what receives little attention and where evidence is missing. Use smaller groups when a year's records exceed the request limit. Completed-plan history also shows how often songs have been used.</li><li><strong>Review a whole library through another lens.</strong> Switch lenses, choose the library in the evaluation tool and state your purpose. Use the read-only ChatGPT connection for saved personal libraries, or prepare and review a copied request. A report is a snapshot for reflection; applying song evaluations is a separate action.</li><li><strong>Keep your work portable.</strong> Export backups, save to your account across devices, and use an organization workspace when a team needs shared libraries and plans.</li></ul><h2>About the Developer</h2><p>William Booth is a senior at Baylor University studying church music. He is passionate about worship and communicating truth clearly through worship songs. He created Faithful Repertoire as a tool useful to himself and others, hoping to bless worship leaders and ultimately glorify God.</p><p>For questions, feature ideas and updates, contact <a href="mailto:williambooth0803@gmail.com">williambooth0803@gmail.com</a>.</p><button class="button" data-action="nav" data-view="discover">${accounts.user || guestOptIn ? "Return to Discover" : "Return to sign in"}</button></article>`;
}
function lensSelector() {
  return `<label class="lens-switch"><span>Analysis lens</span><select id="analysis-lens" aria-label="Analysis lens">${lensList(state).map(lens=>`<option value="${e(lens.id)}" ${lens.id===(state.activeLensId||'main')?'selected':''}>${e(lens.name)}</option>`).join('')}</select></label>`;
}
function workspaceTabs() {
  const tabs = ["discover","collections"].includes(view) ? [["discover","Songs"],["collections","Collections"]]
    : ["evaluate","index","profile"].includes(view) ? [["evaluate","Song workspace"],["index","Song index"],["profile","Evaluation criteria"]]
    : ["library","blacklist"].includes(view) ? [["library","Libraries"],["blacklist","No Approval"]] : [];
  return tabs.length ? `<nav class="workspace-tabs" aria-label="Workspace sections">${tabs.map(([id,label])=>`<button class="workspace-tab ${view===id?'selected':''}" data-action="nav" data-view="${id}" ${view===id?'aria-current="page"':''}>${label}</button>`).join("")}</nav>` : "";
}
function render() {
  cancelSearchUpdate();browseCache=null;
  if (["home","about"].includes(view) && !accounts.user && !guestOptIn) {
    app.innerHTML = `<main class="public-site"><nav class="public-site-nav" aria-label="Website navigation"><a class="public-brand" href="#home" data-action="nav" data-view="home" aria-label="Faithful Repertoire home"><span aria-hidden="true">✣</span> Faithful Repertoire</a><div><a class="about-link" href="#about" data-action="nav" data-view="about" ${view==="about"?'aria-current="page"':""}>About</a><button class="button" data-action="nav" data-view="discover">Sign in</button></div></nav>${view==="home"?landingPage(false):aboutPage()}</main>`;
    return;
  }
  if (accounts.user && activeStore === STORE) {
    app.innerHTML = accountLoadingScreen();
    return;
  }
  if (!accounts.user && !guestOptIn) {
    if (!app.querySelector('[data-screen="auth"]')) app.innerHTML = loginScreen();
    return;
  }
  const listScroll = app.querySelector(".song-list")?.scrollTop || 0;
  for (const node of app.querySelectorAll("details[data-disclosure]"))
    disclosureState.set(node.dataset.disclosure, node.open);
  const count = new Set(state.libraries.flatMap((x) => x.songIds).filter(id => browseData().visibleIds.has(id))).size;
  app.innerHTML = `<aside class="sidebar ${suppressRailHover ? "suppress-hover" : ""}"><a class="brand" aria-label="Faithful Repertoire" title="Faithful Repertoire home" href="#home" data-action="nav" data-view="home"><span class="brand-mark">✣</span><span class="brand-name">Faithful<br>Repertoire</span></a><nav aria-label="Main navigation">${[
    ["discover", "", "Discover"],
    ["evaluate", "", "Evaluate"],
    ["library", "", "Libraries"],
    ["plans", "", "Plans"],
  ]
    .map(
      ([id, icon, text]) =>
        `<button aria-label="${e(text)}" data-action="nav" data-view="${id}" class="nav-item ${(view === id || (id === "discover" && view === "collections") || (id === "evaluate" && ["index","profile"].includes(view)) || (id === "library" && view === "blacklist")) ? "active" : ""}" ${(view === id || (id === "discover" && view === "collections") || (id === "evaluate" && ["index","profile"].includes(view)) || (id === "library" && view === "blacklist")) ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${navigationIcon(id === "evaluate" ? "index" : id)}</span><span class="nav-label">${text}</span>${id === "library" ? `<b>${count}</b>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><button class="text-button" data-action="export">↓ Export your data</button></div></aside><main><header class="topbar"><span><a class="header-home" href="#home" data-action="nav" data-view="home" aria-label="Faithful Repertoire home"><span aria-hidden="true">✣</span> Faithful Repertoire</a> <span class="divider">/</span> ${e({ discover: "Discover", index: "Song index", collections: "Collections", library: "Libraries", plans: "Plans", evaluate: "Evaluate", profile: "Evaluation criteria", settings: "Settings", blacklist: "No Approval", home: "Home", about: "About" }[view])}</span><div class="topbar-actions"><a class="about-link" href="#about" data-action="nav" data-view="about" ${view === "about" ? 'aria-current="page"' : ""}>About</a><div class="topbar-selectors">${lensSelector()}${accounts.user&&activeStore!==STORE?`<label class="workspace-switch"><span class="workspace-label-small">Workspace</span><select id="workspace-select" aria-label="Workspace"><option value="personal">Personal</option></select></label>`:""}</div>${saveStrip()}<button class="button" data-action="account">${accounts.user && activeStore !== STORE ? "My account" : "Sign in"}</button><button class="button settings-gear" aria-label="Settings" title="Settings" data-action="nav" data-view="settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></header><div class="page">${activeStore === STORE ? '<p class="guest-banner" role="status">Browser-only workspace · saved on this device. <button class="text-button" data-action="account">Sign in to save across devices</button></p>' : ""}${activeOrganization?`<p class="organization-banner" role="status"><strong>${e(activeOrganization.name)}</strong> · ${e(organizationRoles[activeOrganization.role])}${editableWorkspace()?" · Shared changes sync automatically":" · Changes are disabled in this workspace"}</p>`:""}${["home","about","settings"].includes(view) ? "" : profilePrompt()}${workspaceTabs()}${view === "evaluate" ? `<p class="catalog-analysis-coverage">Catalog text analysis: <strong>${catalogAnalysisCoverage.reviewed} expanded drafts</strong> of ${catalogAnalysisCoverage.total} records · ${catalogAnalysisCoverage.unresolved + catalogAnalysisCoverage.missing + catalogAnalysisCoverage.partial + catalogAnalysisCoverage.textScans} need further text or identity review.</p>` : ""}${["discover", "evaluate", "library", "blacklist"].includes(view) ? songWorkspace() : view === "index" ? indexPage() : view === "collections" ? collectionsPage() : view === "plans" ? plansPage() : view === "settings" ? settingsPage() : view === "home" ? landingPage(true) : view === "about" ? aboutPage() : profilePage()}</div><footer class="site-footer"><span>Faithful Repertoire</span><a class="about-link" href="#about" data-action="nav" data-view="about">About Faithful Repertoire</a></footer></main>`;
  for (const node of app.querySelectorAll("details")) {
    const key = node.dataset.disclosureKey || (node.closest(".detail-panel")
      ? "song:" + selected + ":" + (node.dataset.attribute || node.className)
      : node.closest(".topbar")
        ? "header:" + node.className
        : view + ":" + node.className);
    node.dataset.disclosure = key;
    if (disclosureState.has(key)) node.open = disclosureState.get(key);
  }
  const resultList = app.querySelector(".song-list");
  if (resultList) resultList.scrollTop = listScroll;
  updateWorkspaceSwitcher();restrictOrganizationControls();
  hydrateCollectionPortraits();
  updateSaveStrip();
}
function songWorkspace() {
  const isLibrary = view === "library";
  const isBlacklist = view === "blacklist";
  const lib =
    state.libraries.find((x) => x.id === libraryId) || state.libraries[0];
  const pool = isLibrary ? browseData().pool.filter(song=>lib?.songIds.includes(song.id))
    : isBlacklist ? state.songs.filter(song=>song.blacklisted).map(song=>({...song,themes:themesForDisplay(song,effectiveProfile().aiMode)})) : browseData().pool;
  // Stable search relevance keeps exact title matches ahead of broader matches.
  // Within each relevance group, use the sort chosen for this page.
  const songs = searchSongs(discoverSongs(
    searchSongs(pool,query).filter(s =>
      (!typeFilter || (s.category || "other") === typeFilter) &&
      (!reviewFilter || (reviewFilter === "unreviewed"
        ? reviewForDisplay(s,effectiveProfile().aiMode).status === "unreviewed"
        : reviewForDisplay(s,effectiveProfile().aiMode).status !== "unreviewed"))),
    {theme:themeFilter,approval:approvalFilter,sort:currentSongSort()},
    effectiveProfile(),
  ), query);
  const available =
    query.trim() && !isLibrary && !isBlacklist
      ? searchSongs(browseData().outside, query)
      : [];
  songPage = Math.max(
    1,
    Math.min(songPage, Math.ceil(songs.length / PAGE_SIZE) || 1),
  );
  const shown = songs.slice((songPage - 1) * PAGE_SIZE, songPage * PAGE_SIZE);
  const nearby = query.trim() && !searchSongs(pool, query).length && !available.length
    ? closestSongs(isLibrary || isBlacklist ? pool : [...pool, ...browseData().outside], query)
    : [];
  const song =
    state.songs.find(
      (s) => s.id === selected && shown.some((x) => x.id === s.id),
    ) || shown[0];
  if (song) selected = song.id;
  return `<div class="page-heading"><div><h1>${isBlacklist ? "No Approval" : isLibrary ? "Your song libraries" : view === "evaluate" ? "Evaluate a song" : "Discover songs"}</h1></div><button class="button primary" data-action="${isLibrary ? "new-library" : "new-song"}">+ ${isLibrary ? "New library" : "Add a song"}</button></div>${isLibrary ? `${libraryToolbar(lib)}<div class="library-tabs">${state.libraries.map((l) => `<button class="${l.id === lib?.id ? "selected" : ""}" data-action="library-select" data-id="${e(l.id)}">${e(l.name)} <span>${l.songIds.filter(id => browseData().visibleIds.has(id)).length}</span></button>`).join("")}</div>` : isBlacklist || view === "evaluate" ? "" : `<div class="collection-prompt"><button class="text-button" data-action="nav" data-view="collections">Browse collections</button></div>`}<div class="search-row"><label class="search-box"><span>⌕</span><input id="search" type="search" value="${e(query)}" placeholder="Search by title, writer, or theme…" aria-label="Search songs"></label><span class="result-count" role="status" aria-live="polite">${songs.length} song${songs.length === 1 ? "" : "s"}</span></div>${isBlacklist ? '<p class="muted">Dismissed songs appear only here. Restore a song to see it elsewhere again.</p>' : ""}<div class="catalog-search-results">${catalogMatches(available)}</div><details class="filter-panel"><summary>Filters & sorting</summary>${discoveryControls(pool)}</details><div class="song-workspace" aria-busy="false"><section class="song-list" aria-label="Song results" tabindex="0">${songs.length ? shown.map((s) => songCard(s, s.id === song.id)).join("") : `<div class="empty"><span>♫</span><h3>${query ? "No matching songs" : "A repertoire starts with one song."}</h3><p>${query ? "Try another title or add a song to review." : "Find a song in Discover and save it here."}</p><button class="button" data-action="${query ? "new-song" : "nav"}" data-view="discover">${query ? "Add a song" : "Discover songs"}</button></div>${closestMatches(nearby)}`}${pagination("song", songPage, songs.length, PAGE_SIZE)}<div class="catalog-note">${isLibrary ? "Organize decisions with libraries; evaluations remain separate." : `${state.songs.length} workspace songs · ${allCatalogSongs.length} records in Collections · includes AI drafts and unrated titles.`}</div></section>${song ? songDetail(song, isLibrary ? lib : null) : '<section class="detail-panel empty"><h2>Your next song belongs here.</h2><p>Save an existing song or add one to begin a review.</p></section>'}</div>`;
}
function closestMatches(songs) {
  if (!songs.length) return "";
  return `<section class="closest-matches" aria-label="Closest matches"><h3>Closest title/artist matches</h3><ul>${songs.map(song => `<li><button class="text-button" data-action="${state.songs.some(s => s.id === song.id) ? "index-open" : "catalog-open"}" data-id="${e(song.id)}"><strong>${e(song.title)}</strong><small>${e(song.author)}</small></button></li>`).join("")}</ul></section>`;
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
  return `<nav class="pagination" aria-label="${kind === "song" ? "Song" : "Index"} pages"><span>${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count}</span><button class="button" data-action="${kind}-page" data-id="1" ${page === 1 ? "disabled" : ""}>First</button><button class="button" data-action="${kind}-page" data-id="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button><label>Page<input class="page-jump" aria-label="${kind === "song" ? "Song" : "Index"} page" data-page-kind="${kind}" type="number" min="1" max="${pages}" value="${page}"></label><span>of ${pages}</span><button class="button" data-action="${kind}-page" data-id="${page + 1}" ${page === pages ? "disabled" : ""}>Next</button><button class="button" data-action="${kind}-page" data-id="${pages}" ${page === pages ? "disabled" : ""}>Last</button></nav>`;
}
function collectionRecords(pack, depth=collectionOptions(pack.id).depth) {
  const cache=browseData(),key=pack.id+":"+depth;
  if(!cache.collections.has(key))cache.collections.set(key,collectionSongs(pack,depth).filter(song=>!cache.match(song)?.blacklisted));
  return cache.collections.get(key);
}
function collectionDisplayRecords(pack) {
  const cache=browseData();
  return collectionRecords(pack).map(record=>{
    if(!cache.displayRecords.has(record.id)) {
      const song=existingMatch(state,record)||record;
      cache.displayRecords.set(record.id,{...song,id:record.id,themes:themesForDisplay(song,effectiveProfile().aiMode),recordings:song.recordings??catalogRecordings[record.id]??[]});
    }
    return cache.displayRecords.get(record.id);
  });
}
function collectionRows(pack) {
  const options=collectionOptions(pack.id),counts=new Map();
  for(const record of collectionRecords(pack)){const original=existingMatch(state,record);counts.set(record.id,browseData().counts.get(original?.id||record.id)||0);}
  return sortCollectionSongs(searchSongs(collectionDisplayRecords(pack),options.query),options.sort,counts);
}
function collectionSongResults(pack) {
  const options=collectionOptions(pack.id),songs=collectionRows(pack),pages=Math.ceil(songs.length/30)||1;
  const page=Math.min(collectionPages.get(pack.id)||1,pages),shown=songs.slice((page-1)*30,page*30);
  const explanation=options.sort==='popularity'?'Popularity is the number of uses in completed plans in this workspace. No global chart ranking is assumed.'
    : ['oldest','newest'].includes(options.sort)?'Dates are the earliest supplied release of your matched Apple recordings, which may be reissues. Unknown dates follow dated songs.':'Songs are listed alphabetically by title.';
  return `<p class="collection-sort-help muted">${explanation}</p><p class="muted" role="status">${songs.length} matching songs · ${depthLabels[options.depth]}</p><ul class="collection-songs">${shown.map(song=>{
    const release=recordingRelease(song),original=existingMatch(state,song);
    return `<li>${coverMarkup(song,'collection-song-art')}<div><button class="text-button collection-song-title" data-action="collection-song-action" data-song-action="index-open" data-id="${e(song.id)}">${e(song.title)}</button><small>${e(song.author)}</small>${['oldest','newest'].includes(options.sort)?`<small>Recording release: ${e(release||'Unknown')}</small>`:options.sort==='popularity'?`<small>${browseData().counts.get(original?.id||song.id)||0} completed plan uses</small>`:''}</div><details class="more-menu"><summary aria-label="Actions for ${e(song.title)}">Actions</summary><div class="menu-items">${[['save-song','Add to library'],['add-to-plan','Add to plan'],['blacklist-song','Move to No Approval'],['song-recordings','Listen / recording links'],['song-files','Add files to song'],['new-arrangement','Add arrangement'],['edit-review','Add human evaluation'],['edit-index','Edit song details'],...(effectiveProfile().aiMode==='manual'?[]:[['chatgpt-evaluation','Generate AI evaluation']])].map(([action,label])=>`<button class="text-button" data-action="collection-song-action" data-song-action="${action}" data-id="${e(song.id)}">${label}</button>`).join('')}</div></details></li>`;
  }).join('')||'<li>No matching songs at this depth. Try All or clear this collection’s search.</li>'}</ul>${pages>1?`<nav class="pagination" aria-label="${e(pack.name)} song pages"><span>${(page-1)*30+1}–${Math.min(page*30,songs.length)} of ${songs.length}</span><button class="button" data-action="collection-page" data-id="${e(pack.id)}" data-page="${page-1}" ${page===1?'disabled':''}>Previous</button><label>Page<input aria-label="${e(pack.name)} page" type="number" min="1" max="${pages}" value="${page}" data-collection-page="${e(pack.id)}"></label><span>of ${pages}</span><button class="button" data-action="collection-page" data-id="${e(pack.id)}" data-page="${page+1}" ${page===pages?'disabled':''}>Next</button></nav>`:''}`;
}
function collectionBody(pack) {
  const options=collectionOptions(pack.id);
  return `<p class="muted">${e(pack.description)}</p><div class="collection-local-controls"><label>Search this collection<input type="search" aria-label="Search songs in ${e(pack.name)}" data-collection-search="${e(pack.id)}" value="${e(options.query)}" placeholder="Song title or artist"></label><label>Depth<select data-collection-depth="${e(pack.id)}" aria-label="${e(pack.name)} depth">${Object.entries(depthLabels).map(([id,label])=>`<option value="${id}" ${options.depth===id?'selected':''}>${label}</option>`).join('')}</select></label><label>Sort<select data-collection-sort="${e(pack.id)}" aria-label="${e(pack.name)} song sort">${[['alphabetical','Title · A–Z'],['popularity','Popularity in your plans'],['oldest','Recording release · oldest first'],['newest','Recording release · newest first']].map(([id,label])=>`<option value="${id}" ${options.sort===id?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="collection-bulk-actions"><button class="button primary" data-action="collection-import-all" data-id="${e(pack.id)}">Import all songs</button><button class="button" data-action="collection-preview" data-id="${e(pack.id)}">Preview & import</button></div><p class="muted">Preview & import uses the selected depth. Import all songs includes the entire collection. Search and sorting change this view only.</p><div class="collection-song-results">${collectionSongResults(pack)}</div>`;
}
let portraitObserver=null,portraitActive=0;
const portraitQueue=[],portraitPending=new WeakSet(),portraitResults=new Map();
function collectionPortraitMarkup(pack) {
  const images=collectionArtwork(pack);
  return `<div class="collection-portrait ${pack.group==='Artists'?'artist-portrait':'collection-emblem'}" ${pack.group==='Artists'?`data-artist-portrait="${e(pack.id)}"`:''}>${collectionIllustration(pack)}${images.length?`<div class="collection-album-mosaic mosaic-${images.length}" title="Recording artwork from this collection">${images.map(photo=>`<img src="${e(photo.url)}" alt="" width="160" height="160" loading="lazy" decoding="async" referrerpolicy="no-referrer">`).join('')}</div>`:''}</div>`;
}
function paintPortrait(node,portraits) {
  if(!node.isConnected||!portraits.length)return;
  const heading=node.closest('summary').querySelector('.collection-heading');
  let loaded=false;
  for(const photo of portraits.slice(0,2)) {
    const image=document.createElement('img');image.src=photo.url;image.alt=photo.subject;image.width=320;image.height=200;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.hidden=true;
    image.onload=()=>{
      if(!loaded) {
        loaded=true;node.classList.add('has-portrait');
        for(const fallback of node.querySelectorAll('.collection-album-mosaic,.collection-illustration'))fallback.remove();
        heading.querySelector('.portrait-credit')?.remove();
      }
      image.hidden=false;
      let credit=heading.querySelector('.portrait-credit');
      if(!credit){credit=document.createElement('small');credit.className='portrait-credit';heading.append(credit);}
      const link=document.createElement('a');link.href=photo.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Photo: '+photo.credit+' · '+photo.license;link.title=photo.subject+' · '+photo.credit+' · '+photo.license;credit.append(link,document.createTextNode(' '));
    };
    image.onerror=()=>image.remove();node.append(image);
  }
}
async function runPortraitQueue() {
  while(portraitActive<2&&portraitQueue.length) {
    const {node,pack}=portraitQueue.shift();if(!node.isConnected)continue;
    portraitActive++;
    loadArtistPortraits(pack.name).then(photos=>{portraitResults.set(pack.id,photos);paintPortrait(node,photos);}).finally(()=>{portraitActive--;runPortraitQueue();});
  }
}
function hydrateCollectionPortraits() {
  portraitObserver?.disconnect();
  if(view!=='collections')return;
  for(const image of app.querySelectorAll('.collection-album-mosaic img')) {
    const remove=()=>{const mosaic=image.parentElement;image.remove();if(!mosaic?.querySelector('img'))mosaic?.remove();};
    image.addEventListener('error',remove,{once:true});
    if(image.complete&&!image.naturalWidth)remove();
  }
  portraitObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting) {
      portraitObserver.unobserve(entry.target);const node=entry.target,id=node.dataset.artistPortrait,pack=songCollections.find(pack=>pack.id===id);
      if(portraitResults.has(id)){paintPortrait(node,portraitResults.get(id));continue;}
      if(!pack||!portraitPages(pack.name).length||portraitPending.has(node))continue;
      portraitPending.add(node);portraitQueue.push({node,pack});runPortraitQueue();
    }
  },{rootMargin:'180px'});
  for(const node of app.querySelectorAll('[data-artist-portrait]')) {
    if(portraitResults.has(node.dataset.artistPortrait))paintPortrait(node,portraitResults.get(node.dataset.artistPortrait));
    else portraitObserver.observe(node);
  }
}
function collectionListMarkup() {
  const packs=sortCollections(findCollections(songCollections,collectionDisplayRecords,collectionQuery,collectionGroup),collectionDisplayRecords,collectionQuery,collectionSort);
  return packs.map(pack=>`<details class="collection-row collection-dropdown collection-card" data-collection="${e(pack.id)}" data-disclosure-key="collection:${e(pack.id)}" ${collectionOpen.has(pack.id)?'open':''}><summary>${collectionPortraitMarkup(pack)}<div class="collection-heading"><small class="collection-kicker">${e(pack.subtitle||"Artist collection")}</small><h2>${e(pack.name)}</h2><small class="collection-subtitle">${e(pack.group)} · ${depthLabels[collectionOptions(pack.id).depth]}</small></div><div class="collection-count"><strong>${collectionRecords(pack).length}</strong><span>songs</span></div></summary><div class="collection-body">${collectionOpen.has(pack.id)?collectionBody(pack):''}</div></details>`).join('')||'<p>No collections match. Try All depth or another title, artist, era or style.</p>';
}
function collectionMatchesMarkup() {
  if(!collectionQuery.trim())return '';
  const unique=new Map();for(const pack of songCollections.filter(pack=>!collectionGroup||pack.group===collectionGroup))for(const song of collectionDisplayRecords(pack))unique.set(song.id,song);
  const matches=searchSongs([...unique.values()],collectionQuery);
  if(!matches.length)return '';
  return `<section class="collection-title-matches" aria-label="Matching songs"><h2>Matching songs</h2><p class="muted">${matches.length} matches within the selected collection depths${matches.length>20?' · showing the first 20; enter more of the title to narrow your search':''}.</p><ul class="collection-songs">${matches.slice(0,20).map(song=>`<li>${coverMarkup(song,'collection-song-art')}<div><strong>${e(song.title)}</strong><small>${e(song.author)}</small></div><button class="button" data-action="collection-song-action" data-song-action="index-open" data-id="${e(song.id)}">Open song</button></li>`).join('')}</ul></section>`;
}
function collectionsPage() {
  return `<div class="page-heading"><div><h1>Song collections</h1><p>Find familiar songs, explore an artist, or follow a theme.</p></div><div class="index-heading-actions"><a class="button" href="./review.html" target="_blank" rel="noopener">Review shortlist · flashcards ↗</a><button class="button primary" data-action="import-entire-catalog">Import entire catalog</button><button class="button" data-action="csv-import">Import your song list</button></div></div><div class="collection-browse-controls"><label>Search collections and songs<input id="collection-search" type="search" value="${e(collectionQuery)}" placeholder="Song title, artist, era or style"></label><label>Browse by<select id="collection-group" aria-label="Browse by"><option value="">All collections</option>${['Artists','Eras','Styles','Themes'].map(group=>`<option ${collectionGroup===group?'selected':''}>${group}</option>`).join('')}</select></label><label>Sort collections<select id="collection-order" aria-label="Sort collections"><option value="relevance" ${collectionSort==='relevance'?'selected':''}>Relevance</option><option value="alphabetical" ${collectionSort==='alphabetical'?'selected':''}>Name · A–Z</option></select></label><label>Default depth<select id="collection-depth" aria-label="Collection depth">${Object.entries(depthLabels).map(([id,label])=>`<option value="${id}" ${id===collectionDepth?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="index-help">${availableCatalog().length} available song/version records · songs in No Approval are hidden. Recording associations and unrated titles still need evaluation.</p><div class="collection-search-results">${collectionMatchesMarkup()}</div><div class="collection-list" aria-busy="false">${collectionListMarkup()}</div>`;
}
function updateCollectionResults(id) {
  const pack=songCollections.find(pack=>pack.id===id),row=app.querySelector(`[data-collection="${id}"]`);
  if(row&&pack){row.querySelector('.collection-song-results').innerHTML=collectionSongResults(pack);row.querySelector('.collection-song-results').setAttribute('aria-busy','false');row.querySelector('.collection-count strong').textContent=collectionRecords(pack).length;row.querySelector('.collection-subtitle').textContent=pack.group+' · '+depthLabels[collectionOptions(pack.id).depth];restrictOrganizationControls();}
}
function previewCollection(pack, depth = collectionOptions(pack.id).depth, bulk = false) {
  importDraft = {
    packId: pack.id,
    depth,
    songs: collectionSongs(pack, depth).filter(s => !existingMatch(state, s)?.blacklisted),
    bulk,
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
    }<label>Save into<select name="target" aria-label="Import target"><option value="__new__" ${draft.target === "__new__" ? "selected" : ""}>A new library</option>${state.libraries.map((l) => `<option value="${e(l.id)}" ${draft.target === l.id ? "selected" : ""}>${e(l.name)}</option>`).join("")}</select></label><label>New library name<input name="name" maxlength="100" value="${e(draft.name)}" ${draft.target === "__new__" ? "required" : "disabled"}></label>${draft.bulk ? '<p>All visible songs will be imported. Existing reviews and notes are preserved.</p>' : `<div class="selection-actions"><button type="button" class="text-button" data-action="import-select-all">Select all</button><button type="button" class="text-button" data-action="import-select-none">Select none</button></div><div class="import-song-list">${draft.songs.map((s) => `<label class="import-song"><input type="checkbox" name="songs" value="${e(s.id)}" checked><span><strong>${e(s.title)}</strong><small>${e(s.author)}</small><small>${existingMatch(state, s) ? "Existing record · your review will be kept" : s.review.status === "ai" ? "AI draft rating · verify text" : "Catalog assessment"}</small></span></label>`).join("")}</div>`}<p class="index-help">Use your own libraries to organize decisions. No lyrics are downloaded and no AI requests are sent. CSV title-list imports do not restore ratings; use a JSON backup to transfer complete reviews.</p><p id="import-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">${draft.bulk ? "Import all songs" : "Import selected songs"}</button></div></form>`,
  );
}
function libraryToolbar(lib) {
  return `${effectiveProfile().aiMode === "full" ? `<button class="button" data-action="library-audit" data-id="${e(lib?.id)}">Run Library Audit</button><button class="button" data-action="evaluation-history" data-scope-id="library:${e(lib?.id)}">Evaluation History</button>` : `<p class="muted">Library interpretation requires Full AI content in your rating profile.</p>`}<details class="library-toolbar"><summary>Library tools</summary><div><button class="text-button" data-action="starter-libraries">Starter libraries</button><button class="text-button" data-action="rename-library" data-id="${e(lib?.id)}">Rename</button><button class="text-button" data-action="export-library" data-id="${e(lib?.id)}">Export song list</button><button class="text-button" data-action="csv-import">Import song list</button><button class="text-button danger" data-action="delete-library" data-id="${e(lib?.id)}" ${state.libraries.length === 1 ? "disabled" : ""}>Delete library</button></div></details>`;
}
function songCard(s, active) {
  const displayedReview = reviewForDisplay(s, effectiveProfile().aiMode);
  const score = overall(displayedReview, state.profile);
  const themes=themesForDisplay(s,effectiveProfile().aiMode).slice(0,2);
  return `<button class="song-card ${active ? "selected" : ""}" data-action="song-select" data-id="${e(s.id)}"><span class="song-card-art">${coverMarkup(s,"card-art") || '<span class="song-symbol" aria-hidden="true">♫</span>'}</span><div class="song-card-copy"><h3>${e(s.title)}</h3><p>${e(s.author)}</p><div class="song-card-meta"><span class="card-status">${e(statusLabel(displayedReview))}</span>${themes.length?`<span class="tags">${tagList(themes)}${aiLabel(s,displayedReview,"themes")}</span>`:""}</div></div><span class="card-score"><span>${score ?? "—"}<small>/10</small></span>${aiLabel(s,displayedReview,"scores")}</span></button>`;
}
function recordingMarkup(song, manage = true) {
  return `<div class="recording-links">${recordingLinks(song).map(link => `<a class="button" data-provider="${link.provider}" data-recording-kind="${link.exact ? "saved" : "search"}" href="${e(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${e(link.exact ? `Listen on ${link.platform}${link.label ? ": " + link.label : ""}` : `Find recordings on ${link.platform}`)}"><span>${e(link.platform)} ↗</span><small>${link.exact ? "Saved recording" : "Search recordings"}</small></a>`).join("")}</div>${manage ? `<button class="text-button" data-action="song-recordings" data-id="${e(song.id)}">Manage recording links</button>` : ""}`;
}
function recordingsDialog(song) {
  modal(`<h2>Recordings for ${e(song.title)}</h2><p class="muted">Save links to the versions you use.</p>${recordingMarkup({ ...song, recordings: [] }, false)}<ul class="saved-recordings">${(song.recordings || []).map(r => `<li><div><a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.label || song.title)}</a><small>${e(recordingPlatforms[r.provider])}</small></div>${song.recordings.find(first => first.provider === r.provider)?.id === r.id ? '<span class="tag">Preferred link</span>' : `<button class="text-button" data-action="prefer-recording" data-id="${e(song.id)}" data-recording="${e(r.id)}">Make preferred</button>`}<button class="text-button danger" data-action="remove-recording" data-id="${e(song.id)}" data-recording="${e(r.id)}">Remove link</button></li>`).join("")}</ul><form id="recording-form" data-id="${e(song.id)}"><label>Platform<select name="provider" aria-label="Recording platform">${Object.entries(recordingPlatforms).map(([key,label]) => `<option value="${key}">${label}</option>`).join("")}</select></label><label>Recording link<input name="url" type="url" maxlength="2000" required placeholder="Paste a song or video link"></label><label>Version label<input name="label" maxlength="300" placeholder="Official audio · album version · acoustic performance"></label><p id="recording-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Close</button><button class="button primary">Save recording link</button></div></form>`);
}
function aiLabel(song, review, field) {
  return effectiveProfile().aiLabels && isAiField(song, review, field)
    ? '<span class="ai-mark" role="img" aria-label="AI generated" title="AI-generated content · review before use">AI</span>'
    : "";
}
function evaluationBox(song, review, secondary = false) {
  const hidden = new Set(song.detailLayout?.hidden || []), ai = review.status === "ai";
  const title = ai ? secondary ? "AI evaluation · secondary" : "AI evaluation" : "Your evaluation";
  const scores = activeCriteria(state.profile).map(c => [c.id, c.label]).filter(([key]) => criterionScore(review, key) != null);
  const bodies = {
    summary: significant(review.summary) ? `<h3>Assessment</h3><p>${e(review.summary)}</p>` : "",
    claims: review.claims?.length && !review.model?.startsWith("Prewritten lyric-evidence") ? `<h3>Claims</h3>${list(review.claims)}` : "",
    concerns: review.concerns?.length ? `<h3>Concerns</h3>${list(review.concerns)}` : "",
    uses: review.uses?.length ? `<h3>Service uses</h3>${tagList(review.uses)}` : "",
    scriptures: specificScriptures(review.scriptures).length ? `<h3>Scripture connections</h3>${list(specificScriptures(review.scriptures))}` : "",
    language: significant(review.language) ? `<h3>Language</h3><p>${e(review.language)}</p>` : "",
    time: significant(review.time) ? `<h3>Meaningful time</h3><p>${e(review.time)}</p>` : "",
    themes: (review.themes || (secondary ? song.catalogThemes : themesForDisplay(song, effectiveProfile().aiMode)))?.length ? `<h3>Themes</h3>${tagList(review.themes || (secondary ? song.catalogThemes : themesForDisplay(song, effectiveProfile().aiMode)))}` : "",
  };
  const content = attributeOrder(song).filter(key => !hidden.has(key)).map(key => bodies[key] ? `<section data-attribute="${e(key)}">${bodies[key]}${aiLabel(song, review, key)}</section>` : "").join("");
  const score = overall(review, state.profile);
  return `<details class="evaluation-box ${secondary ? "secondary-evaluation" : "primary-evaluation"}" data-disclosure-key="evaluation:${e(song.id)}:${secondary ? "secondary" : "primary"}" ${!ai && !secondary ? "open" : ""}><summary><span>${title}${effectiveProfile().aiLabels && ai ? '<span class="ai-mark" aria-label="AI generated">AI</span>' : ""}</span>${score !== null && !hidden.has("rating") ? `<strong>${score}/10</strong>` : ""}</summary><div class="evaluation-content">${ai ? '<p class="muted">AI draft · verify the exact lyric version.</p>' : ""}${!hidden.has("rating") && scores.length ? `<div class="score-grid">${scores.map(([key,label]) => `<div class="score-title">${e(label)} ${aiLabel(song,review,"scores")}<strong>${e(criterionScore(review, key))}/10</strong></div>`).join("")}</div>` : ""}${content || '<p class="muted">No evaluation entered yet.</p>'}${ai ? catalogAnalysisMarkup(catalogAnalysisFor(song,effectiveProfile().aiMode),e,hidden) : ""}${secondary ? `<button class="text-button" data-action="delete-ai-evaluation" data-id="${e(song.id)}">Delete AI evaluation</button>` : ""}</div></details>`;
}
function objectiveDetails(song) {
  return `<dl class="objective-facts">${objectiveFacts(song).map(fact => `<div><dt>${e(fact.label)}</dt><dd><span class="attribution-display">${fact.field === "author" ? `<button class="text-button inline-attribution" data-action="inline-attribution" data-id="${e(song.id)}" aria-label="Edit artist / attribution">${e(fact.value)} <span aria-hidden="true">✎</span></button>` : e(fact.value)}</span>${fact.provenance && fact.provenance.confidence !== "confirmed" ? `<span class="fact-confidence" title="${e(fact.provenance.source)}">${fact.provenance.confidence === "ai" && effectiveProfile().aiLabels ? '<span class="ai-mark" aria-label="AI generated">AI</span>' : fact.field === "minutes" ? "Estimate" : "Guess"}</span><button class="text-button" data-action="confirm-fact" data-id="${e(song.id)}" data-field="${fact.field}">Confirm</button><button class="text-button" data-action="edit-fact" data-id="${e(song.id)}" data-field="${fact.field}">Edit</button>` : ""}</dd></div>`).join("")}</dl>`;
}
function songDetail(song, lib) {

  const visible = reviewForDisplay(song, effectiveProfile().aiMode),
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
  const ratingMarkup = `<div class="rating-banner"><div class="overall-score">${score ?? "—"}${aiLabel(song, r, "scores")}<span>/10</span></div><div><strong>${e(recommendation(r, state.profile))}</strong><p>${r.status === "ai" ? "AI evaluation" : score === null ? "Not evaluated" : "Your weighted rating"}</p></div></div><details class="rating-details"><summary>Rating breakdown</summary><div class="score-grid">${Object.entries(
    dimensions,
  )
    .filter(([key]) => r.scores[key] != null)
    .map(
      ([key, label]) =>
        `<div><div class="score-title">${e(label)}${aiLabel(song, r, "scores")}<strong>${r.scores[key]}</strong></div><meter min="0" max="10" value="${r.scores[key]}" aria-label="${e(label)}"></meter></div>`,
    )
    .join("")}</div></details>`;
  const attrs = {
    recordings: section("recordings", "Listen · recordings", recordingMarkup(song), true),
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
      themesForDisplay(song, effectiveProfile().aiMode).length
        ? `<div class="tags">${tagList(themesForDisplay(song, effectiveProfile().aiMode))}</div>`
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
    usage: section("usage", "Plan history", usageSection(song)),
    notes: section(
      "notes",
      "Your notes",
      significant(r.notes) ? `<p class="notes-text">${e(r.notes)}</p>` : "",
    ),
    sources: section(
      "sources",
      "Sources & provenance",
      `<p class="muted">${r.status === "ai" ? "AI evaluation." : r.status === "starter" ? "Catalog assessment; verify the chosen edition." : "Your editable assessment."}</p>${r.sources?.length ? `<ul>${r.sources.map((x) => `<li><a href="${e(x.url)}" target="_blank" rel="noopener noreferrer">${e(x.label)}</a></li>`).join("")}</ul>` : ""}${catalogComparison(song)}`,
    ),
  };
  for (const metric of song.metadata?.custom || [])
    attrs["custom:" + metric.name] = section(
      "custom:" + metric.name,
      metric.name,
      `<p>${e(metric.value)}</p>`,
    );
  const hidden = new Set(song.detailLayout?.hidden || []);
  const details = `${objectiveDetails(song)}${song.version ? `<p class="version">${e(song.version)}</p>` : ""}${attributeOrder(song)
    .filter(k => !hidden.has(k) && (["musical", "arrangements", "text", "usage", "notes"].includes(k) || k.startsWith("custom:")))
    .map(k => attrs[k] || "").join("")}<section class="detail-section song-files-section"><div class="section-heading"><h3>Files</h3><button class="text-button" data-action="song-files" data-id="${e(song.id)}">Manage files</button></div>${song.files?.length ? `<ul class="song-file-list">${song.files.map(file => `<li><span>${e(file.name)}</span></li>`).join("")}</ul>` : '<p class="muted">No files attached. Add charts, documents, images or audio.</p>'}</section>`;
  const sources = [
    [r, "Evaluation sources"],
    ...(effectiveProfile().aiMode === "full" && r.status !== "ai" && retainedAiReview(song) ? [[retainedAiReview(song), "AI evaluation sources · verify before use"]] : []),
  ].filter(([review]) => review.sources?.length).map(([review,label]) => `<section class="detail-section"><h3>${e(label)}${aiLabel(song,review,"sources")}</h3><ul class="detail-list">${review.sources.map(source => `<li><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.label)} ↗</a></li>`).join("")}</ul></section>`).join("");
  const resources = songResourceLinks(song);
  const links = `${!hidden.has("recordings") ? `<section class="detail-section external-recordings"><h3>Recordings</h3>${recordingMarkup(song)}</section>` : ""}<section class="detail-section"><h3>Lyrics & public reviews</h3><div class="song-resources">${hymnaryLink(song) ? `<a class="button" href="${e(hymnaryLink(song))}" target="_blank" rel="noopener noreferrer">Find hymn on Hymnary ↗</a>` : ""}<a class="button" href="${e(resources.lyrics)}" target="_blank" rel="noopener noreferrer">Find lyrics ↗</a><a class="button" href="${e(resources.reviews)}" target="_blank" rel="noopener noreferrer">Find public reviews ↗</a></div><p class="muted">Searches help you find the exact version. Search results are not verified recordings or reviews.</p></section>${!hidden.has("sources") ? sources : ""}`;
  const catalogAnalysis = r.status !== "ai" && !retainedAiReview(song) ? catalogAnalysisMarkup(catalogAnalysisFor(song,effectiveProfile().aiMode),e,hidden) : "";
  const evaluation = `<div class="evaluation-actions"><span class="status-badge">${e(statusLabel(r))}</span>${effectiveProfile().aiMode !== "manual" ? `<button class="button" data-action="chatgpt-evaluation" data-id="${e(song.id)}">Generate AI evaluation</button>` : ""}</div>${evaluationBox(song,r)}${catalogAnalysis}${r.assistance ? section("assistance", "AI observations", `${effectiveProfile().aiLabels ? '<span class="ai-mark" role="img" aria-label="AI generated">AI</span>' : ""}<p>${e(r.assistance.summary)}</p><p>${e(r.assistance.language)}</p><p>${e(r.assistance.time)}</p>`) : ""}${effectiveProfile().aiMode === "full" && r.status !== "ai" && retainedAiReview(song) ? evaluationBox(song,retainedAiReview(song),true) : ""}${!hidden.has("sources") ? catalogComparison(song) : ""}`;
  const panes = { details, links, evaluation };
  const primary = song.blacklisted
    ? `<button class="button primary" data-action="restore-blacklisted" data-id="${e(song.id)}">Restore song</button>`
    : `<button class="button primary" data-action="save-song" data-id="${e(song.id)}">${saved ? "Manage libraries" : "Add to library"}</button>`;
  const actions = [
    ...(!song.blacklisted ? [["add-to-plan","Add to plan ›"]] : []),
    ["edit-review","Edit evaluation"], ["edit-index","Edit index details"],
    ["customize-details","Customize details"],
    ...(effectiveProfile().aiMode !== "manual" ? [["ai-review", effectiveProfile().aiMode === "limited" ? "Get limited assistance" : "Draft with AI"]] : []),
    ...(!song.blacklisted ? [["blacklist-song","Move to No Approval"]] : []),
    ...(lib && !song.blacklisted ? [["remove-library-song",`Remove from ${lib.name}`]] : []),
  ];
  return `<article class="detail-panel" data-song-id="${e(song.id)}" aria-label="Song details" tabindex="-1"><div class="song-detail-top"><div class="song-heading">${coverMarkup(song,"detail-art")}<div class="song-title"><h2>${e(song.title)}</h2><div class="attribution-display"><button class="text-button inline-attribution" data-action="inline-attribution" data-id="${e(song.id)}" aria-label="Edit artist / attribution"><span>${e(song.author || "Attribution not set")}</span><span aria-hidden="true">✎</span></button></div></div><div class="song-primary-actions">${primary}<details class="more-menu song-options" data-disclosure-key="song:${e(song.id)}:options"><summary aria-label="More song actions" title="More song actions">···</summary><div class="menu-items">${actions.map(([action,label]) => `<button class="text-button" data-action="${action}" data-id="${e(song.id)}">${e(label)}</button>`).join("")}</div></details></div></div>${song.blacklisted ? '<p class="blacklist-notice">This song is in No Approval. It stays out of libraries, suggestions and new plans.</p>' : ""}<div class="song-tabs" role="tablist" aria-label="Song information">${songTabs.map(([key,label]) => `<button type="button" role="tab" id="song-tab-${key}" aria-controls="song-pane-${key}" aria-selected="${detailTab === key}" tabindex="${detailTab === key ? 0 : -1}" data-action="song-tab" data-tab="${key}">${label}</button>`).join("")}</div></div>${songTabs.map(([key]) => `<section class="song-tab-panel" id="song-pane-${key}" role="tabpanel" aria-labelledby="song-tab-${key}" data-tab="${key}" tabindex="0" ${detailTab === key ? "" : "hidden"}>${panes[key]}</section>`).join("")}</article>`;
}
function chatGPTEvaluation(song) {
  if (!song || effectiveProfile().aiMode === "manual") return;
  const store = activeStore, owner = accounts.user?.id,
    original = JSON.stringify(song), profile = JSON.stringify({profile:effectiveProfile(),lens:state.activeLensId||"main"}),
    mode = effectiveProfile().aiMode;
  let requestId = crypto.randomUUID();
  const prompt = evaluationPrompt(song, effectiveProfile(), "", requestId);
  modal(`<h2>Generate AI evaluation</h2><p>Copy the request into ChatGPT, then paste its JSON response below. Your ChatGPT account generates the evaluation; this website makes no paid API call.</p><p class="muted">${mode === "limited" ? "Your limited assistance setting allows objective observations only. Your ratings and library memberships will stay unchanged." : "The request includes your review principles and weights. Review it before copying. Your human evaluation stays primary; an AI draft is secondary. Library membership does not change when a draft is applied."} No lyrics or private library notes are included automatically.</p><label>Song/text/version override (optional)<textarea id="evaluation-text-override" rows="3" maxlength="6000" placeholder="Specify a different song, lyric version, or selected text to evaluate."></textarea></label><p class="muted">Default: the widely recognized worship song by this title and its usual words. Changing the override clears the response and preview. Only text entered here is shared in the copied request.</p><details class="evaluation-request"><summary>Review the ChatGPT request</summary><label>Evaluation request<textarea id="evaluation-prompt" rows="12" readonly>${e(prompt)}</textarea></label></details><div class="form-actions"><button type="button" class="button" id="copy-evaluation">Copy request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div><label>ChatGPT evaluation JSON<textarea id="evaluation-json" rows="7" maxlength="65536" placeholder="Paste the JSON response here. Nothing is saved until you preview and apply it."></textarea></label><p id="evaluation-error" role="alert"></p><div class="form-actions"><button class="button" data-action="close">Cancel</button><button type="button" class="button primary" id="preview-evaluation">Preview evaluation</button></div><p id="evaluation-progress" role="status">Step 2: Paste ChatGPT’s response, then preview it. Step 3: Review the report and apply it explicitly.</p><div id="evaluation-preview" tabindex="-1" aria-label="Evaluation report preview"></div>`);
  const unchanged = () => store === activeStore && owner === accounts.user?.id && profile === JSON.stringify({profile:effectiveProfile(),lens:state.activeLensId||"main"}) && original === JSON.stringify(state.songs.find(s => s.id === song.id));
  const error = message => { dialog.querySelector("#evaluation-error").textContent = message; };
  dialog.querySelector("#copy-evaluation").onclick = async () => {
    if (!unchanged()) { error("The account, song or profile changed. Start a fresh evaluation before copying."); return; }
    const text = dialog.querySelector("#evaluation-prompt");
    try { await navigator.clipboard.writeText(text.value); toast("Evaluation request copied. Paste it into ChatGPT."); }
    catch { text.closest("details").open = true; text.focus(); text.select(); toast("Copy the highlighted request with your browser's Copy command."); }
  };
  const preview = dialog.querySelector("#evaluation-preview"), input = dialog.querySelector("#evaluation-json");
  dialog.querySelector("#evaluation-text-override").oninput = event => {
    requestId = crypto.randomUUID();
    dialog.querySelector("#evaluation-prompt").value = evaluationPrompt(song, effectiveProfile(), event.target.value, requestId);
    input.value = ""; preview.innerHTML = ""; error("");
    dialog.querySelector("#evaluation-progress").textContent = "Text/version changed. Copy a fresh request before pasting a new response.";
    updateSaveStrip();
  };
  input.oninput = () => { preview.innerHTML = ""; error(""); dialog.querySelector("#evaluation-progress").textContent = "Response changed. Preview it again before applying."; };
  dialog.querySelector("#preview-evaluation").onclick = () => {
    try {
      if (!unchanged()) throw new Error("The account, song or profile changed. Close this dialog and start a new evaluation.");
      const raw = input.value, draft = parseEvaluation(raw, song.id, mode, requestId), r = draft.review;
      error("");
      preview.innerHTML = `<h3>Review before applying ${effectiveProfile().aiLabels ? '<span class="ai-mark" aria-label="AI generated">AI</span>' : ""}</h3>${r.summary ? `<p>${e(r.summary)}</p>` : ""}${mode === "full" ? `<div class="draft-scores">${activeCriteria(state.profile).map(({id:key,label}) => `<p>${e(label)} <strong>${criterionScore(r,key) ?? "Not assessed"}</strong></p>`).join("")}</div><p>Doctrinal concern: ${e(r.concern)}</p>${["claims", "concerns", "uses", "themes", "scriptures"].filter(k => r[k].length).map(k => `<h4>${e({claims:"Claims",concerns:"Concerns",uses:"Service uses",themes:"Themes",scriptures:"Scripture connections"}[k])}</h4>${list(r[k])}`).join("")}` : ""}${r.language ? `<h4>Language</h4><p>${e(r.language)}</p>` : ""}${r.time ? `<h4>Arrangement observations</h4><p>${e(r.time)}</p>` : ""}${r.sources.length ? `<h4>Sources supplied by ChatGPT · verify these</h4><ul>${r.sources.map(s => `<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.label)}</a></li>`).join("")}</ul>` : ""}<button type="button" class="button primary" id="apply-evaluation">${mode === "limited" ? "Save AI observations" : "Apply evaluation"}</button>`;
      dialog.querySelector("#evaluation-progress").textContent = "Preview ready. Review the report below before applying; nothing has been saved.";
      preview.focus({ preventScroll: true });
      preview.scrollIntoView({ block: "start", behavior: "instant" });
      preview.querySelector("#apply-evaluation").onclick = () => {
        try {
          if (!unchanged() || input.value !== raw || draft.requestId !== requestId) throw new Error("The account, song, profile or response changed. Preview a fresh evaluation before applying.");
          const next = clone(state);
          next.songs[next.songs.findIndex(s => s.id === song.id)] = applyEvaluation(song, draft, mode);
          if (!commitWorkspace(validateWorkspace(next))) return;
          dialog.close(); render();
          toast(mode === "limited" ? "AI observations saved. Your evaluation is unchanged." : "AI evaluation saved as a draft. Review it before approving church use.");
        } catch (err) { error(err.message); }
      };
    } catch (err) { preview.innerHTML = ""; error(err.message); }
  };
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
function songFiles(song) {
  modal(`<h2>Files for ${e(song.title)}</h2><p class="muted">${activeOrganization ? "Files are shared with this organization; view-only members can download. File references sync with the workspace." : accounts.user ? "Files are private to your account. Save the workspace to sync its file references." : "Files stay on this device. Sign in before uploading to store files across devices."}</p><ul class="song-file-list">${(song.files || []).map(file => `<li><span>${e(file.name)} · ${Math.ceil(file.size/1024)} KB</span><button class="text-button" data-action="download-song-file" data-id="${e(song.id)}" data-file="${e(file.id)}">Download</button><button class="text-button danger" data-action="delete-song-file" data-id="${e(song.id)}" data-file="${e(file.id)}">Remove file</button></li>`).join("")}</ul><form id="song-file-form" data-id="${e(song.id)}"><label>Add a file<input name="file" type="file" required></label><p>Up to 10 MB per file · charts, documents, images or audio.</p><p id="file-error" role="alert"></p><button class="button primary">Upload file</button></form>`);
  if (!editableWorkspace()) {
    dialog.querySelector('#song-file-form')?.remove();
    for (const button of dialog.querySelectorAll('[data-action="delete-song-file"]')) button.remove();
  }
}
async function connectionsDialog() {
  const owner = accounts.user?.id;
  if (!owner) return accountDialog();
  modal("<h2>ChatGPT connections</h2><p>Loading connections…</p>");
  try {
    const rows = await accounts.listConnections();
    if (accounts.user?.id !== owner) return;
    modal(
      `<h2>ChatGPT connections</h2><p>Read your Personal workspace's saved profile, song libraries, and existing plans in ChatGPT. Organization workspaces are not shared through this connection. Save browser changes to your account first.</p><label>Connector URL<input readonly value="${e(mcpEndpoint(siteConfig))}" aria-label="Connector URL"></label><p class="muted">In ChatGPT, open Settings → Plugins → Browse directory → Add → Add custom MCP server. Use this URL and OAuth authentication. Menus vary; interfaces using Apps may require Developer mode.</p>${rows.map((row) => `<div class="connection-row"><strong>${e(row.client_name)}</strong><p>${row.enabled ? "Connected" : "Access disabled"} · ${["profile", "libraries", "plans", "notes", "lyrics"].filter((k) => row["share_" + k]).join(", ")}</p><button class="button" data-action="revoke-connection" data-id="${e(row.client_id)}">Revoke access</button></div>`).join("") || "<p>No connections yet.</p>"}<p id="connection-error" role="alert"></p>`,
    );
  } catch {
    modal(
      "<h2>ChatGPT connections</h2><p>The connector backend has not been set up yet. Follow CHATGPT-CONNECTION.md in the repository to enable it.</p>",
    );
  }
}
function indexResults() {
  return filterIndex(
    browsableSongs(),
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
  modal(`<h2>Plan templates</h2>${templates.length ? `<ul class="template-list">${templates.map((t) => `<li><div><strong>${e(t.title)}</strong><small>${t.items.length} items · ${planDuration(t.items)} min</small></div><button class="button" data-action="use-plan-template" data-id="${e(t.id)}">Use template</button><details class="more-menu"><summary>Manage</summary><div class="menu-items"><button class="text-button" data-action="rename-plan-template" data-id="${e(t.id)}">Rename template</button><button class="text-button danger" data-action="delete-plan-template" data-id="${e(t.id)}">Delete template</button></div></details></li>`).join("")}</ul>` : '<p>Open a plan, then use Plan tools → Save as template to reuse your service order.</p>'}<button class="button" data-action="close">Close templates</button>`);
}
function templateDialog(template = null, rename = false) {
  const source = template || getPlan();
  modal(`<h2>${rename ? "Rename template" : template ? "Create plan from template" : "Save service template"}</h2><form id="template-form" data-id="${e(source.id)}" data-mode="${rename ? "rename" : template ? "use" : "save"}"><label>${template && !rename ? "Plan name" : "Template name"}<input name="title" maxlength="200" value="${e(source.title)}" required></label>${template && !rename ? '<label>Date<input name="date" type="date"></label><p class="muted">Creates an independent draft with the service order you saved. Check its songs and details before use.</p>' : !rename ? '<label class="check-label"><input name="keepSongs" type="checkbox" checked>Keep selected songs</label><p class="muted">Uncheck to replace songs with placeholders you fill manually. Templates keep your order, notes and timings and do not count as services.</p>' : ""}<p id="template-error" role="alert"></p><div class="form-actions"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary">${template && !rename ? "Create draft" : "Save template"}</button></div></form>`);
}
function prepareChatGPTCriteria(form) {
  if(activeOrganization)throw new Error("The ChatGPT connection currently reads your Personal workspace, not organization data.");
  if (!form.reportValidity()) return;
  if (effectiveProfile().aiMode !== "full") throw new Error("This search requires Full AI content.");
  if (!accounts.user || activeStore === STORE) throw new Error("Sign in and save this library to your account before searching it in ChatGPT.");
  const values = Object.fromEntries(new FormData(form));
  const library = state.libraries.find((l) => l.id === values.library);
  if (!library?.songIds.length) throw new Error("Choose a library with saved songs.");
  const prompt = chatGPTCriteriaPrompt(library, values.criteria);
  modal(`<h2>Search your library in ChatGPT</h2><p>Save your latest changes to your account, then paste this request into a ChatGPT conversation with Faithful Repertoire connected.</p><label>ChatGPT search request<textarea id="chatgpt-criteria-prompt" rows="12" readonly>${e(prompt)}</textarea></label><div class="form-actions"><button class="button" data-action="copy-criteria-prompt">Copy request</button><a class="button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT</a><button class="button" data-action="close">Close</button></div><p class="muted">Only the library name, ID and criterion are in this request. ChatGPT reads your saved account records within your connection permissions. Results stay in ChatGPT; this does not change your reviews or plans.</p>`);
}
function indexPage() {
  const fields = indexFields(browsableSongs()),
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
    browsableSongs(),
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
        ? aiLabel(song, reviewForDisplay(song, effectiveProfile().aiMode), aiField)
        : "")
    );
  };
  return `<div class="page-heading"><div><h1>Song index</h1></div><div class="index-heading-actions"><button class="button" data-action="export-index">Export results (CSV)</button><button class="text-button" data-action="criteria-search">AI criteria search · optional</button></div></div>${savedViewsMarkup()}<section class="index-tools" aria-label="Index search and filters"><form id="index-search-form"><label>Search across all indexed fields<input name="query" type="search" value="${e(indexQuery)}" placeholder="A word, writer, theme, passage, or note"></label><button class="button primary">Search index</button></form><details class="index-filter-panel"><summary>Add filters</summary><form id="index-filter-form"><label>Field<select name="field" aria-label="Index field">${fieldOptions}</select></label><label>Match<select name="op" aria-label="Index match">${indexOperators("text")}</select></label><label>Value<input name="value" maxlength="1000" aria-label="Index value" list="index-values" required></label><datalist id="index-values">${indexEntries(
    browsableSongs(),
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
  }</ul></details><div class="index-toolbar"><span class="result-count" role="status">${songs.length} of ${browsableSongs().length} songs</span><label>Sort<select id="index-sort" aria-label="Index sort">${fields.map((f) => `<option value="${e(f.id)}" ${f.id === indexSort ? "selected" : ""}>${e(f.label)}</option>`).join("")}</select></label><label>Order<select id="index-order" aria-label="Index order"><option value="asc" ${!indexDescending ? "selected" : ""}>Ascending</option><option value="desc" ${indexDescending ? "selected" : ""}>Descending</option></select></label><label>Additional column<select id="index-column" aria-label="Additional column">${fields.map((f) => `<option value="${e(f.id)}" ${f.id === column.id ? "selected" : ""}>${e(f.label)}</option>`).join("")}</select></label><button class="text-button" data-action="reset-index">Reset index</button></div></section><div class="index-table-wrap" role="region" aria-label="Song index results" tabindex="0"><table class="index-table"><caption>Song index · ${songs.length} results</caption><thead><tr><th scope="col">Song / attribution</th><th scope="col">Themes</th><th scope="col">Key</th><th scope="col">Rating</th><th scope="col">${e(column.label)}</th><th scope="col">Details</th></tr></thead><tbody>${shown.map((song) => `<tr><th scope="row"><button class="index-title" data-action="index-open" data-id="${e(song.id)}">${e(song.title)}</button><small>${e(song.author)}</small></th><td>${display(song, "themes")}</td><td>${display(song, "key") || "—"}</td><td>${display(song, "rating")}</td><td class="index-extra">${display(song, column.id) || "—"}</td><td><button class="text-button" data-action="edit-index" data-id="${e(song.id)}" aria-label="Edit index details for ${e(song.title)}">Edit</button></td></tr>`).join("") || '<tr><td colspan="6">No songs match these filters. Remove a filter or enter more song details.</td></tr>'}</tbody></table></div>${pagination("index", indexPageNumber, songs.length, INDEX_PAGE_SIZE)}<p class="index-help">Arrangement measurements apply to your preferred arrangement. Blank values mean unrecorded, not zero. Ratings and assessment fields follow your AI visibility preference. Planning durations are editable estimates. CSV includes all indexed fields for the current results.</p>`;
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
  const eligible = effectiveProfile().aiMode === "full";
  modal(
    `<h2>Search a subjective criterion</h2><p class="muted">Look for tentative matches in a library you select. You review the evidence and choose your worship songs.</p>${!eligible ? "<p>Your profile hides subjective AI content. This search requires Full AI content.</p>" : ""}<form id="criteria-form"><label>Your library<select name="library" aria-label="Your library" required>${state.libraries.map((l) => `<option value="${e(l.id)}">${e(l.name)} (${l.songIds.length} songs)</option>`).join("")}</select></label><label>Your criterion<textarea name="criteria" rows="4" maxlength="1000" required placeholder="For example: songs that express dependence on God using concrete, well-structured language."></textarea></label>${aiConfigured ? '<p class="muted">The local AI search uses supplied record excerpts for 1–100 songs. You can also take the request to your connected ChatGPT account.</p>' : '<p class="muted">Prepare a request for your connected ChatGPT account. Save your library to your account first. This uses your ChatGPT connection; the website sends no AI request.</p>'}<p id="criteria-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button>${aiConfigured ? `<button class="button" type="button" data-action="prepare-chatgpt-criteria" ${eligible ? "" : "disabled"}>Prepare ChatGPT search</button>` : ""}<button class="button primary" ${eligible ? "" : "disabled"}>${aiConfigured ? "Search with AI" : "Prepare ChatGPT search"}</button></div></form>`,
  );
}
function indexDetailsDialog(song) {
  const m = song.metadata || {};
  modal(
    `<h2>Index details</h2><p>${e(song.title)}</p><p class="muted">Enter details for your chosen text and arrangement. These are your records; no AI fills these fields.</p><form id="index-details-form" data-id="${e(song.id)}"><label>Themes, separated by commas<input name="themes" maxlength="1000" value="${e(themesForDisplay(song, effectiveProfile().aiMode).join(", "))}"></label><div class="form-columns">${[
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
function coverMarkup(song, className) {
  const art = songArtwork(song);
  return art ? `<img class="album-art ${className}" src="${e(art.url)}" alt="Album artwork: ${e(art.label)}" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : "";
}
function usageSection(song) {
  const usage = songUsage(state.plans, song.id);
  return `<section class="detail-section"><h3>Plan history</h3><p>${usage.planned} saved plan${usage.planned === 1 ? "" : "s"} · ${usage.completed} marked completed${usage.lastUsed ? ` · Last completed plan: ${e(usage.lastUsed)}` : ""}</p><small class="muted">Only plans marked completed count as completed use.</small></section>`;
}
function planDisplay(plan) {
  return {...plan, items:plan.items.map(i=>({...i,title:planItemTitle(i,state.songs),displayTitle:planItemTitle(i,state.songs)}))};
}
function planPicker() {
  const plan=getPlan(),store=activeStore;
  if (!plan) return toast("Create a plan first.");
  openPlanSongPicker({workspace:clone(state),plan:clone(plan),libraryId,modal,catalog:availableCatalog(),
    onDirty:dirty=>{unsavedForm=dirty;updateSaveStrip();},
    stillCurrent:()=>activeStore===store && planId===plan.id && editableWorkspace(),
    onAdd:(items,after,songs=[])=>{
      const next=clone(state),target=next.plans.find(p=>p.id===plan.id);if(!target)throw new Error("This plan is no longer available.");
      const mapping=new Map();
      for(const song of songs){
        const existing=next.songs.find(s=>s.id===song.id||s.title===song.title&&s.author===song.author&&s.version===song.version);
        if(existing?.blacklisted)throw new Error("A selected song is now unavailable. Reopen the picker.");
        if(!existing)next.songs.push(clone(song));else mapping.set(song.id,existing.id);
      }
      for(const item of items){item.songId=mapping.get(item.songId)||item.songId;if(next.songs.find(s=>s.id===item.songId)?.blacklisted)throw new Error("A selected song is now unavailable.");}
      insertPlanItems(target,items,after);
      if(!commitWorkspace(validateWorkspace(next)))throw new Error("The selection could not be saved. Your picker is still open; retry or download a backup.");
      dialog.close();view="plans";render();toast(`${items.length} song${items.length===1?"":"s"} added to your plan.`);
    }});
}
function planImportDialog() {
  const store=activeStore;
  openPlanImport({workspace:clone(state),catalog:availableCatalog(),modal,stillCurrent:()=>activeStore===store,
    onImport:(plan,songs)=>{const next=clone(state);if(next.plans.some(p=>p.title===plan.title&&p.date===plan.date&&JSON.stringify(p.items.map(({id,...item})=>item))===JSON.stringify(plan.items.map(({id,...item})=>item))))throw new Error("This plan has already been imported.");next.songs.push(...clone(songs));next.plans.push(plan);if(!commitWorkspace(validateWorkspace(next)))return;planId=plan.id;view="plans";dialog.close();render();toast("Plan imported.");}});
}
function starterLibrariesDialog() {
  const store=activeStore;
  modal(`<h2>Starter libraries</h2><p>Use libraries to record your own decisions. These names are optional; rename them or build your own system.</p><ul><li>Ready to use</li><li>Needs evaluation</li><li>Use with context</li><li>Not for our church</li></ul><label class="check-label"><input id="migrate-decisions" type="checkbox">Copy previous church-use decisions into these libraries</label><p>Existing library membership, previous decision notes, evaluations and plans are kept.</p>${state.songs.some(s=>previousDecision(s)?.notes||previousDecision(s)?.status!=="unreviewed")?`<details><summary>Previous church-use decisions</summary><ul>${state.songs.filter(s=>previousDecision(s)?.notes||previousDecision(s)?.status!=="unreviewed").map(s=>`<li><strong>${e(s.title)}</strong> · ${e(approvalLabels[previousDecision(s)?.status]||"Not recorded")}${previousDecision(s)?.notes?`<p>${e(previousDecision(s).notes)}</p>`:""}</li>`).join("")}</ul></details>`:""}<p id="starter-library-error" role="alert"></p><button class="button primary" id="add-starter-libraries">Add starter libraries</button>`);
  dialog.querySelector("#add-starter-libraries").onclick=()=>{try{if(store!==activeStore)throw new Error("The active workspace changed.");if(!commitWorkspace(validateWorkspace(addStarterLibraries(state,dialog.querySelector("#migrate-decisions").checked))))return;dialog.close();render();toast("Starter libraries added. Your existing work was kept.");}catch(error){dialog.querySelector("#starter-library-error").textContent=error.message;}};
}
function plansPage() {
  const plan=state.plans.find(p=>p.id===planId)||state.plans[0];if(plan)planId=plan.id;
  let elapsed=0, number=0;
  const title=item=>planItemTitle(item,state.songs);
  return `<div class="page-heading"><h1>Plans</h1><div class="index-heading-actions">${effectiveProfile().aiMode==="full"&&(state.evaluationHistory||[]).length?'<button class="button" data-action="evaluation-history">All evaluation history</button>':""}<button class="button" data-action="import-plan">Import plan</button><button class="button" data-action="plan-templates">Plan templates</button><button class="button primary" data-action="new-plan">+ New plan</button></div></div>${!plan?`<section class="empty full-empty"><h2>No plans yet</h2><p>Create a plan, import an existing order or start from a saved template.</p><button class="button primary" data-action="new-plan">Create a plan</button></section>`:`<div class="plan-layout"><aside class="plan-list">${state.plans.map(p=>`<button data-action="plan-select" data-id="${e(p.id)}" class="${p.id===plan.id?"selected":""}"><strong>${e(p.title)}</strong><span>${e(p.date||"No date set")} · ${planDuration(p.items)} min</span></button>`).join("")}</aside><section class="plan-sheet"><div class="plan-sheet-header"><div><div class="eyebrow">${e(plan.date||"DATE TO BE CONFIRMED")}</div><h2>${e(plan.title)}</h2><p>${e(plan.theme||"")}</p>${plan.passage?`<span class="tag">${e(plan.passage)}</span>`:""}</div><div class="duration-total"><strong>${planDuration(plan.items)}</strong><span>minutes</span></div></div><div class="plan-toolbar">${effectiveProfile().aiMode==="full"?`<button class="button" data-action="workspace-evaluation" data-plan-id="${e(plan.id)}">Evaluate plan</button><button class="button" data-action="evaluation-history" data-scope-id="plan:${e(plan.id)}">Evaluation History</button>`:""}<button class="text-button" data-action="edit-plan">Edit plan details</button><details class="more-menu"><summary>Plan tools</summary><div class="menu-items"><button class="text-button" data-action="copy-plan">Duplicate plan</button><button class="text-button" data-action="save-plan-template">Save as template</button><button class="text-button" data-action="export-plan-json">Export importable JSON</button><button class="text-button" data-action="print-plan">Print / Save PDF</button><button class="text-button danger" data-action="delete-plan">Delete plan</button></div></details><span class="plan-state">${e(plan.status||"draft")}</span></div><ol class="service-items">${plan.items.map((item,i)=>{const name=title(item),heading=item.type==="heading",offset=elapsedTime(elapsed);elapsed+=item.minutes;return `<li class="${heading?"plan-heading-item":""}" data-item-type="${e(item.type)}" data-plan-item="${e(item.id)}" draggable="true"><button class="plan-drag-handle icon-button" aria-label="Drag ${e(name)}" title="Drag to reorder">⠿</button><span class="item-number">${heading?"":String(++number).padStart(2,"0")}</span><div class="service-item-content">${heading?"":`<span class="eyebrow">${e(item.role||item.type)} · ${offset} from start</span>`}<h3>${e(name)}</h3>${item.type==="song"?`<small><span class="plan-key ${item.key?"":"key-unset"}">${e(item.key||"Key not set")}</span>${item.arrangementName?` · ${e(item.arrangementName)}`:""}</small>`:""}${item.notes?`<p>${e(item.notes)}</p>`:""}</div>${heading?"":`<span class="item-time">${e(item.minutes)} min</span>`}<div class="item-buttons"><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="-1" aria-label="Move ${e(name)} up" ${i===0?"disabled":""}>↑</button><button class="icon-button" data-action="move-item" data-id="${e(item.id)}" data-direction="1" aria-label="Move ${e(name)} down" ${i===plan.items.length-1?"disabled":""}>↓</button><button class="icon-button" data-action="edit-item" data-id="${e(item.id)}" aria-label="Edit ${e(name)}">✎</button><button class="icon-button danger" data-action="remove-item" data-id="${e(item.id)}" aria-label="Remove ${e(name)}">×</button></div></li>`;}).join("")}</ol>${!plan.items.length?'<div class="empty"><h3>No plan items yet</h3><p>Add songs, headings, readings, prayer or other items.</p></div>':""}<div class="plan-buttons"><button class="button primary" data-action="pick-plan-songs">Add songs</button><button class="button" data-action="new-heading">Add heading</button><button class="button" data-action="new-item">Add item</button><button class="text-button" data-action="export-plan">Export plan</button></div></section></div>`}`;
}
function workspaceEvaluationDialog(initialPlanId, initialLibraryId) {
  if(effectiveProfile().aiMode!=="full")return toast("Evaluations require Full AI content.");
  const owner=accounts.user?.id,store=activeStore;
  openWorkspaceEvaluation({workspace:clone({...state,profile:effectiveProfile()}),initialPlanId,initialLibraryId,modal,dialog,download,
    onSave:editableWorkspace()?(report,snapshot,repeats)=>{
      if(owner!==accounts.user?.id||store!==activeStore||effectiveProfile().aiMode!=="full"||!editableWorkspace())throw new Error("This workspace or access changed.");
      const result=retainEvaluation(state,report,snapshot,repeats);
      if(!result.duplicate&&!commitWorkspace(validateWorkspace(result.workspace)))throw new Error("The evaluation could not be saved. Download it or retry.");
    }:undefined,
    getWorkspace:()=>({...state,profile:effectiveProfile()}),stillCurrent:()=>owner===accounts.user?.id&&store===activeStore&&effectiveProfile().aiMode==="full"});
}
function libraryAuditDialog(id) {return workspaceEvaluationDialog(undefined,id);}
function evaluationHistoryDialog(scopeId) {
  if(effectiveProfile().aiMode!=="full")return toast("Evaluation History requires Full AI content.");
  const owner=accounts.user?.id,store=activeStore;
  const current=()=>owner===accounts.user?.id&&store===activeStore&&effectiveProfile().aiMode==="full";
  openEvaluationHistory({workspace:clone(state),scopeId,modal,dialog,download,stillCurrent:current,
    onRemove:editableWorkspace()?id=>{if(!current())throw new Error("This workspace changed.");const next=clone(state);next.evaluationHistory=(next.evaluationHistory||[]).filter(row=>row.id!==id);if(!commitWorkspace(validateWorkspace(next)))throw new Error("The report could not be removed.");}:undefined});
}

function criterionRow(c) {
  return `<fieldset class="criterion-row" data-criterion="${e(c.id)}"><legend>${e(c.label)}</legend><label>Name<input name="criterion-label" maxlength="100" value="${e(c.label)}" required></label><label class="check-label"><input name="criterion-active" type="checkbox" ${c.active ? "checked" : ""}>Include in rating</label><label>Weight<input name="criterion-weight" aria-label="${e(c.label)} weight" type="number" min="0" max="100" value="${state.profile.weights[c.id] ?? 1}" required></label><details data-disclosure-key="criterion:${e(c.id)}"><summary>Evidence rubric</summary><label>Rules for this criterion<textarea name="criterion-rubric" rows="3" maxlength="2000">${e(c.rubric)}</textarea></label></details><button type="button" class="text-button danger" data-action="remove-criterion">Remove criterion</button></fieldset>`;
}
function rubricMarkup() {
  return `<details class="score-rubric"><summary>What do 0–10 scores mean?</summary><p>Ten is possible. Unknown evidence is left blank, never scored zero. Judge each criterion independently using the exact version, explain the evidence and uncertainty, and avoid false precision. A high average does not decide whether you use a song.</p><table><thead><tr><th>Score</th><th>Meaning</th><th>Evidence anchor</th></tr></thead><tbody>${scoreAnchors.map(([score,name,rule]) => `<tr><th>${e(score)}</th><td>${e(name)}</td><td>${e(rule)}</td></tr>`).join("")}</tbody></table></details>`;
}
function profilePage() {
  return `<div class="page-heading"><div><h1>Evaluation criteria</h1><p>Choose what you measure. Ratings support human judgment.</p></div><button class="button" data-action="new-lens">New lens</button></div><p>Each lens keeps its own criteria, weights and evaluations. Libraries and plans stay together; switch lenses to examine them for another purpose.</p><form id="profile-form" class="profile-panel"><label>Lens name<input name="lensName" maxlength="100" required value="${e(activeLens(state).name)}"></label><label>Purpose of this lens<textarea name="evaluationPurpose" maxlength="2000" rows="2" placeholder="For example: Sunday congregation, acoustic prayer night, or youth worship">${e(state.profile.evaluationPurpose||'')}</textarea></label><h2>${e(denominations[state.profile.denomination])}</h2><p>${e(statements[state.profile.statement].name)}</p><button class="text-button" type="button" data-action="setup-profile">Choose denomination & statement of faith</button><label>AI content preference<select name="aiMode" aria-label="AI content preference">${Object.entries(aiModes).map(([key,mode]) => `<option value="${key}" ${key === effectiveProfile().aiMode ? "selected" : ""}>${e(mode.title)}</option>`).join("")}</select></label><label>AI Labels<select name="aiLabels" aria-label="AI Labels"><option value="on" ${effectiveProfile().aiLabels ? "selected" : ""}>On</option><option value="off" ${!effectiveProfile().aiLabels ? "selected" : ""}>Off</option></select></label><h3>Rating criteria</h3><p>The displayed average uses only active criteria with a positive weight and an assessed score. Missing scores are excluded. Deactivating or removing a criterion never deletes saved scores. Existing weights are preserved; equal weights are available below. Serious doctrinal concerns remain visible independently of the average.</p>${rubricMarkup()}<div id="criterion-rows">${ratingCriteria(state.profile).map(criterionRow).join("")}</div><div class="form-actions"><button type="button" class="button" data-action="add-criterion">Add custom criterion</button><button type="button" class="button" data-action="equal-weights">Use equal weights</button><button type="button" class="button" data-action="restore-criteria">Restore built-in criteria</button></div><details data-disclosure-key="scoring-suggestions"><summary>Other useful criteria</summary><p>These require evidence for the exact text, melody, arrangement or congregation. Add only what serves your review purpose. Avoid double-counting overlapping criteria.</p>${suggestedCriteria.map((c,i) => `<p><strong>${e(c.label)}</strong> — ${e(c.rubric)} <button type="button" class="text-button" data-action="suggest-criterion" data-id="${i}">Add ${e(c.label)}</button></p>`).join("")}</details><label>Theological & editorial parameters<textarea name="principles" rows="7" maxlength="6000" required>${e(state.profile.principles)}</textarea></label><p>Changing criteria updates displayed ratings, not past evaluations. New scores remain blank until reviewed. Arrangement coherence replaces the former time label; it is not a preference for shorter songs.</p><p id="profile-error" role="alert"></p><button class="button primary" type="submit">Save evaluation criteria</button></form>`;
}
function newSongDialog() {
  modal(
    `<h2>Add a song to review</h2><p class="muted">Identify the exact song and version. No rating is invented from a title.</p><form id="new-song-form"><label>Song title<input name="title" maxlength="200" value="${e(query)}" required></label><label>Writer / attribution<input name="author" maxlength="300" placeholder="Writer, hymn author, or unknown"></label><label>Opening line<input name="firstLine" maxlength="300" placeholder="Helps distinguish songs with the same title"></label><label>Version / arrangement<input name="version" maxlength="300" placeholder="Album, hymn edition, or arrangement"></label><label>Themes, separated by commas<input name="themes" maxlength="500" placeholder="Grace, repentance, resurrection"></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Add song</button></div></form>`,
  );
}
function editReviewDialog(song) {
  const r = reviewForDisplay(song, effectiveProfile().aiMode);
  modal(
    `<h2>Edit ${e(song.title)}</h2><p class="muted">Use 0–10 scores; 10 is allowed. Leave missing evidence blank.</p>${rubricMarkup()}<form id="review-form" data-id="${e(song.id)}"><div class="weight-fields">${ratingCriteria(state.profile).map(c => [c.id, c.label])
      .map(
        ([k, label]) =>
          `<label>${e(label)}<input type="number" name="score-${k}" min="0" max="10" step="0.1" value="${criterionScore(r, k) ?? ""}" placeholder="Not assessed"></label>`,
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
      ["summary", "Evaluation summary", r.summary],
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
      )}<div class="form-columns"><label>Preferred key<input name="key" maxlength="30" value="${e(r.key)}" placeholder="e.g. D"></label><label>Planning duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(r.minutes)}" required></label></div><label>Source links · one HTTPS URL per line<textarea name="sources" rows="2">${e(r.sources.map((s) => s.url).join("\n"))}</textarea></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save evaluation</button></div></form>`,
  );
}
function planDialog(plan = null) {
  modal(
    `<h2>${plan ? "Edit plan" : "A new plan"}</h2><form id="plan-form" ${plan ? `data-id="${e(plan.id)}"` : ""}><label>Plan name<input name="title" maxlength="200" value="${e(plan?.title || "Sunday worship")}" required></label><label>Date<input name="date" type="date" value="${e(plan?.date || "")}"></label><label>Theme<input name="theme" maxlength="500" value="${e(plan?.theme || "")}" placeholder="The faithfulness of God"></label><label>Sermon passage<input name="passage" maxlength="200" value="${e(plan?.passage || "")}" placeholder="Psalm 46"></label><label>Plan status<select name="status" aria-label="Plan status">${[
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
function itemDialog(item = null, heading = false) {
  const song=state.songs.find(s=>s.id===item?.songId),isHeading=heading||item?.type==="heading",plan=getPlan();
  modal(`<h2>${item?"Edit plan item":isHeading?"Add heading":"Add plan item"}</h2><form id="item-form" data-type="${isHeading?"heading":item?.type||"other"}" ${item?`data-id="${e(item.id)}"`:""}>${song?`<p>${e(planItemTitle(item,state.songs))}</p>`:`<label>${isHeading?"Heading":"Item title"}<input name="title" maxlength="200" value="${e(item?.title||"")}" required></label>`}${isHeading?"":`<div class="form-columns"><label>Duration (minutes)<input name="minutes" type="number" min="0.5" max="180" step="any" value="${e(item?.minutes||3)}" required></label>${song?`<label>Key<input name="key" maxlength="30" value="${e(item.key||"")}"></label>`:""}</div>`}<label>Notes<textarea name="notes" rows="4" maxlength="6000">${e(item?.notes||"")}</textarea></label>${!item?insertionMarkup(planDisplay(plan)):""}<div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Save item</button></div></form>`);
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
document.addEventListener("toggle", event => {
  const node = event.target;
  if (!node.matches?.("details[data-collection]")) return;
  const id = node.dataset.collection;
  if (node.open) {
    collectionOpen.add(id);
    const body = node.querySelector(".collection-body");
    if (!body.innerHTML) body.innerHTML = collectionBody(songCollections.find(p => p.id === id));
  } else collectionOpen.delete(id);
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeMenus(); if(event.target.closest?.("#inline-attribution-form")){event.preventDefault();unsavedForm=false;render();} }
  const tab = event.target.closest?.('[role="tab"][data-action="song-tab"]');
  if (tab && ["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) {
    event.preventDefault();
    const index = songTabs.findIndex(([key]) => key === tab.dataset.tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? songTabs.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + songTabs.length) % songTabs.length;
    activateSongTab(songTabs[next][0], true);
  }
});
document.addEventListener("click", async (event) => {
  const savedPassword=event.target.closest('[data-action="saved-password"]');
  if(savedPassword){event.preventDefault();savedPassword.closest('form').querySelector('[name="password"]').focus();return;}
  for (const menu of document.querySelectorAll(
    ".more-menu[open],.account-save-strip[open]",
  ))
    if (!menu.contains(event.target)) menu.open = false;
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  event.preventDefault();
  if(button.dataset.action==='close' && historyRestorePending)return toast('Restoring the workspace. Please wait until it finishes.');
  const menu = button.closest(".more-menu,.account-save-strip");
  if (menu) {
    menu.open = false;
    disclosureState.set(menu.dataset.disclosure, false);
  }
  if (button.dataset.action === "version-history") {
    if(unsavedForm || hasUnsubmittedEdits())return toast("Save or discard your current form edits before opening version history.");
    await openVersionHistory({history:versionHistory,cloud:new CloudHistory(accounts),context:historyContext,current:()=>clone(state),valid:historyContextValid,editable:editableWorkspace,modal,dialog,prepare:prepareHistory,normalize:workspace=>{const restored=syncCatalog(validateWorkspace(workspace));if(!activeOrganization)Object.assign(restored.profile,personalAI);return restored;},checkpoint:saveHistoryCheckpoint,restore:restoreHistoryWorkspace,download});return;
  }
  if (button.dataset.action === "new-lens") {
    if(!editableWorkspace())return toast("This workspace is view only.");
    if(unsavedForm)return toast("Save your current edits before creating a lens.");
    modal('<h2>Create an analysis lens</h2><p>Start with a copy of the current criteria and evaluations, then adjust them independently. Songs, personal notes, libraries and plans are shared.</p><form id="new-lens-form"><label>Lens name<input name="name" maxlength="100" required placeholder="Acoustic prayer night"></label><label>Purpose<textarea name="purpose" maxlength="2000" rows="3"></textarea></label><p id="lens-error" role="alert"></p><button class="button primary">Create lens</button></form>');return;
  }
  if (button.dataset.action === "song-tab") { activateSongTab(button.dataset.tab); return; }
  if(button.dataset.action==="organizations"){await organizationDialog();return;}
  if(button.dataset.action==="organization-drafts"){organizationDraftsDialog();return;}
  if(button.dataset.action==="change-password"){modal('<h2>Change password</h2><form id="password-form"><label>New password<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><p id="account-error" role="alert"></p><button class="button primary">Update password</button></form>');return;}
  if (button.dataset.action === "toggle-ai-labels") {
    if(activeOrganization){personalAI.aiLabels=!personalAI.aiLabels;await savePersonalAIPreferences();render();return;}
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
  let action = button.dataset.action,
    id = button.dataset.id;
  let song = state.songs.find((s) => s.id === id);
  if(!editableWorkspace()) {
    const allowed=new Set(["nav","account","close","song-select","song-tab","library-select","plan-select","index-open","catalog-open","clear-filters","song-page","index-page","first-song-page","last-song-page","collection-page","sync-profile","export","export-plan","export-plan-json","export-library","print-plan","download-song-file","song-files","song-recordings","backup","cloud-load","retry-autosave","signout","reset-index","remove-index-filter","apply-index-view","export-index","library-audit","workspace-evaluation","evaluation-history","plan-templates","copy-criteria-prompt","prepare-chatgpt-criteria"]);
    if(!allowed.has(action))return toast("This organization is view only. Switch to Personal to edit your own work.");
  }

  if (action === "collection-song-action") {
    const record = allCatalogSongs.find(s => s.id === id);
    if (!record || existingMatch(state, record)?.blacklisted) return;
    const next = clone(state);
    let chosen = existingMatch(next, record);
    if (!chosen) { chosen = clone(record); next.songs.push(chosen); }
    if (!commitWorkspace(validateWorkspace(syncCatalog(next)))) return;
    id = chosen.id; song = state.songs.find(s => s.id === id); action = button.dataset.songAction;
  }
  if (action === "collection-page") { collectionPages.set(id, Number(button.dataset.page)); updateCollectionResults(id); return; }
  if (action === "collection-import-all") return previewCollection(songCollections.find(p => p.id === id), "all", true);
  if (action === "import-entire-catalog") {
    importDraft = { packId: null, depth: null, songs: availableCatalog(), target: "__new__", name: "Complete song reference", bulk: true };
    return importDialog();
  }
  if (action === "blacklist-song" || action === "restore-blacklisted") {
    if (!song) return;
    const next = clone(state), target = next.songs.find(s => s.id === id);
    target.blacklisted = action === "blacklist-song";
    if (!commitWorkspace(validateWorkspace(next))) return;
    if (dialog.open) dialog.close();
    selected = null; query = ""; render();
    toast(target.blacklisted ? "Song moved to No Approval. Notes and plan history are preserved." : "Song restored to your visible repertoire.");
    return;
  }
  if (song?.blacklisted && (view !== "blacklist" || ["save-song", "add-to-plan"].includes(action))) return;
  if (action === "chatgpt-evaluation") return chatGPTEvaluation(song);
  if (action === "song-files") return songFiles(song);
  if (action === "song-recordings") return recordingsDialog(song);
  if (["prefer-recording", "remove-recording"].includes(action)) {
    const next = clone(state), target = next.songs.find(s => s.id === id), index = target?.recordings?.findIndex(r => r.id === button.dataset.recording);
    if (index === undefined || index < 0) return;
    const [recording] = target.recordings.splice(index, 1);
    if (action === "prefer-recording") target.recordings.unshift(recording);
    if (!commitWorkspace(validateWorkspace(next))) return;
    render(); recordingsDialog(state.songs.find(s => s.id === id)); return;
  }
  if (["download-song-file", "delete-song-file"].includes(action)) {
    const file = song?.files?.find(f => f.id === button.dataset.file), store = activeStore;
    if (!file) return;
    button.disabled = true;
    try {
      if (action === "download-song-file") {
        const blob = file.storage === "organization" ? await organizationsClient.downloadFile(activeOrganization?.id,file.path) : file.storage === "account" ? await accounts.downloadSongFile(file.path) : await deviceFile("get", file.path);
        if (store !== activeStore) return;
        if (!blob) throw new Error("This device file is unavailable. File contents are not included in JSON backups.");
        download(file.name, blob, file.mime || "application/octet-stream");
      } else {
        if (file.storage === "organization") await organizationsClient.deleteFile(activeOrganization?.id,file.path); else if (file.storage === "account") await accounts.deleteSongFile(file.path); else await deviceFile("delete", file.path);
        if (store !== activeStore) return;
        song.files = song.files.filter(f => f.id !== file.id); persist(); songFiles(song);
      }
    } catch (err) { if (store === activeStore) dialog.querySelector("#file-error").textContent = err.message; }
    finally { if (button.isConnected) button.disabled = false; }
    return;
  }
  if (action === "cancel-attribution") { render(); return; }
  if (action === "inline-attribution") {
    const holder=button.closest(".attribution-display");
    if(!holder)return;
    holder.innerHTML=`<form id="inline-attribution-form" data-id="${e(song.id)}" data-store="${e(activeStore)}"><label class="sr-only" for="inline-artist">Artist / attribution</label><input id="inline-artist" name="author" maxlength="1000" value="${e(song.author)}" autocomplete="off"><button type="submit" class="text-button">Save</button><button type="button" class="text-button" data-action="cancel-attribution">Cancel</button></form>`;
    holder.querySelector("input").focus();return;
  }
  if (action === "confirm-fact") {
    const field = button.dataset.field;
    if (!objectiveFacts(song).some(f => f.field === field)) return;
    song.facts ||= {}; song.facts[field] = { confidence: "confirmed", source: "Confirmed by account owner." };
    persist(); render(); return;
  }
  if (action === "edit-fact") {
    const field = button.dataset.field || "author";
    const fact = objectiveFacts(song).find(f => f.field === field);
    if (!fact) return;
    const numeric = ["minutes", "tempo"].includes(field), current = field === "author" ? song.author : field === "key" ? song.review.key : field === "minutes" ? song.review.minutes : song.metadata?.[field] ?? "";
    return modal(`<h2>Edit ${e(fact.label.toLowerCase())}</h2><form id="fact-form" data-id="${e(song.id)}" data-field="${field}"><label>${e(fact.label)}<input name="value" ${numeric ? `type="number" min="${field === "tempo" ? 20 : .5}" max="${field === "tempo" ? 400 : 60}" step="${field === "tempo" ? 1 : .1}"` : 'maxlength="1000"'} value="${e(current)}" required></label><label>Certainty<select name="confidence" aria-label="Fact certainty"><option value="confirmed">I confirm this value</option><option value="guess">Unconfirmed estimate</option><option value="ai">AI estimate</option></select></label><label>Source or observation<input name="source" maxlength="1000" value="${e(fact.provenance?.source || "")}"></label><button class="button primary">Save detail</button></form>`);
  }
  if (action === "delete-ai-evaluation") {
    if (!song || song.review.status === "ai") return;
    song.aiDismissed = true; delete song.aiReview;
    if (!persist()) return;
    if (dialog.open) dialog.close(); render(); return;
  }
  if (action === "copy-criteria-prompt") {
    const prompt = dialog.querySelector("#chatgpt-criteria-prompt");
    try { await navigator.clipboard.writeText(prompt.value); toast("Search request copied."); }
    catch { prompt.focus(); prompt.select(); toast("Select Copy from your browser menu to copy the highlighted request."); }
    return;
  }
  if (action === "prepare-chatgpt-criteria") {
    if(activeOrganization)return toast("The ChatGPT connection reads your Personal workspace. Use Personal for connected library search.");
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
    revealSelectedSong();
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
      "Preferred arrangement changed. Check this version against your library's intended use.",
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
      `<h2>Duplicate worship plan</h2><p class="muted">Copy the service order and notes into an independent draft. Your original plan stays intact.</p><form id="copy-plan-form" data-id="${e(plan.id)}"><label>Plan name<input name="title" maxlength="200" value="${e(plan.title.slice(0, 190) + " (copy)")}" required></label><label>Date<input name="date" type="date"></label><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Create copy</button></div></form>`,
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
    const results = document.querySelector(".song-list"); if (results) results.scrollTop = 0;
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
      songs = browsableSongs().filter((s) => library.songIds.includes(s.id));
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
    view = song.blacklisted ? "blacklist" : "discover";
    query = song.title;
    songPage = 1;
    themeFilter = approvalFilter = typeFilter = reviewFilter = "";
    if (dialog.open) dialog.close();
    render();
    revealSelectedSong();
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
  if (["add-criterion", "suggest-criterion", "restore-criteria", "equal-weights", "remove-criterion"].includes(action)) {
    unsavedForm = true;
    const rows = document.querySelector("#criterion-rows");
    if (action === "remove-criterion") button.closest(".criterion-row").remove();
    else if (action === "equal-weights") rows.querySelectorAll('[name="criterion-weight"]').forEach(input => input.value = "1");
    else if (action === "restore-criteria") {
      for (const [id,label] of Object.entries(scoringLabels)) if (!rows.querySelector(`[data-criterion="${id}"]`)) rows.insertAdjacentHTML("beforeend", criterionRow({id,label,rubric:scoringRubrics[id],active:true}));
    } else {
      if (rows.children.length >= 20) return toast("Use up to 20 rating criteria.");
      const preset = action === "suggest-criterion" ? suggestedCriteria[Number(id)] : { label: "New criterion", rubric: "" };
      rows.insertAdjacentHTML("beforeend", criterionRow({id: "custom-" + uid(), ...preset, active: true}));
      const input = rows.lastElementChild.querySelector("input"); input.focus(); input.select();
    }
    return;
  }
  if(action==="evaluation-history")return evaluationHistoryDialog(button.dataset.scopeId);
  if(action==="workspace-evaluation")return workspaceEvaluationDialog(button.dataset.planId,button.dataset.libraryId);
  if (action === "library-audit") return libraryAuditDialog(id);
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
    if(activeOrganization)return toast("Switch to Personal before importing browser-only work.");
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
  if (action === "open-local-account") {
    if (accounts.user) accountCheckController?.abort();
    return;
  }
  if (action === "retry-account-check") { startAccountCheck(); return; }
  if (action === "guest-opt-in") {
    guestOptIn = true; sessionStorage.setItem("faithful-guest-opt-in", "1");
    const stored = !storageProblem && persist();
    render(); toast(stored ? "Browser-only mode: work is saved on this device, not an account." : "Browser-only mode is open. Saving is unavailable; export a backup before leaving."); return;
  }
  if (action === "retry-autosave") {
    if (["review","conflict","checking"].includes(accountSave.phase)) return toast("Review the saved account workspace before uploading changes.");
    if(activeOrganization){await syncOrganization(true);if(!editableWorkspace()||!autosave.enabled)return;}
    if (!autosave.enabled) { await startAccountCheck(); if (!autosave.enabled) return; }
    autosave.enqueue(state); await autosave.retry(); return;
  }
  if (action === "signout") {
    if (autosave.enabled && !["error","conflict"].includes(autosave.phase) && (accountSave.remoteAvailable || accountSave.initialSignature !== workspaceSignature(state))) { autosave.enqueue(state); await autosave.flush(); }
    if (accountSave.signature !== workspaceSignature(state) && (accountSave.remoteAvailable || accountSave.initialSignature !== workspaceSignature(state)) && !confirm("Account changes have not finished saving. Your browser copy is retained. Sign out anyway?")) return;
    guestOptIn = false; sessionStorage.removeItem("faithful-guest-opt-in");
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
    if(activeOrganization){if(!editableWorkspace()||["checking","conflict","review"].includes(accountSave.phase))return toast("Review shared changes before saving.");autosave.enqueue(state);await autosave.flush();return;}
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
    if(activeOrganization)return reviewOrganizationCopy();
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
    if (view === "profile" && (unsavedForm || hasUnsubmittedEdits())) {
      if (!confirm("Discard unsaved evaluation criteria? Choose Cancel to keep editing.")) return;
      unsavedForm = false;
    }
    if (event.detail > 0) suppressRailHover = true;
    const nextView = button.dataset.view;
    const criteriaVisit = [view,nextView].includes("profile") && [view,nextView].every(v=>["profile","evaluate","index"].includes(v));
    view = nextView;
    history.replaceState(null, "", location.pathname + location.search + (["home","about"].includes(view) ? `#${view}` : ""));
    if (dialog.open) dialog.close();
    if (!criteriaVisit) { query = ""; themeFilter = approvalFilter = ""; typeFilter = reviewFilter = ""; songPage = 1; }
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (action === "song-select") {
    selected = id;
    render();
    revealSelectedSong();
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
  if (action === "starter-libraries") return starterLibrariesDialog();
  if (action === "pick-plan-songs") return planPicker();
  if (action === "import-plan") return planImportDialog();
  if (action === "new-heading") return itemDialog(null,true);
  if (action === "export-plan-json") return download("faithful-plan.json",JSON.stringify(exportPlanJSON(getPlan(),state.songs),null,2),"application/json");
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
    if (!state.plans.length) {
      toast("Create a plan first, then add this song.");
      view = "plans";
      render();
      planDialog();
      return;
    }
    return modal(
      `<h2>Add ${e(song.title)} to a plan</h2><form id="add-to-plan-form" data-id="${e(id)}"><label>Plan<select name="plan">${state.plans.map((p) => `<option value="${e(p.id)}" ${p.id === planId ? "selected" : ""}>${e(p.title)} ${e(p.date)}</option>`).join("")}</select></label>${insertionMarkup(planDisplay(getPlan()||state.plans[0]))}${song.arrangements?.length ? `<label>Arrangement<select name="arrangement" aria-label="Plan arrangement"><option value="">Song settings · no arrangement selected</option>${song.arrangements.map((a) => `<option value="${e(a.id)}" ${song.preferredArrangementId === a.id ? "selected" : ""}>${e(a.name)} · ${e(a.key || "key unset")}</option>`).join("")}</select></label>` : ""}<div class="form-columns"><label>Key<input name="key" maxlength="30" value="${e(selectedArrangement(song)?.key ?? song.review.key)}"></label><label>Duration (minutes)<input name="minutes" type="number" min="0.5" max="60" step="0.5" value="${e(selectedArrangement(song)?.minutes ?? song.review.minutes)}" required></label></div><div class="form-actions"><button class="button primary">Add to plan</button></div></form>`,
    );
  }
  if (action === "backup")
    return modal(
      `<h2>Keep your repertoire safe.</h2>${activeOrganization?"<p>Restoring a backup here replaces the shared organization workspace for all members.</p>":""}<p class="muted">Your songs, libraries, notes, rating profile and worship plans are saved on this browser. Download a backup to move them to another browser or restore them later.</p><button class="button primary" data-action="export">Download a backup</button><hr class="backup-divider"><h3>Restore a saved backup</h3><p class="muted">Choose a Faithful Repertoire JSON backup. You’ll review it before replacing any current data.</p><form id="restore-form"><label>Backup file<input name="backup" type="file" accept=".json,application/json" required></label><p id="restore-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary">Review backup</button></div></form>`,
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
      planOutline(getPlan(), state.songs.map(s => s.blacklisted ? { ...s, title: "Excluded song" } : s)),
      "text/plain",
    );
  if (action === "ai-review" && effectiveProfile().aiMode === "manual") {
    toast("Human evaluations only sends no AI requests.");
    return;
  }
  if (action === "ai-review" && !aiConfigured) return chatGPTEvaluation(song);
  if (action === "ai-review")
    return modal(
      `<h2>Draft a review with AI</h2><p class="muted">${aiConfigured ? "Your supplied text is sent to the AI provider. The draft needs human review; it does not search the web." : "AI drafting is not available in this edition. You can still edit every assessment manually."}</p><form id="ai-form" data-id="${e(id)}"><label>Song text you have permission to use<textarea name="lyrics" rows="9" maxlength="20000" required placeholder="Paste the exact version for analysis. This text is not saved in your library."></textarea></label><label>Arrangement evidence<textarea name="arrangement" rows="3" maxlength="4000" placeholder="For example: 4 minutes, two verses, repeated chorus, 45 seconds of wordless vocals. Leave blank if unknown."></textarea></label><p class="muted">Current rating parameters will be included. Applying a draft preserves the previous assessment and keeps your personal notes.</p><p id="ai-error" role="alert"></p><div class="form-actions"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary" ${aiConfigured ? "" : "disabled"}>Generate draft</button></div></form>`,
    );
});
document.addEventListener("pointermove", event => {
  if (suppressRailHover && !event.target.closest(".sidebar")) { suppressRailHover = false; document.querySelector(".sidebar")?.classList.remove("suppress-hover"); }
});
document.addEventListener("input", (event) => {
  if (["evaluation-json","evaluation-text-override","audit-json","plan-import-json"].includes(event.target.id) || event.target.closest(".import-plan-rows")) unsavedForm=true;
  if (event.target.closest(".plan-library-picker") && event.target.type === "checkbox") unsavedForm = !dialog.querySelector("#picker-add")?.disabled;
  if (event.target.closest("form") && !event.target.closest("#auth-form") && !event.target.readOnly) unsavedForm = true;
  if(unsavedForm)updateSaveStrip();
  if(event.isComposing)return;
  if(event.target.id==='collection-search') {collectionQuery=event.target.value;collectionPages.clear();scheduleSearchUpdate('collections');return;}
  if(event.target.dataset.collectionSearch) {const id=event.target.dataset.collectionSearch;collectionSettings.set(id,{...collectionSettings.get(id),query:event.target.value});collectionPages.set(id,1);scheduleSearchUpdate('collection',id);return;}
  if(event.target.id==='search') {query=event.target.value;songPage=1;scheduleSearchUpdate('songs');}

});
document.addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.target.dataset.pageKind||event.target.dataset.collectionPage)) { event.preventDefault(); event.target.dispatchEvent(new Event("change", {bubbles:true})); }
});
document.addEventListener("change", (event) => {
  if(event.target.closest(".import-plan-rows"))unsavedForm=true;
  if(event.target.closest(".plan-library-picker") && event.target.type === "checkbox") { unsavedForm = !dialog.querySelector("#picker-add")?.disabled; updateSaveStrip(); }
  if(event.target.id==="analysis-lens") {
    if(unsavedForm || !editableWorkspace()){event.target.value=state.activeLensId||'main';toast(unsavedForm?"Save your current edits before switching lenses.":"This workspace is view only.");return;}
    try {if(!commitWorkspace(validateWorkspace(syncCatalog(switchLens(state,event.target.value)))))return; songPage=1;indexPageNumber=1;render();toast("Analysis lens changed.");}catch(error){event.target.value=state.activeLensId||'main';toast(error.message);}return;
  }
  if(event.target.id==="workspace-select") {
    const value=event.target.value;
    if(value==="__manage__"){updateWorkspaceSwitcher();organizationDialog();return;}
    switchOrganization(value==="personal"?null:organizationList.find(o=>o.id===value)).catch(error=>{updateWorkspaceSwitcher();toast(error.message);});return;
  }
  if (event.target.closest("form") && !event.target.closest("#auth-form")) {unsavedForm = true;updateSaveStrip();}
  if (event.target.dataset.pageKind) {
    const value = Math.max(1, Math.min(Number(event.target.max), Math.trunc(Number(event.target.value) || 1)));
    if (event.target.dataset.pageKind === "song") { songPage = value; selected = null; } else indexPageNumber = value;
    render();
    const results = document.querySelector(".song-list"); if (results) results.scrollTop = 0;
    return;
  }
  if (event.target.id === "collection-order") { collectionSort = event.target.value; render(); return; }
  if (event.target.id === "collection-group") { collectionGroup = event.target.value; render(); return; }
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
  const collectionId=event.target.dataset.collectionDepth||event.target.dataset.collectionSort||event.target.dataset.collectionPage;
  if(collectionId) {
    if(event.target.dataset.collectionPage)collectionPages.set(collectionId,Math.max(1,Number(event.target.value)||1));
    else {collectionSettings.set(collectionId,{...collectionSettings.get(collectionId),[event.target.dataset.collectionDepth?'depth':'sort']:event.target.value});collectionPages.set(collectionId,1);}
    updateCollectionResults(collectionId);return;
  }
  if (event.target.id === "collection-depth") {
    collectionPages.clear();
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
  else if (event.target.id === "sort-order") songSorts[view] = event.target.value;
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
  unsavedForm = false;
  event.preventDefault();
  const form = event.target,
    fd = new FormData(form),
    values = Object.fromEntries(fd),
    id = form.dataset.id;
  if(!editableWorkspace()&&!['auth-form','password-form','index-filter-form','index-browse-form','criteria-form'].includes(form.id))return toast("This organization is view only.");
  const lines = (key) =>
    String(values[key] || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  if (form.id === "inline-attribution-form") {
    if(form.dataset.store!==activeStore)return toast("The active workspace changed.");
    const next=clone(state),song=next.songs.find(s=>s.id===id);if(!song)return;
    song.author=values.author.trim();song.facts||={};song.facts.author={confidence:"confirmed",source:"Edited by the workspace user."};
    if(!commitWorkspace(validateWorkspace(next)))return;render();toast("Attribution saved.");return;
  }
  if (form.id === "recording-form") {
    try {
      const next = clone(state), song = next.songs.find(s => s.id === id);
      song.recordings = validateRecordings([...(song.recordings || []), { id: uid(), provider: values.provider, url: recordingURL(values.provider, values.url), label: values.label.trim() }]);
      if (!commitWorkspace(validateWorkspace(next))) return;
      render(); recordingsDialog(state.songs.find(s => s.id === id)); toast("Recording link saved.");
    } catch (err) { form.querySelector("#recording-error").textContent = err.message; }
    return;
  }
  if (form.id === "song-file-form") {
    const song = state.songs.find(s => s.id === id), file = fd.get("file"), store = activeStore, owner = accounts.user?.id;
    const submit = form.querySelector("button"); submit.disabled = true;
    try {
      if (!file?.size || file.size > MAX_SONG_FILE_BYTES) throw new Error("Choose a nonempty file up to 10 MB.");
      if ((song.files || []).length >= 50) throw new Error("A song can have up to 50 files.");
      const fileId = uid(), name = file.name.slice(0,200), path = owner ? filePath(activeOrganization?.id || owner, id, fileId, name) : store + ":" + id + ":" + fileId;
      if (activeOrganization) await organizationsClient.uploadFile(activeOrganization.id,path,file); else if (owner) await accounts.uploadSongFile(path, file); else await deviceFile("put", path, file);
      if (store !== activeStore || owner !== accounts.user?.id || !form.isConnected) return;
      const next = clone(state), target = next.songs.find(s => s.id === id);
      target.files ||= []; target.files.push({ id: fileId, name, size: file.size, mime: file.type, path, storage: activeOrganization ? "organization" : owner ? "account" : "device" });
      if (!commitWorkspace(validateWorkspace(next))) return;
      songFiles(state.songs.find(s => s.id === id)); toast("File attached.");
    } catch (err) { if (form.isConnected) form.querySelector("#file-error").textContent = err.message; }
    finally { if (submit.isConnected) submit.disabled = false; }
    return;
  }
  if (form.id === "fact-form") {
    const next = clone(state), song = next.songs.find(s => s.id === id), field = form.dataset.field;
    if (["minutes", "key"].includes(field)) song.review[field] = field === "minutes" ? Number(values.value) : values.value.trim();
    else if (field === "author") song.author = values.value.trim();
    else { song.metadata ||= {}; song.metadata[field] = field === "tempo" ? Number(values.value) : values.value.trim(); }
    song.facts ||= {}; song.facts[field] = { confidence: values.confidence, source: values.source.trim() || "Edited by account owner." };
    invalidateApproval(song);
    try { if (!commitWorkspace(validateWorkspace(next))) return; }
    catch (err) { toast(err.message); return; }
    dialog.close(); render(); return;
  }
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
      const songs = importDraft.songs.filter((song) => importDraft.bulk || selected.has(song.id));
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
      mode = effectiveProfile().aiMode;
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
          .filter(s => s && !s.blacklisted) || [];
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
        effectiveProfile().aiMode !== mode ||
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
        `<h2>Library criteria search</h2><p>${e(values.criteria)}</p><p class="muted">${matches.length} tentative matches of ${songs.length} songs · ${e(result.model)}. These are AI interpretations of supplied excerpts and records. Results follow library order, with no ranking or service selection.</p><ul class="criteria-results">${renderResults(matches) || "<li>No tentative matches were supported by the supplied records.</li>"}</ul><details><summary>Other results (${other.length})</summary><ul class="criteria-results">${renderResults(other)}</ul></details><p class="muted">Results are temporary. Your evaluations, metrics, libraries and plans are unchanged.</p><button class="button" data-action="close">Close search</button>`,
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
          themesForDisplay(song, effectiveProfile().aiMode).join(",")
      )
        invalidateApproval(song);
      if (
        !song.metadata?.themes &&
        JSON.stringify(metadata.themes) ===
          JSON.stringify(themesForDisplay(song, effectiveProfile().aiMode))
      )
        delete metadata.themes;
      song.metadata = metadata;
      song.facts ||= {};
      for (const field of ["tempo", "tune", "meter", "timeSignature", "range"])
        if (metadata[field] !== null && metadata[field] !== "") song.facts[field] = { confidence: "confirmed", source: "Entered by account owner." };
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
      accounts.setRememberMe(values.remember==='on',values.email);
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
      try{await refreshOrganizations();}catch{}
      if (dialog.open) dialog.close();
      render();
      toast(organizationInvitations.length ? `${organizationInvitations.length} organization invitation${organizationInvitations.length===1?"":"s"} available under Workspaces.` : "Signed in. Your browser-only workspace is preserved separately.");
      if(new URLSearchParams(location.search).has("invitation"))await organizationDialog();
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
      const restoreContext=historyContext(),restoreSignature=workspaceSignature(state);
      document.querySelector("#confirm-restore").onclick = async event => {
        const button=event.currentTarget;button.disabled=true;button.textContent='Restoring…';
        try {await restoreHistoryWorkspace(restored,restoreSignature,false,restoreContext,{preserveAI:false});}
        catch(error){const message=document.querySelector("#confirm-restore-error");if(message)message.textContent=error.message;button.disabled=false;button.textContent='Replace with this backup';}
      };
    } catch (error) {
      form.querySelector("#restore-error").textContent =
        error instanceof SyntaxError
          ? "This file is not valid JSON. Choose an exported Faithful Repertoire backup."
          : error.message;
    }
    return;
  }
  if (form.id === "new-lens-form") {
    try {if(!commitWorkspace(validateWorkspace(createLens(state,{id:uid(),name:values.name,purpose:values.purpose}))))return;dialog.close();unsavedForm=false;view="profile";render();toast("Lens created. Edit its criteria below.");}catch(error){form.querySelector('#lens-error').textContent=error.message;}return;
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
    view = song.blacklisted ? "blacklist" : "discover";
    query = song.title;
    songPage = 1;
    themeFilter = approvalFilter = typeFilter = reviewFilter = "";
    toast("Song added. Start an assessment when ready.");
  } else if (form.id === "review-form") {
    const song = state.songs.find((s) => s.id === id),
      prev = clone(song.review);
    delete prev.previous;
    const savedAI = retainedAiReview(song);
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
          values[`score-${k}`] === undefined ? song.review.scores[k] : values[`score-${k}`] === "" ? null : Number(values[`score-${k}`]),
        ]),
      ),
      customScores: { ...song.review.customScores, ...Object.fromEntries(ratingCriteria(state.profile).filter(c => c.id.startsWith("custom-")).map(c => [c.id, values[`score-${c.id}`] === "" ? null : Number(values[`score-${c.id}`])])) },
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
    if (savedAI && prev.status !== "manual") {
      song.aiReview = clone(savedAI); delete song.aiReview.previous;
      song.aiDismissed = false;
      if (!persist()) return;
      dialog.close(); render();
      modal(`<h2>Your evaluation is now primary</h2><p>Keep the AI version as a secondary, collapsed evaluation, or delete it from this song?</p><div class="form-actions"><button class="button" data-action="close">Keep AI evaluation</button><button class="button" data-action="delete-ai-evaluation" data-id="${e(song.id)}">Delete AI evaluation</button></div>`);
      return;
    }
    toast(
      "Your evaluation has been saved. Your evaluation was updated. Use libraries to record your own decisions.",
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
    if(activeOrganization)personalAI={aiMode:values.aiMode,aiLabels:values.aiLabels!=="off"};
    let criteria, weights = {...state.profile.weights};
    try {
      criteria = validateCriteria([...form.querySelectorAll(".criterion-row")].map(row => ({id:row.dataset.criterion, label:row.querySelector('[name="criterion-label"]').value, rubric:row.querySelector('[name="criterion-rubric"]').value, active:row.querySelector('[name="criterion-active"]').checked})));
      for (const row of form.querySelectorAll(".criterion-row")) weights[row.dataset.criterion] = Number(row.querySelector('[name="criterion-weight"]').value);
      if (!criteria.some(c => c.active && weights[c.id] > 0)) throw new Error("Keep at least one active criterion with a positive weight.");
    } catch (err) { form.querySelector("#profile-error").textContent = err.message; return; }
    const nextProfile = {
      ...state.profile,
      weights,
      criteria,
      principles: values.principles,
      evaluationPurpose: values.evaluationPurpose,
      aiMode: values.aiMode,
      aiLabels: values.aiLabels !== "off",
      setupComplete: true,
    };
    try {if(!commitWorkspace(validateWorkspace(renameActiveLens({...state,profile:nextProfile},values.lensName))))return;}catch(error){form.querySelector("#profile-error").textContent=error.message;return;}
    unsavedForm=false;
    persist();
    render();
    toast("Evaluation criteria saved. Existing assessments preserved.");
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
    toast("Plan saved.");
  } else if (form.id === "add-to-plan-form") {
    const p = state.plans.find((p) => p.id === values.plan);
    const song = state.songs.find((s) => s.id === id),
      arrangement = song.arrangements?.find((a) => a.id === values.arrangement);
    insertPlanItems(p,[{
      ...(arrangement
        ? { arrangementId: arrangement.id, arrangementName: arrangement.name }
        : {}),
      id: uid(),
      type: "song",
      songId: id,
      role: "",
      key: values.key,
      minutes: Number(values.minutes),
      notes: "",
    }],values.after||"__end__");
    planId = p.id;
    view = "plans";
    toast("Song added to your plan.");
  } else if (form.id === "item-form") {
    const p = getPlan(),
      item = id
        ? p.items.find((i) => i.id === id)
        : { id: uid(), type: form.dataset.type||"other", role:"" };
    Object.assign(item, { ...(values.title!==undefined?{title:values.title.trim()}:{}), ...(values.key!==undefined?{key:values.key}:{}), notes:values.notes, minutes: item.type==="heading" ? 0 : Number(values.minutes) });
    if (!id) insertPlanItems(p,[item],values.after||"__end__");
    toast("Plan item saved.");
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
          profile: effectiveProfile().principles,
          aiMode: effectiveProfile().aiMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis failed.");
      const draft = restrictAssistance(
        validateReview(result.review),
        effectiveProfile().aiMode,
      );
      if (!form.isConnected || !dialog.open) return;
      if (effectiveProfile().aiMode === "limited") {
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
            "Assistance notes saved. Your evaluation and libraries are unchanged.",
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
          )}</div><h3>Claims</h3>${list(draft.claims)}<h3>Concerns</h3>${list(draft.concerns)}<h3>Scripture connections</h3>${list(draft.scriptures)}<h3>Language</h3><p>${e(draft.language)}</p><h3>Arrangement observations</h3><p>${e(draft.time)}</p><div class="form-actions"><button class="button" data-action="close">Discard</button><button class="button primary" id="apply-draft">Apply draft</button></div>`,
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
        humanFirst(song);
        song.aiDismissed = false;
        if (draft.themes.length && song.review.status === "ai") song.themes = draft.themes;
        if (song.review.status !== "manual") invalidateApproval(song);
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
function hasUnsubmittedEdits() {
  if (dialog.open && ["#evaluation-json", "#evaluation-text-override", "#audit-json"].some(selector => dialog.querySelector(selector)?.value.trim())) return true;
  return [...document.querySelectorAll("form:not(#auth-form)")].some(form => {
    if (!form.getClientRects().length || (form.closest("dialog") && !form.closest("dialog").open)) return false;
    return [...form.elements].some(field => {
      if (field.disabled || field.readOnly || ["submit","button","hidden"].includes(field.type)) return false;
      if (["checkbox","radio"].includes(field.type)) return field.checked !== field.defaultChecked;
      if (field.type === "file") return field.files.length > 0;
      if (field.tagName === "SELECT") return field.value !== ([...field.options].find(o => o.defaultSelected)?.value ?? field.options[0]?.value);
      return field.value !== field.defaultValue;
    });
  });
}
function hasPendingWork() {
  const accountPending = accounts.user && activeStore !== STORE && accountSave.signature !== workspaceSignature(state) && (accountSave.remoteAvailable || accountSave.initialSignature !== workspaceSignature(state));
  return historyRestorePending || localSaveFailed || unsavedForm || hasUnsubmittedEdits() || accountPending;
}
startPWA({canRefresh: () => !hasPendingWork()});
window.addEventListener("beforeunload", event => {
  if (hasPendingWork()) { event.preventDefault(); event.returnValue = ""; }
});
dialog.addEventListener('cancel',event=>{if(historyRestorePending)event.preventDefault();});
window.addEventListener("online", () => { if (accounts.user && autosave.enabled) autosave.retry(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && autosave.enabled) autosave.flush(); });
dialog.addEventListener("close", () => { unsavedForm = false; updateSaveStrip(); });
window.addEventListener("storage", async event => {
  if (event.key !== "faithful-repertoire-session" && event.key !== null) return;
  if (!accounts.syncStoredSession()) return;
  if (dialog.open) dialog.close();
  if (!accounts.user) { guestOptIn = false; sessionStorage.removeItem("faithful-guest-opt-in"); }
  switchWorkspace(accounts.user);
  if (accounts.user) await startAccountCheck();
  else { accountReady = true; render(); }
});
window.addEventListener("hashchange", () => {
  const nextView=location.hash==="#home"?"home":location.hash==="#about"?"about":["home","about"].includes(view)?"discover":view;
  if(nextView===view)return;
  if(view==="profile" && (unsavedForm || hasUnsubmittedEdits())) {
    if(!confirm("Discard unsaved evaluation criteria? Choose Cancel to keep editing.")){history.replaceState(null,"",location.pathname+location.search);return;}
    unsavedForm=false;
  }
  view=nextView;render();window.scrollTo(0,0);
});
render();
if (!storageProblem && (accounts.user || guestOptIn)) persist();
if (accounts.configured) {
  const confirmation = location.hash.includes("access_token=")
    ? location.hash
    : null;
  if (confirmation)
    history.replaceState(null, "", location.pathname + location.search);
  startAccountCheck(confirmation);
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

// Failed external artwork leaves a quiet text-only record.
document.addEventListener("error",event=>{if(event.target.matches?.("img.album-art"))event.target.hidden=true;},true);
let draggedPlanItem=null, pointerPlanDrag=null;
function finishPlanDrag(id,target,after) {
  if(!editableWorkspace())return;
  const plan=getPlan();if(!plan||!id||!target||id===target)return;
  const next=clone(state),changed=next.plans.find(p=>p.id===plan.id);movePlanItem(changed,id,target,after);
  if(!commitWorkspace(validateWorkspace(next)))return;render();toast("Plan item moved.");
}
function dropTarget(x,y) {
  const hit=document.elementFromPoint(x,y),list=document.querySelector('.service-items');
  let row=hit?.closest("[data-plan-item]");
  if(!row&&list&&hit?.closest('.service-items')===list){const rows=[...list.querySelectorAll('[data-plan-item]')];row=rows.find(el=>{const rect=el.getBoundingClientRect();return y<rect.y+rect.height/2;})||rows.at(-1);}

  document.querySelectorAll(".drop-before,.drop-after").forEach(el=>el.classList.remove("drop-before","drop-after"));
  if(!row)return null;const rect=row.getBoundingClientRect(),after=y>rect.y+rect.height/2;row.classList.add(after?"drop-after":"drop-before");return {id:row.dataset.planItem,after};
}
document.addEventListener("dragstart",event=>{const row=event.target.closest?.("[data-plan-item]");if(!row)return;draggedPlanItem=row.dataset.planItem;event.dataTransfer.setData("text/plain",draggedPlanItem);event.dataTransfer.effectAllowed="move";});
document.addEventListener("dragover",event=>{if(!draggedPlanItem)return;event.preventDefault();dropTarget(event.clientX,event.clientY);});
document.addEventListener("drop",event=>{if(!draggedPlanItem)return;event.preventDefault();const target=dropTarget(event.clientX,event.clientY);if(target)finishPlanDrag(draggedPlanItem,target.id,target.after);draggedPlanItem=null;});
document.addEventListener("dragend",()=>{draggedPlanItem=null;document.querySelectorAll(".drop-before,.drop-after").forEach(el=>el.classList.remove("drop-before","drop-after"));});
document.addEventListener("pointerdown",event=>{const handle=event.target.closest?.(".plan-drag-handle");if(!handle||!editableWorkspace())return;event.preventDefault();pointerPlanDrag={id:handle.closest("[data-plan-item]").dataset.planItem,pointer:event.pointerId};handle.setPointerCapture(event.pointerId);});
document.addEventListener("pointermove",event=>{if(!pointerPlanDrag||event.pointerId!==pointerPlanDrag.pointer)return;pointerPlanDrag.target=dropTarget(event.clientX,event.clientY);if(event.clientY<48)window.scrollBy(0,-16);else if(event.clientY>innerHeight-48)window.scrollBy(0,16);});
document.addEventListener("pointerup",event=>{if(!pointerPlanDrag||event.pointerId!==pointerPlanDrag.pointer)return;const drag=pointerPlanDrag;pointerPlanDrag=null;if(drag.target)finishPlanDrag(drag.id,drag.target.id,drag.target.after);document.querySelectorAll(".drop-before,.drop-after").forEach(el=>el.classList.remove("drop-before","drop-after"));});
document.addEventListener("pointercancel",()=>{pointerPlanDrag=null;document.querySelectorAll(".drop-before,.drop-after").forEach(el=>el.classList.remove("drop-before","drop-after"));});

function organizationStore(id,user=accounts.user?.id) { return `faithful-repertoire-organization:${user}:${id}`; }
function editableWorkspace() { return canEditOrganization(activeOrganization); }
function effectiveProfile() { return activeOrganization ? {...state.profile,...personalAI} : state.profile; }
function saveOrganizationBase() { if(activeOrganization&&organizationBase)try{localStorage.setItem(activeStore+":sync-base",JSON.stringify({revision:organizationRevision,workspace:organizationBase}));}catch{} }
function cacheOrganization() { try{captureBeforeWrite(state);localStorage.setItem(activeStore,JSON.stringify(state));return true;}catch{localSaveFailed=true;toast("Browser storage is full. Download a backup before leaving.");return false;} }
function keepOrganizationDraft() { if(!activeOrganization)return;try{localStorage.setItem(activeStore+":draft:"+Date.now(),JSON.stringify(state));}catch{toast("The browser draft could not be stored. Download a backup before switching.");throw new Error("Browser storage is unavailable.");} }
async function savePersonalAIPreferences() {
  if(!accounts.user)return;
  const key=`faithful-repertoire-user:${accounts.user.id}`;
  let personal;try{const raw=localStorage.getItem(key);personal=raw?validateWorkspace(JSON.parse(raw)):syncCatalog(freshState());}catch{return toast("Personal preferences could not be loaded. Your shared workspace was not changed.");}
  Object.assign(personal.profile,personalAI);localStorage.setItem(key,JSON.stringify(personal));
  try{await accounts.saveProfile(personal.profile);}catch{toast("Display preferences are saved in this browser. Retry profile sync when connected.");}
}
async function refreshOrganizations(options={}) {
  const owner=accounts.user?.id;if(!owner)return;
  let created=null;
  if(options.createName) {
    const fresh=syncCatalog(freshState());fresh.libraries=[{id:uid(),name:"Shared repertoire",songIds:[]}];fresh.plans=[];
    created=await organizationsClient.create(options.createName,fresh);
  }
  const result=await organizationsClient.list();if(owner!==accounts.user?.id)return;
  organizationList=result.organizations;organizationInvitations=result.invitations;organizationServiceAvailable=true;
  if(activeOrganization){const current=organizationList.find(org=>org.id===activeOrganization.id);if(current){const changedRole=current.role!==activeOrganization.role;activeOrganization=current;if(changedRole)render();}else await returnToPersonal(true);}
  updateWorkspaceSwitcher();return created;
}
function updateWorkspaceSwitcher() {
  const banner=app.querySelector('.organization-banner');
  if(banner&&activeOrganization)banner.innerHTML=`<strong>${e(activeOrganization.name)}</strong> · ${e(organizationRoles[activeOrganization.role])}${editableWorkspace()?" · Shared changes sync automatically":" · Changes are disabled in this workspace"}`;
  const select=app.querySelector("#workspace-select");if(!select)return;
  select.innerHTML=`<option value="personal">Personal</option>${organizationList.map(org=>`<option value="${e(org.id)}" ${activeOrganization?.id===org.id?"selected":""}>${e(org.name)}${org.role==="viewer"?" · View only":""}</option>`).join("")}<option value="__manage__">Organizations & invitations${organizationInvitations.length?` (${organizationInvitations.length})`:""}</option>`;
  select.value=activeOrganization?.id||"personal";
}
async function organizationDialog() {
  if(!accounts.user)return accountDialog();
  const owner=accounts.user.id;
  modal('<h2>Organizations</h2><p role="status">Loading your workspaces…</p>');
  try{await openOrganizations({client:organizationsClient,accounts,modal,current:activeOrganization,stillCurrent:()=>accounts.user?.id===owner,onChanged:refreshOrganizations,onSwitch:switchOrganization});}
  catch(error){if(owner===accounts.user?.id)modal(`<h2>Organizations</h2><p role="alert">${e(error.message)}</p><button class="button" data-action="organizations">Retry</button>`);}
}
async function returnToPersonal(revoked=false) {
  if(revoked&&activeOrganization&&dialog.open) {
    const form=dialog.querySelector('#review-form,#item-form,#plan-form,#index-details-form,#inline-attribution-form,#recording-form');
    if(form)try{const draft=clone(state);draft.pendingForm={name:form.id,fields:Object.fromEntries([...new FormData(form)].filter(([,value])=>typeof value==='string'))};localStorage.setItem(activeStore+':draft:'+Date.now()+':'+uid(),JSON.stringify(draft));}catch{}
    dialog.close();
  }
  if(revoked&&activeOrganization)organizationList=organizationList.filter(org=>org.id!==activeOrganization.id);
  const owner=accounts.user;if(!owner)return;
  if(activeOrganization&&organizationBase&&workspaceSignature(state)!==workspaceSignature(organizationBase))keepOrganizationDraft();
  const previousView=view;
  organizationLoadVersion++;activeOrganization=null;organizationBase=null;organizationRevision=null;pendingOrganizationRemote=null;
  try{localStorage.removeItem(`faithful-repertoire-last-organization:${owner.id}`);}catch{}
  switchWorkspace(owner);view=previousView;render();await loadAccountProfile();
  if(revoked)toast("Organization access ended. Personal is open; any unsynced browser draft was kept privately.");
}
async function switchOrganization(org) {
  if(activeOrganization?.id===org?.id){dialog.close();return;}
  if(autosave.enabled&&(autosave.running||autosave.pending))await autosave.flush();
  if(activeOrganization&&organizationBase&&workspaceSignature(state)!==workspaceSignature(organizationBase)) {
    if(!confirm("Changes have not synced. Keep a private browser draft and switch workspaces?"))return;
    keepOrganizationDraft();
  }
  if(!org){if(dialog.open)dialog.close();await returnToPersonal();return;}
  const owner=accounts.user?.id,version=++organizationLoadVersion,previousView=view;
  const remote=await organizationsClient.snapshot(org.id);if(owner!==accounts.user?.id||version!==organizationLoadVersion)return;
  let cached=null,base=null;
  try{const key=organizationStore(org.id,owner),raw=localStorage.getItem(key),savedBase=localStorage.getItem(key+":sync-base");if(raw)cached=validateWorkspace(JSON.parse(raw));if(savedBase)base=JSON.parse(savedBase).workspace;}catch{}
  autosave.reset(false);activeOrganization={...org,...remote};delete activeOrganization.workspace;
  activeStore=organizationStore(org.id,owner);organizationBase=syncCatalog(remote.workspace);organizationRevision=remote.revision;pendingOrganizationRemote=null;
  state=clone(organizationBase);let conflict=false;
  if(cached&&workspaceSignature(cached)!==workspaceSignature(organizationBase)) {
    if(editableWorkspace())try{if(!base)throw new Error("The saved browser copy has no verified shared baseline.");state=validateWorkspace(mergeWorkspaces(base,syncCatalog(cached),organizationBase));}catch{state=syncCatalog(cached);conflict=true;}
    else {const saved=state;state=cached;keepOrganizationDraft();state=saved;}
  }
  resetSelection();view=previousView;accountReady=true;
  accountSave={phase:conflict?"conflict":"local",signature:workspaceSignature(organizationBase),remoteAvailable:true};
  saveOrganizationBase();cacheOrganization();autosave.reset(editableWorkspace()&&!conflict);
  if(!conflict&&editableWorkspace()&&workspaceSignature(state)!==workspaceSignature(organizationBase))autosave.enqueue(state);
  try{localStorage.setItem(`faithful-repertoire-last-organization:${owner}`,org.id);}catch{}
  if(dialog.open)dialog.close();render();
}
async function saveActiveWorkspace(snapshot) {
  if(!activeOrganization)return accounts.saveWorkspace(snapshot);
  const org=activeOrganization.id,owner=accounts.user?.id,store=activeStore,base=clone(organizationBase),revision=organizationRevision;
  let actual=validateWorkspace(snapshot),saved;
  try{saved=await organizationsClient.save(org,revision,actual);}
  catch(error){
    if(error.name!=="WorkspaceConflictError")throw error;
    const remote=await organizationsClient.snapshot(org);
    if(owner!==accounts.user?.id||store!==activeStore)throw new Error("The active workspace changed.");
    actual=validateWorkspace(mergeWorkspaces(base,actual,syncCatalog(remote.workspace)));
    saved=await organizationsClient.save(org,remote.revision,actual);
  }
  if(owner===accounts.user?.id&&store===activeStore){organizationRevision=saved.revision;organizationBase=clone(actual);saveOrganizationBase();}
  return {workspace:actual};
}
async function syncOrganization(force=false) {
  if(!activeOrganization||organizationSyncing||!accounts.user||(!force&&document.hidden))return;
  const id=activeOrganization.id,owner=accounts.user.id,store=activeStore,version=organizationLoadVersion;
  organizationSyncing=true;
  try {
    const remote=await organizationsClient.snapshot(id,force?null:organizationRevision);
    if(owner!==accounts.user?.id||store!==activeStore||version!==organizationLoadVersion)return;
    const oldRole=activeOrganization.role;activeOrganization={...activeOrganization,...remote};delete activeOrganization.workspace;
    updateWorkspaceSwitcher();restrictOrganizationControls();
    if(oldRole!==remote.role)toast(`Organization access changed to ${organizationRoles[remote.role]}.`);
    if(!editableWorkspace()) {
      autosave.reset(false);
      if(organizationBase&&workspaceSignature(state)!==workspaceSignature(organizationBase)){keepOrganizationDraft();state=clone(organizationBase);cacheOrganization();}
    }
    if(!remote.workspace){
      if(editableWorkspace()&&accountSave.phase==="error"){accountSave.phase="local";autosave.reset(true);if(workspaceSignature(state)!==workspaceSignature(organizationBase))autosave.enqueue(state);updateSaveStrip();}
      if(oldRole!==remote.role)render();return;
    }
    if(autosave.running||dialog.open||unsavedForm){pendingOrganizationRemote=remote;return;}
    const latest=syncCatalog(remote.workspace),base=organizationBase;
    let merged=latest;
    if(editableWorkspace()&&base&&workspaceSignature(state)!==workspaceSignature(base))merged=validateWorkspace(mergeWorkspaces(base,state,latest));
    organizationRevision=remote.revision;organizationBase=latest;state=clone(merged);saveOrganizationBase();cacheOrganization();
    accountSave={phase:"local",signature:workspaceSignature(latest),remoteAvailable:true};autosave.reset(editableWorkspace());
    if(editableWorkspace()&&workspaceSignature(state)!==workspaceSignature(latest))autosave.enqueue(state);
    if(oldRole!==remote.role||workspaceSignature(base)!==workspaceSignature(latest))render();else updateSaveStrip();
    pendingOrganizationRemote=null;
  } catch(error) {
    if(owner!==accounts.user?.id||store!==activeStore)return;
    if(error.status===403||error.status===401){await returnToPersonal(true);return;}
    accountSave.phase=error.name==="WorkspaceConflictError"?"conflict":"error";
    if(error.name==="WorkspaceConflictError")autosave.reset(false);
    updateSaveStrip();
  } finally {organizationSyncing=false;}
}
async function reviewOrganizationCopy() {
  const org=activeOrganization,store=activeStore;modal('<h2>Shared workspace</h2><p role="status">Loading the latest organization copy…</p>');
  try {
    const remote=await organizationsClient.snapshot(org.id);if(store!==activeStore)return;
    modal(`<h2>Review shared changes</h2><p>Your browser copy has ${state.plans.length} plans and ${state.libraries.length} libraries. The shared copy has ${remote.workspace.plans.length} plans and ${remote.workspace.libraries.length} libraries.</p><p>When the same field changes in both copies, choose which edits to carry across. Loading keeps a private browser draft of your current copy.</p><button class="button" id="download-org-draft">Download browser draft</button><button class="button primary" id="load-org-shared">Keep browser draft & load shared copy</button>`);
    dialog.querySelector("#download-org-draft").onclick=()=>download("organization-browser-draft.json",JSON.stringify(state,null,2),"application/json");
    dialog.querySelector("#load-org-shared").onclick=()=>{if(store!==activeStore)return;keepOrganizationDraft();organizationBase=syncCatalog(remote.workspace);organizationRevision=remote.revision;state=clone(organizationBase);accountSave={phase:"local",signature:workspaceSignature(state),remoteAvailable:true};autosave.reset(editableWorkspace());saveOrganizationBase();cacheOrganization();dialog.close();render();toast("Shared copy loaded. Your earlier browser draft is retained.");};
  }catch(error){if(store===activeStore)modal(`<h2>Shared workspace</h2><p role="alert">${e(error.message)}</p>`);}
}
function organizationDraftsDialog() {
  const prefix=`faithful-repertoire-organization:${accounts.user?.id}:`,keys=[];
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix)&&key.includes(":draft:"))keys.push(key);}
  modal(`<h2>Private browser drafts</h2><p>These copies contain unsynced organization edits from this browser. They are not uploaded to your Personal workspace.</p>${keys.length?keys.map((key,i)=>`<p>Draft ${i+1} <button class="button" data-draft-index="${i}">Download</button></p>`).join(""):"<p>No retained drafts.</p>"}`);
  for(const button of dialog.querySelectorAll("[data-draft-index]"))button.onclick=()=>download("organization-draft.json",localStorage.getItem(keys[Number(button.dataset.draftIndex)]),"application/json");
}
function restrictOrganizationControls() {
  if(editableWorkspace())return;
  const readActions=new Set(["nav","account","organizations","organization-drafts","version-history","close","song-select","song-tab","library-select","plan-select","index-open","catalog-open","clear-filters","song-page","index-page","first-song-page","last-song-page","collection-page","sync-profile","sort","export","export-plan","export-plan-json","export-library","print-plan","download-song-file","song-files","song-recordings","backup","cloud-load","retry-autosave","toggle-ai-labels","signout","change-password","reset-index","remove-index-filter","apply-index-view","export-index","library-audit","workspace-evaluation","evaluation-history","plan-templates","copy-criteria-prompt","prepare-chatgpt-criteria"]);
  for(const button of app.querySelectorAll("button[data-action]"))if(!readActions.has(button.dataset.action)){button.disabled=true;button.title="View-only organization access";}
  for(const row of app.querySelectorAll("[data-plan-item]"))row.draggable=false;
}

function organizationSaveLabel() {
  if(!editableWorkspace())return "View-only organization workspace";
  if(accountSave.phase==="saving")return "Saving shared changes…";
  if(accountSave.phase==="error")return "Shared sync is offline or failed. Your browser copy is retained.";
  if(accountSave.phase==="conflict")return "Shared edits overlap. Review the shared copy; your browser draft is kept.";
  return accountSave.signature===workspaceSignature(state)?"Shared workspace is up to date":"Saved in this browser. Shared upload is pending.";
}
setInterval(()=>syncOrganization(),3000);
window.addEventListener("online",()=>syncOrganization(true));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncOrganization(true);});
dialog.addEventListener("close",()=>{unsavedForm=false;if(activeOrganization&&pendingOrganizationRemote)syncOrganization(true);});
