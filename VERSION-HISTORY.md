# Workspace version history

Open **Settings → Version history**. Versions include the whole workspace:
songs, reviews, personal notes, exclusions, libraries, plans, criteria, lenses,
saved index views and plan templates. They do not contain account passwords,
organization membership or the contents of uploaded files. Restoring a file
reference cannot recover a file deleted from storage.

Automatic checkpoints save the previous workspace before an edit, at most once
every five minutes. **Save version** creates an immediate, optionally named
checkpoint. Preview shows additions, changes and removals before a second
confirmation replaces anything. The current workspace is saved as **Before
restoring a version** first, so the restore can itself be undone. Current AI
display preferences are preserved. Another device's newer save or another tab's
newer browser copy blocks a stale restore.

Each storage location retains up to 30 versions within a 40 MiB budget. Older
versions roll off; download important versions as independent JSON backups.
History starts when this feature is installed; it cannot reconstruct past edits.

## Device and account storage

Device versions use IndexedDB, separately from the workspace's localStorage
quota. They are scoped to the browser origin, account and active organization.
Clearing browser/site data also deletes device history. Automatic device-history
failures do not block ordinary saves; a restore requires a successful recovery
checkpoint. Storage errors appear in the history dialog or on an attempted
checkpoint/restore.

Account history uses the existing private Supabase database. Cloudflare serves
the frontend; no additional Worker, R2 bucket or account system is required.
The dialog identifies **This device** and **Account** versions separately. A
missing migration or network failure is displayed explicitly, while device
versions remain usable. Signed-in restores require completed account sync.

## Install account history

1. Open the project's Supabase **SQL Editor** with an administrator account.
2. Run [supabase/version-history.sql](supabase/version-history.sql) after the
   existing `schema.sql` and `organizations.sql` migrations. The migration is
   transactional, additive and safe to rerun. It changes no current workspaces.
3. Open Version history on the website and save a named version. An **Account**
   entry confirms a successful account checkpoint. Check it from another signed-in
   browser to verify cross-device availability.

The migration captures successful account/organization saves at the database,
including writes from other clients. Native account owners can access their own
history. Current organization members can preview/download shared history;
owners, administrators and editors can save/restore versions. Revoked members
and OAuth clients cannot access the history RPCs. Raw tables and internal
helpers are not accessible to ordinary authenticated clients. Cloud restores
check the current timestamp/revision and checkpoint the current server copy
within the same transaction. Personal restores also update the saved account
profile used by the ChatGPT connection.

Tests execute the migration twice against PostgreSQL (PGlite), exercise real
database RPCs in the shared-workspace browser fixture, and test real IndexedDB
checkpoint/download/restore/recovery flows. Tests use disposable synthetic users.
