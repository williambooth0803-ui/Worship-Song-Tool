# Installable Faithful Repertoire

The existing website is also a Progressive Web App (PWA). No app-store account,
new backend, paid service or database migration is required.

## Install

Open https://faithful-repertoire.pages.dev/ in your usual browser, click the logo
to open Home, then choose **Install app**. The same control is in Settings.

- Chrome/Edge: use the offered install prompt or the browser's install menu.
- iPhone/iPad: open in Safari, choose Share → Add to Home Screen, leave
  **Open as Web App** enabled if shown, then Add.
- Mac Safari: File → Add to Dock.

The browser decides whether to offer native installation. Private browsing,
embedded browsers and some older browsers only allow shortcuts or no installation.
The app provides manual instructions when no native prompt is available. Dismissing
an install prompt never marks installation successful. An installed window shows
**App installed**.

Use the same site address and browser as your existing repertoire. Cloudflare and
GitHub Pages have separate browser storage. Some platforms also isolate installed
app storage. Sign in to reopen an account workspace; transfer browser-only work
using Backup & restore when necessary. Installation never moves, merges, clears
or replaces a workspace.

## Offline behavior

After its first successful shell download, the app can reopen without a
connection. Existing on-device browser work remains editable, including plans
and notes. The existing account startup/recovery flow can open a previously saved
account copy with uploads paused. Signing in, checking shared membership, cloud
sync/history, online analysis and downloading account attachments need a connection.
Remote artwork and links may be unavailable. No new background-sync or private
attachment download service is included.

An offline notice is separate from save status: **Saved on this device** does not
mean a change has reached an account. Existing account conflict/retry controls and
three-way shared-workspace merging stay in charge when the connection returns.
Keep an independent backup; browsers can evict local storage and caches.

## Updates and privacy

The build creates a content-versioned service worker with an explicit public-file
allowlist. It installs the whole shell successfully before offering an upgrade.
Each running version uses its own cached files, avoiding a routine mix of old and
new modules. A failed download preserves the working version. **Update app** asks
every open app window whether it can safely refresh; unapplied forms, pending
account saves, failed device saves and history restores block activation. Finish
editing or close another window and retry. Closing all app windows also allows
the browser to activate a fully downloaded waiting version normally.

Activation removes only older Faithful Repertoire shell caches for that exact
installation path. It never clears localStorage, IndexedDB, session data or
workspace history. Root and repository-subpath deployments keep separate scopes.

Cache Storage contains shipped public HTML, JavaScript, styles, manifest and icons.
It does not store private API/auth responses, OAuth consent pages, files, external
images or request URLs containing tokens/query strings. Existing local workspace
storage remains separate. Public requests used to prepare the shell omit credentials.

## Build and verification

`npm run build:site` copies the manifest, icons and Cloudflare cache headers, then
generates docs/sw.js from public/sw.js and the shipped public files. Registration
is enabled only in the built static edition on HTTPS or secure localhost. The
local Node API preview remains uncached.

`npm run test:pwa` exercises real service workers in disposable regular Chromium
profiles at both `/` and `/Worship-Song-Tool/`, including native installability
diagnostics, icon sizes, manual instructions, install dismissal, offline reload,
private-response exclusion, saved notes/plans, failed install rollback, update
guards across windows and cache cleanup. `npm run test:hosted` includes these
checks before the existing provider/browser fixtures. Those fixtures block
service workers so their intercepted API/config responses stay deterministic.

Real Apple installation/standalone behavior and real-account offline recovery
still need verification on the owner's devices; synthetic fixtures cannot prove
those platform/provider flows.
