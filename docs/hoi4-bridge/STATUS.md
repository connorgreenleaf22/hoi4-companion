# HOI4 bridge status

Milestone: first read-only bridge and telemetry prototype. **Paused at the user's request on 2026-11-04. The first deliverable is not yet fully accepted.**

## Completed and verified

- Existing repository `connorgreenleaf22/hoi4-companion`, branch `feature/hoi4-bridge`, baseline `ba4c3c9`; no migration or branch recreation. Actual checkout: `C:/Users/conno/Documents/Codex/2026-11-04/s/hoi4-companion`. The chat's selected `HOI 4 Test and Development` directory is empty.
- Architecture inspected: Electron/React/TypeScript, Node HTTP and built-in SQLite. No dependency/version changes. Existing parser, index, resolution and HTTP guards reused.
- Typed v1 bridge API and CLI, local-only routes, Observer default, environment inspection, indexed reference queries with conservative mod-override warnings, separate bridge SQLite persistence, partial-line telemetry reader, duplicate suppression, restart/rotation handling, explicit missing fields, freshness qualification and deterministic offline replay.
- Action gateway has durable request receipts, mode/authorization/session/version/precondition checks, exclusive controller reservation, readback interface, timeout uncertainty and latched emergency stop. **No production/native adapter registered.** Adapter behavior in tests is simulated.
- Six focused tests in `tests/bridge.test.ts` passed (wire/replay; rotation/restart; safe rejection; retry/lock/readback/timeout contract; reference overrides; local API/prototype syntax). `tsc --noEmit` passed after API/test integration. Installed-documentation prototype preflight passed against 1.19.4.1.
- Actual installed reference indexing completed in the disposable `.bridge-local/reference-db`, producing index revision `844a2339f0c1651caffabf1dc4ebacae162740b7301e054f34887b3785afe5a0`. Evidence: `.bridge-local/index-result.json`. An individual real-definition bridge query still needs to be captured; fixture provenance queries passed.
- Desktop window enumeration works. HOI4 was accessible as a targetable Windows window. Installed version changed from 1.19.3.0 to 1.19.4.1 during the session; recheck before further native work. Test-boundary executable SHA256: `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`.

## Native blocker and cleanup

Environmental/isolation blocker: two launches attempted `-userdir=<absolute path>` then `userdir=<absolute path>` via an argument array. Both initialized the normal Documents game-data folder instead of the disposable user root. Neither argument form is validated. Stop here; the two-launch budget is exhausted. **No campaign was started, no gameplay inputs dispatched, no telemetry snapshots captured, and no native control success claimed.**

Owned PIDs 38188 and 22404 were stopped. The initial normal HOI4 user folder did not exist. Startup-generated files were verified as created within the owned launch windows and moved to ignored evidence; normal folder absence was restored and verified. No pre-existing save, regular playset or vanilla game file was edited by this implementation. A cleanup attempt raced process termination; remaining files were retained separately after termination, not discarded.

Retained local evidence: `.bridge-local/native-IxwG5O/plan.json`, `launch.json`, `launch-2.json`, `first-launch-user/`, `second-launch-user/`, `second-launch-user-residual/`. These may contain machine/account diagnostics; never add them to Git. Disposable mod/settings remain under that run's `user/`. All owned native/indexing processes are stopped/completed. No bridge daemon was started.

## Incomplete work and acceptance gaps

- Reusable skill draft at `.agents/skills/hoi4-game-bridge/` is written but has not passed the bundled skill validator or a fresh Codex discovery/invocation check. This chat is attached to a different directory; resume in the actual repository.
- `scripts/bridge-prepare-native.ts` is an unfinished preparation helper, retained uncommitted. It does not launch anything; its proposed isolation arguments FAILED. Do not treat generated launch instructions as safe. Fix only after establishing a supported isolation mechanism without editing the installed game or personal profile.
- Standalone telemetry prototype parses and uses installed documented primitives; actual scope/token expansion, date format and daily scheduling remain unverified.
- Full existing tests, integrated build, packaged Electron checks, complete API regression and skill discovery are pending. No new regression/release acceptance claimed. Existing `QA-LEDGER.md` obligations remain unchanged.
- No binary/text-save semantic mapping, automatic telemetry poller, merged mod index, live-process binding or real control adapter yet. Freshness is explicitly log-file age, not a running-process assertion.
- `npm ci --ignore-scripts` completed; Electron postinstall was intentionally not run. npm reported six moderate dependency advisories; no forced dependency upgrades were attempted.

## Decisions and exact resumption step

Keep the existing service and separate telemetry/control gates; see `ADR-001.md` for reviewed upstream projects and license constraints. Do not rerun the same upstream research or either failed launch argument without new evidence.

**Next smallest task:** open this actual checkout on `feature/hoi4-bridge`, read this status and review the pending skill/native-helper drafts. Complete skill validation/discovery and capture one real indexed focus or technology query using the existing disposable database. Before any new native session, investigate user-data isolation read-only and obtain new evidence of a supported mechanism; the previous session's launch budget is exhausted. Resume broad checks only at the next deliberate integration checkpoint.
