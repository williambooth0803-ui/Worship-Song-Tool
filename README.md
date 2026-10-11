# Hymn & Heart — Worship Song Tool

A first working loop for thoughtful worship planning: identify a song, assess it under an editable Baptist/Reformed-friendly profile, save it to multiple libraries, and build a service plan.

## Hosted website

`npm run build:site` prepares the static edition in `docs/` for GitHub Pages. Assets and imports use relative paths so the app works under a repository subdirectory. Publish with Pages configured to the `main` branch and `/docs` folder. Regenerate and commit `docs/` whenever frontend source changes.

The static edition supports manual assessments, libraries, service planning, exports and backup restoration. It does not make AI requests or expose a credential. Live AI requires the Node backend and authenticated hosting. Private-repository Pages availability depends on the GitHub account plan.

Run `npm run test:hosted` to regenerate the website and test it under its hosted path, including backup download, rejected malformed files, cancellation, confirmed restoration and mobile controls. This test starts its own temporary local server.

## Run locally

Requires Node.js 22 or later. No third-party runtime dependencies or build step.

```sh
npm ci
npm start
```

Open `http://localhost:3000` in your browser. `PORT` overrides the default port. `npm run dev` restarts the server when files change. Run `npm test` for the rating, search, review-validation and server tests.

The development server permits embedded previews. For a deployment that should block embedding, set `FRAME_ANCESTORS="'none'"`; alternatively supply the trusted parent origins as CSP source expressions. The server must be running for a preview to load; cloud environment restoration does not preserve server processes.

With the app running, `npm run test:browser` exercises edits, multiple libraries, plans, reordering, persistence, safe text rendering and mobile overflow in a fresh browser context. It uses the installed Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another executable, and `APP_URL` for another app address. Screenshots are written to `/tmp/worship-discover.png`, `/tmp/worship-plan.png` and `/tmp/worship-mobile.png`. Playwright is a development dependency; there are no third-party runtime dependencies.

## The first loop

1. Search the four starter hymns by title, writer, opening line or theme, or add a song with its exact attribution/version.
2. Edit its assessment. Accuracy, substance, language and purposeful time have separate scores. Unknown dimensions are excluded, and partial ratings are marked. A serious doctrinal concern always requires review.
3. Record Scripture connections, use cases, musical observations, a preferred key, duration, source URLs and personal notes.
4. Save the song to one or more libraries. Create additional libraries as needed.
5. Create a worship plan. Add songs, readings, prayer and other service items, set durations and keys, reorder items, and export a text outline.
6. Customize rating weights and written theological/editorial parameters in Rating profile.

Starter assessments are editorial examples, not live research, AI output, or a verified consensus. Source links are references for independent verification. Arrangement duration defaults are editable planning estimates. Vocal range, intervals and instrumental difficulty are unassessed until you provide arrangement-specific evidence.

## Optional AI drafts

Set a server-side credential and optionally a model before starting:

```sh
read -rs -p 'AI API key: ' WORSHIP_AI_KEY
export WORSHIP_AI_KEY
export WORSHIP_AI_MODEL=gpt-4.1-mini
npm start
```

The server sends requests to `https://api.openai.com/v1/chat/completions`. Do not put credentials in frontend files or commit them. API billing/model access is required. The browser shows whether AI is configured. Without credentials, all manual review, library and planning features work.

Choose **Draft with AI**, supply song text you have permission to use, and optionally provide arrangement evidence. The server includes your profile, validates the draft's score structure, and returns it for review before application. AI does not browse or retrieve lyrics. Supplied lyrics are not retained in browser storage; they are sent to the provider for analysis. Applying a draft preserves the immediately previous assessment and retains personal notes, musical observations, source links and planning details. Manually editing marks the result as your assessment.

AI accuracy, provider connectivity and musical inference have not been established by the local no-credential tests. Review generated conclusions and Scripture connections before use.

## Storage and scope

Libraries, profiles and plans use this browser's localStorage. They are not synced to accounts or other devices. Clearing site data removes them. Use **Backup & restore** to download a JSON backup or restore it on another browser. Imported files are validated before a confirmation step; restoring replaces this browser's workspace. Canceling or providing an invalid backup preserves the current workspace. The file limit is 5 MB. Your personal data is not committed to GitHub or published with the website.

It has no accounts, shared approval workflow, catalog search API, licensed lyric retrieval, sheet-music/audio analysis or automatic online source verification.

This server is for personal/local development. Before sharing a server with AI enabled, add authentication, authorization and rate limiting to protect API spending. A deployed multi-user version also needs database storage and a clear licensing/data-retention policy.

## Cloud tasks

Use the existing isolated checkout; no Git worktree is needed. From `/workspace/Worship-Song-Tool`, run `npm ci`, `npm test`, then `npm start`. Processes must restart in new tasks. Validate with a request to `/api/status` and a browser check of the song → review → library → plan loop. No secrets are needed for the manual workflow.
