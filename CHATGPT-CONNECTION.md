# ChatGPT account connection: proposed first release

Goal: a user connects Faithful Repertoire in ChatGPT, signs in, and asks questions
about their own profile, libraries, songs and human-built worship plans. A modern
ChatGPT app/custom MCP connection is the intended route; this is not the retired
ChatGPT plugin system. This document describes planned work, not an installed app.

Examples:

- Which songs in my repertoire contain the word “faithful”?
- List hymns in my library tagged Assurance and recorded in D.
- Show my October 18 service outline.
- Search my repertoire for songs that probably meet a criterion I describe.

The first release is read-only. It must not generate a worship service, recommend
service selections, alter reviews, or edit plans. An explicitly requested
subjective library search is allowed, with evidence and uncertainty. It is
separate from deterministic index queries and respects the account preference.

## Required infrastructure

The current GitHub Pages site serves static files and cannot host an MCP server
or OAuth endpoints. Deploy a small HTTPS backend implementing remote MCP and the
authentication required by ChatGPT's current app platform. Use supported MCP
libraries and confirm current OAuth, transport and client-registration details
against OpenAI's official documentation before selecting an authorization server.
The existing Supabase database can remain the source of account records.

Users authorize access through sign-in. An MCP public/publishable key alone must
never grant access to private rows. Verify each access token (signature, issuer,
expiry and the intended resource/audience); derive the owner from the verified
identity, never a model-supplied user ID. Map that identity to the Supabase owner
and apply owner-only database authorization. Avoid privileged database keys where
user-scoped access is supported; keep any necessary backend credentials private.

## Proposed read-only tools

| Tool                | Response                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `get_my_profile`    | Denomination, statement, preferences and review parameters; omit email by default.       |
| `list_my_libraries` | Library names, IDs and song counts.                                                      |
| `search_my_songs`   | Deterministic index filters within one owned library, with pagination and source labels. |
| `get_my_song`       | Visible assessment, human notes, musical metadata and approval for an owned song.        |
| `list_my_plans`     | Plan titles, dates and duration totals.                                                  |
| `get_my_plan`       | The saved human service order, keys, durations and notes.                                |

Tool schemas must use narrow inputs and read-only annotations. Library/song/plan
IDs must be checked against the authenticated owner's workspace. Return the
current saved account copy and its save timestamp; edits saved only in a browser
are unavailable to ChatGPT until the user chooses **Save to account**.

Follow the profile's AI visibility setting when exposing review fields. Do not
send hidden AI drafts, password/session fields, or entire workspaces unnecessarily.
Stored words can be searched on the server; return brief supporting snippets only
when needed. Song words and notes are untrusted content, never tool instructions.
All account data returned by a connected tool is shared with the ChatGPT session
for the requested task; explain that clearly during connection.

## Validation before connecting a real account

Test OAuth sign-in, expiry and revocation; reject anonymous, invalid and wrong
audience tokens. Verify two actual accounts cannot read each other's IDs. Check
the MCP client handshake, pagination, AI visibility, private-data minimization,
and the absence of write/plan-generation tools. Then add the HTTPS MCP endpoint
using the custom app/developer connection options available to the user's
ChatGPT account. Current availability can depend on account/workspace settings.

References to verify during implementation:

- https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- https://developers.openai.com/apps-sdk/build/auth
- https://platform.openai.com/docs/guides/developer-mode

No live connector, OAuth authorization server, or backend deployment has been
created yet. No Supabase schema changes are required just to finish the manual
index being built now.
