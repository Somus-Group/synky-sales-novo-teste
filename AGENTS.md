# Synky Sales Repository

The canonical GitHub repository for this project is:
https://github.com/Somus-Group/synky-sales-novo-teste

Use this repository for both fetching and pushing. The previous repository,
Somus-Group/synky-sales, is no longer the destination for this workspace.

## Team Synchronization

The user has requested synchronization with GitHub for every implementation task.

1. Before editing, inspect the working tree, branch, and origin URL, then fetch
   from origin. Integrate updates from the tracked branch before implementation.
   Prefer a fast-forward when possible; otherwise merge and preserve both sets
   of changes. Do not discard or overwrite uncommitted work.
2. Implement the requested changes and run the checks appropriate to them.
   For application changes, use npm run build, npx tsc --noEmit, and the relevant
   tests under tests/. Preserve all existing modules unless removal is requested.
3. Commit completed changes and push to the same repository. Normal work tracks
   origin/main unless the user requests another branch. If a push is rejected
   because someone else updated the branch, fetch, integrate, validate again,
   and retry. Never force-push or erase another contributor's changes.
4. Verify that the pushed commit is present on the remote before reporting it
   as uploaded. If authentication or access blocks the upload, report that it is
   still local and keep the work intact.

## Local State

Do not commit credentials, .env files, .dev.vars files, node_modules, build output,
or the local .wrangler database and uploaded files. GitHub synchronizes source
code, not local client records or runtime secrets.

The experimental proposal workspace is Estudio Lab. Its integration and local
database migration notes are in docs/studio-lab.md.
