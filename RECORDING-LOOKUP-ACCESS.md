# Exact recording lookup: environment handoff

The website now has Apple Music, Spotify and YouTube searches for all 2,044
catalog records, plus personal exact recording links, multiple versions and
preferred links. Searches are not verified direct recordings. This handoff is
for the remaining bulk recording lookup, not for frontend publication.

The current runtime only allows GitHub, Supabase and package hosts. The proposed
change below adds two public metadata services, with no credentials or paid AI
API requirement:

- `itunes.apple.com`: search Apple's public song metadata for track URLs.
- `api.song.link`: look up corresponding Spotify and YouTube URLs, where available.

Saving the change returned `CONFLICT / stale_base`: "The configuration was
published or changed after this draft was created, so its base version is stale."
Persistence was not confirmed. The tool explicitly says that reading and
resubmitting this draft will not fix it.

Open a new setup chat from the **current environment settings**, and provide this
file (download it from GitHub if this workspace is unavailable). The new setup
task should read its current draft, preserve all existing custom domains and
presets, and add the two domains above. Do not replace an unknown allowlist or
change secrets, repository membership, scripts or authentication settings. The
user must review/save and publish the environment before access is assumed.

Complete proposed change as prepared in this chat (reconcile against the new
draft before saving):

```json
{
  "config": {
    "network": {
      "allowed_domains": [
        "api.github.com",
        "api.supabase.com",
        "inhqxwratimjvzsnuwik.supabase.co",
        "williambooth0803-ui.github.io",
        "itunes.apple.com",
        "api.song.link"
      ]
    }
  }
}
```

After publication, check runtime policy and make read-only requests through the
inherited proxy with TLS verification enabled. Verify the services' actual
responses, matching behavior, availability and request limits before building
the bulk lookup. No live response from either service was tested in this chat.
Use catalog titles and recording artists only; do not send personal libraries,
notes, account settings or plans. Match titles and artists conservatively and
retain uncertainty; never invent track IDs or label a search as a recording.
Ambiguous and missing recordings stay searchable. Respect region and version
differences, cache results and use bounded retries/rate limits. Never infer
duration, key or tempo from a link. Preserve personal preferred versions and
deletions when adding future catalog links. Keep worship planning human-led.
