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

## Production Delivery

Every application update must reach both the canonical GitHub repository and
https://sales.synky.com.br. Reuse the Sites project in .openai/hosting.json and
preserve its current audience. A native hosting URL alone is not the final
delivery target. After publication succeeds, verify the custom domain through
a read-only request that does not trigger AI generation.

Never modify or publish synky.com.br or www.synky.com.br. Do not change DNS
without an explicit request. Documentation-only changes do not change the
running application, but must still be committed and pushed to GitHub.

Hourly synchronization is managed by the existing Codex automation. Its scope
is the entire repository, including all modules, database schemas and migrations.
GitHub does not store the live CRM records. Preserve local work and never replace
database records with repository files or automatically merge unfinished branches.

## API Spending

Do not run live AI tests or generate sample proposals against the OpenAI API
without the user's explicit authorization for new paid calls. Use offline
fixtures and mocked model responses for validation. Builds, type checks and
local unit tests must not trigger paid generation, including during hourly sync.

## Local State

Do not commit credentials, .env files, .dev.vars files, node_modules, build output,
or the local .wrangler database and uploaded files. GitHub synchronizes source
code, not local client records or runtime secrets.

The experimental proposal workspace is Estudio Lab. Its integration and local
database migration notes are in docs/studio-lab.md.
