# Milestone 5.1 — Electron recovery and repository synchronization

Source checkpoint, 2026-11-04 EST. Work remains on `feature/hoi4-bridge`. No HOI4 launches or gameplay commands; no Milestone 6 features, dependency upgrades, sandbox disabling, releases, tags, or changes to other branches.

## Repository verification and initial synchronization

Confirmed origin `https://github.com/connorgreenleaf22/hoi4-companion.git`. The authenticated GitHub repository API returned `private: true`, visibility `private`, not archived, default branch `main`. The connected GitHub plugin returned 404, so repository metadata was verified through the existing Git credential helper without printing or storing credentials. Git fetch showed only the baseline `ba4c3c9` on remote main/develop; no divergent feature branch.

Reviewed all nine commits through `744f74c`, 216 unique reachable historical blobs and 164 current tracked paths. `scripts/audit-git-history.py` checks historical path/size/binary categories and common secret patterns, including removed/replaced blobs, without printing matched values. No credential-pattern matches, suspicious data paths, files above 1 MiB, game saves/databases or generated packages were found. Only the two approximately 8 KB application icons were binary. The small sanitized telemetry regression and project-owned prototype scripts are intentional source/test fixtures. `.gitignore` covers generated packages, evidence, local configs, databases and saves. This is a bounded review, not a guarantee of recognizing every possible secret.

Pushed existing history normally and established upstream. `git ls-remote` verified `refs/heads/feature/hoi4-bridge` at `744f74cd81e265c2cd78dcaecd9cecce9fee133e`. No force, merge, tag or release.

## Failure isolation

Pinned runtime: Electron **45.2.1**, Chromium **156.0.8078.75**, embedded Node **24.22.1**. The missing development runtime was installed using that exact dependency's reviewed install script/checksums; package versions and lockfile unchanged.

| Diagnostic | Observed outcome |
|---|---|
| Minimal development Electron, sandbox/context isolation enabled | Data-page renderer and loopback HTTP both loaded |
| Same probe with a bounded 22-second main-thread pause | Both loaded; elapsed blocking time alone did not reproduce failure |
| Minimal application packaged through the existing electron-builder/ASAR configuration | Both loaded; packaging/runtime/resources alone did not reproduce failure |
| Companion with first-time index in Electron main | Service/index completed, window was created, then renderer load failed with ERR_FAILED and Chromium network-service restart message |
| Companion with an already cached index | Renderer loaded successfully |
| Same importer in a short-lived worker, fresh database | First-time index and actual companion renderer loaded successfully |

Seventy runtime resource files were compared between the installed runtime and prior M5 package; only the raw LICENSE filename differed (packager naming), not runtime DLL/data resources. No native module rebuild or version swap was used as a fix.

Best-supported cause: **cold indexing coupled to Electron's main-process startup**. The large synchronous importer builds the reference index in the process that initializes Chromium; moving that work and its temporary heap out of the main thread removes the reproduced failure. `ERR_FAILED` was the renderer-load symptom after service/window creation, not a missing Node server. The exact low-level Chromium crash mechanism is **not established**; the elapsed-time-only control passed, so this report does not claim that any long main-thread pause necessarily causes the crash.

Evidence remains ignored under `.bridge-local/m51-probe-runtime/`, `m51-probe-blocked/`, `m51-probe-packaged/`, `m51-dev-data/diagnostics/`, `m51-dev-fresh-instrumented/diagnostics/`, `m51-worker-fresh/diagnostics/` and corresponding stderr logs. `scripts/electron-probe.cjs` is a bounded no-game reproducer using explicit isolated storage. Failure subprocess events are registered; the observed failure runs did not deliver an actionable child exit code, so none is invented.

## Changes and focused validation

- `server/index-worker.ts`, `server/index-background.ts`: existing importer/schema/transactions run in a worker with a private SQLite connection. Completion waits for worker exit, releasing its temporary heap; worker errors/missing result and a five-minute timeout are reported. Electron startup and user-requested reindex use this path; browser CLI behavior remains intact.
- `server/api.ts`, `scripts/build.mjs`, `electron/main.ts`: bundle/select the worker without a new service or production dependency. Existing Node HTTP service, profile store, migration gates, renderer security and close guard stay in place.
- Main-process startup/subprocess/renderer diagnostics are retained per launch for development builds (or explicit `HOI4_STARTUP_DIAGNOSTICS=1`) under the selected data directory. Startup failure destroys the unusable window and uses an asynchronous error dialog, allowing diagnostics and eventual service cleanup instead of routing a blank renderer through the unsaved-draft guard.
- Packaging accepts dotted milestone identifiers such as M5.1; output remains isolated and refuses existing destinations.
- Thirteen focused Node tests passed: worker responsiveness/refresh/failure preservation, existing importer, campaign-history transfer/persistence, and close/draft protections. TypeScript passed. The worker test builds its own temporary bundle and does not require stale generated output.
- Desktop smoke now exercises actual packaged runtime resources/security, installed references, saved recording import, baseline preview/confirm, a saved source-defined focus queue, service shutdown and reopen/persistence. Packaging and desktop acceptance are pending at this source checkpoint.

## Remaining acceptance step

Commit this source, build `npm run package:development -- M5.1`, then run the extended packaged smoke with the retained native recording and disposable companion data. Do not call the milestone complete before that executable loads and the workflow persists across restart. Record artifact path, hashes, evidence, final commit and verified remote SHA here after the gate passes. Retain the working M5 browser preview throughout.

## Milestone 6 handoff

After desktop recovery is validated, begin advanced strategic planning using existing focus paths, decisions, research references and alternative plans. Preserve observed/unknown distinctions and keep native game control separate. Formal user acceptance is deferred until after M6; engineering validation and a stable Windows build remain required. Do not start M6 during this recovery task.
