# Exact recording lookup: access and progress

The website now has Apple Music, Spotify and YouTube searches for all 2,044
catalog records, plus personal exact recording links, multiple versions and
preferred links. Searches are not verified direct recordings. This handoff is
for the remaining bulk recording lookup, not for frontend publication.

## Current access

The environment draft was recovered in the next setup chat: the save succeeded
and readback confirmed both domains, preserving existing settings. Read-only
requests through the inherited proxy now return:

- `itunes.apple.com/search`: HTTP 200 with song metadata.
- `api.song.link/v1-alpha.1/links`: HTTP 401 with
  `PUBLIC_API_ACCESS_DEPRECATED`. Network access is working, but anonymous
  cross-platform lookup is no longer available from that API. Do not repeatedly
  retry this response or invent Spotify/YouTube IDs.

## Metadata lookup

The first completed pass populated **1,245 Apple Music links across 780 of 2,044
catalog records**, with no failed artist requests. Remaining records retain
searches; absence of a match does not prove that a recording is unavailable.

Run `NODE_USE_ENV_PROXY=1 node scripts/lookup-recordings.mjs` with Node 24+ in
this environment. It sends only public catalog recording artists to Apple's US
song search, caches successful responses in `/tmp/faithful-recording-cache`, and
spaces sequential requests by at least 3.2 seconds. Each artist search is capped
at 200 results; this is a bounded first pass, not a complete discography. Failed
requests are recorded, not retried indefinitely.

Only exact full title and artist matches after punctuation/case normalization
are accepted. Version qualifiers remain part of the title. Writer-only hymn
attributions, annotated associations and ambiguous collaboration separators
are excluded. Up to three matching releases per catalog record retain their
artist and album labels. Multiple releases are not claims of different audio
performances. Metadata evidence, source request, timestamp and US region are in
`data/recording-evidence.json`; frontend links are in
`public/catalog-recordings.js`.

These are metadata-matched recordings, not listening-verified lyrics, official
video claims, global availability guarantees or church-use approval. No duration,
key, tempo or assessment is inferred. Spotify and YouTube remain searches where
no exact source-backed mapping is available. Resuming those lookups requires a
supported metadata source; frontend setup requires no private Supabase token.

Catalog refresh supplies defaults only when a matching record has no recording
list. Any existing personal list, including an empty list after removal, stays
unchanged. Preferred ordering, alternate versions and deletions survive refresh,
backups and account saves. A personally changed title or artist does not receive
links for its former identity. No personal libraries, notes, account settings or
plans are sent to lookup services. Worship planning remains human-led.

The previous setup chat's `CONFLICT / stale_base` was real; rereading and retrying
that stale draft could not fix it. The fresh chat successfully saved the additions.

The catalog link batch and personal-choice preservation were published in release
594d0ae. The official Songlink GitHub API documentation inspected during continued
work is dated 2020 and redirects to a newer help site; it did not establish a
supported replacement for the deprecated anonymous endpoint. Spotify/YouTube
mapping remains explicitly outstanding.

## Album artwork and hymn finding links

The retained Apple responses provide artwork for all 1,245 matched recording
links (780 records). These URLs now accompany the saved default recordings;
existing matching catalog links gain only artwork metadata. Personal recording
choices/order, empty lists and removed links are preserved. Traditional hymns do
not show album covers. Hymns have title-bound Hymnary searches; no unverified
Hymnary entry IDs are fabricated. Covers remain blank without exact evidence.

The only artwork CDN host in the retained metadata is `is1-ssl.mzstatic.com`.
Its image fetch could not be verified from this cloud environment; the current
allowlist omits that host. This chat's configuration draft is stale again: its
base version is older than the running configuration. It was read, preserved and
not repeatedly retried or overwritten. A fresh configuration draft must add this
host while preserving the six existing explicit domains. This affects cloud
image validation; ordinary website visitors use the public Apple CDN directly.
No new environment requirement or private frontend Supabase token was added.

## Recording chronology and artist covers

The cached exact Apple responses now supply `releaseDate` for all 1,245 recording
links. Backup validation retains real calendar dates; matching existing catalog
links gain that metadata without replacing/removing personal choices. These are
recording-release dates and may be reissues, not original writing dates. The
lookup script retains this evidence for future supported Apple lookups. No
Songlink retry or invented Spotify/YouTube mapping was added.

Artist portraits are separately sourced at browser runtime from fixed Wikipedia
artist identities through Wikidata P18 and attributed Wikimedia Commons images.
Album artwork is not used as a portrait. Cloud validation also needs the exact
hosts `www.wikidata.org`, `commons.wikimedia.org` and `upload.wikimedia.org` in a
fresh configuration draft, retaining all existing settings. The previously stale
draft was not saved/retried. Image-source tests use synthetic metadata and
intercepted image bytes; they do not establish live provider/image availability.
