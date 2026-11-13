# Milestone 6 — Advanced strategic planning

2026-11-05, engineering delivery on `feature/hoi4-bridge`, based on synchronized M5.1 `d9d470b`. Application/artifact source commit `7e33b512da9c`. No HOI4 launches, game inputs, source rewrites or dependency changes. Main-desktop user acceptance remains pending.

## Implemented scope

- Existing Campaign planner now has goal-based prerequisite route exploration. Preserves AND across prerequisite groups and OR within each group, shared dependencies, manual positive completions and bidirectional exclusions. Missing/ambiguous/cyclic/malformed/joint definitions are diagnosed. Limits: 32 routes, 5,000 expansions, depth 64, 200 focuses per route; partial results explicitly labeled. Search is structural, not exhaustive strategy optimization.
- Routes become new draft alternatives; existing preview/fingerprint/revision/apply flow saves them in the current schema-3 profile. No automatic replacement, new database schema or historical observation mutation. Existing list/map, queue editing, alternatives, draft-close guard and checklists remain.
- Compare two to four **saved** alternatives: exact shared definitions, unique definitions, ordered sequences, cross-plan mutual exclusions, nominal source duration, unresolved gates, source-declared rewards, version/index context. Effects are shown verbatim as declarations, never simulated strategic benefits. Existing plan reports preserve bypass/cancellation and availability independently.
- Consistent four-state condition display over the existing conservative truth evaluator: satisfied or unsatisfied in explicit planning context, missing-state unknown, unsupported condition. Supported results are not claims of live campaign verification. No missing snapshot field is treated as a negative or completed focus.
- Decision/technology reference workflow inside the planner reuses the installed index/search and source drawer. Country matching is explicitly a discovery hint. Read costs, visibility/availability, categories, years, declared research paths, effects and existing relationship links. No exhaustive decision engine or research scheduler.
- Existing recording import/baseline transfer naturally leads into routes, saved strategies and comparison, without a running game.

## Interfaces and reuse

`src/strategy-types.ts`, `server/planner/strategy.ts`, `src/planner/StrategyWorkbench.tsx`, `src/planner/condition-state.ts`; existing `CampaignPlanner.tsx`, planner CSS and `server/api.ts` extended. Typed local API: `POST strategy/paths`, `POST strategy/compare`, `GET strategy/references` under `/api/v1/`. Uses existing host/origin checks, profile validation, index revisions, `treeFocuses`, `resolveFocus`, `evaluatePlanner`, source search and SQLite persistence. Comparison reads saved revision-matched alternatives. No runtime dependency on Codex/MCP.

Reviewed Agent Tools registration remains enabled with the same ten tool permissions. Catalog was unavailable in this chat's tool surface; `codex mcp get hoi4_agent_tools --json` and the existing upstream setup `--diagnose` confirmed registration and status `ok` (4.7.0). Used the existing local source index/parser fallback; no new MCP invocation evidence, permission changes, server installation or repeated community survey is claimed.

## Source limitations

- Base-game index only. Launcher mods and unknown selection are prominently disclosed; effective mod precedence, archives and merged override semantics remain unsupported. These paths are base-game scenarios, not authoritative modded-campaign plans. DLC facts remain independently qualified, and tree selection is not proof of applicability. This is a deliberate remaining limitation against the broader mod-aware goal.
- Scripted/scoped triggers, dynamic branches, joint focuses, outcomes, live localization, category eligibility and research modifiers remain unresolved where unsupported. Bypass is inspected but not used to invent zero-duration completion. Unknown prerequisites or source variants never cause fuzzy substitution.
- Imported historical country/date support a planning baseline; PP/stability remain historical context. Completed-focus coverage, research, political and historical DLC/mod state are not manufactured. Native control remains blocked at M3's independent qualification gate.

## Validation at source checkpoint

116 focused tests passed: new strategy logic/API plus existing planner domain/model/service/migration and campaign history tests. TypeScript and build passed. `scripts/strategy-ui.ts` passed two rendered journeys using retained real Germany definitions and M3 snapshot recording: import → baseline → two Autobahn routes → saved alternatives/comparison → decision/technology inspection → service/renderer restart → preserved alternatives/baseline. Desktop/mobile screenshots inspected; no horizontal mobile overflow.

Evidence: `artifacts/qa/strategy-planning-2026-11-05T05-09-45-380Z-b45489b1/`. Earlier failures were environmental (Playwright's default downloaded browser absent; used installed Chrome) and a test-label mismatch (`The Four-Year Plan`, not `Four Year Plan`). Corrected the harness, including browser-startup cleanup; no repeated unchanged application failure or native game cycle. Existing broad release/QA-LEDGER gates remain open.

## Windows acceptance build — laptop gates passed

Portable ZIP (162,063,283 bytes), outside Git:

`C:/Users/conno/Documents/HOI4 Companion Development Builds/M6-7e33b512da9c/M6-7e33b512da9c-windows-x64.zip`

ZIP SHA256: `2515d46300a5f37ea10974e08c5b2b5a67f997f0e6ac3de4c1e60e63755b199f`.

Actually tested executable, freshly extracted from that ZIP:

`C:/Users/conno/Documents/HOI4 Companion Development Builds/M6-7e33b512da9c/acceptance-extracted/win-unpacked/HOI4 Companion M6-7e33b512da9c.exe`

EXE SHA256: `fff24999552bd42308080aefbd2e4239cabe0e73a950c25681865a4f3d733b6e`. Entire folder required. Normal isolated data: `%APPDATA%/HOI4 Companion Development/M6-7e33b512da9c/`. Test companion databases were disposable and removed; no user history was prepopulated into the normal build profile. Older apps/builds retained.

`npm run package:development -- M6` passed with unchanged Electron 45.2.1/worker indexing. The first ZIP attempt hit Windows PowerShell's Archive-module autoload failure. Corrected only the packaging helper to use built-in .NET ZipFile; no dependency upgrade or invasive installation. Archive/extraction verified all **73 files** byte-for-byte, including START-HERE.md. Existing destinations and differing walkthroughs are refused.

`scripts/development-package-smoke.ts` with `HOI4_STRATEGY_SMOKE=1` passed both checks on the fresh extraction: first-time installed indexing, actual Electron renderer, history import/baseline, both German routes, saved comparison, decision/technology lookup, embedded service shutdown, and reopen persistence. Runtime evidence confirms CWD is the extracted folder, PATH is only `C:\WINDOWS\System32;C:\WINDOWS`, and NODE_PATH/NODE_OPTIONS are absent. No development server, global Node/Git/Codex executable or developer MCP is required by the app. Sandbox/context isolation stayed enabled; Node integration disabled. ASAR build/dist/assets matched compiled source; source identity was unchanged during the run.

Separate `scripts/package-missing-installation.ts` check passed with a nonexistent configured game folder and fresh isolated data: actual window loads, error identifies missing files, editable installation path and Refresh game data remain available. This checks the missing **configured path** state on the laptop; it does not claim testing every desktop/Steam/security configuration.

Evidence: `artifacts/qa/development-package-2026-11-05T05-18-26-656Z-faa75779/` (two passes, screenshots, startup logs, isolated runtime environment and manifest), `artifacts/qa/package-missing-installation-2026-11-05T05-19-13-329Z-39f43f7c/` (one pass, screenshot). Owned M6 Electron and HOI4 processes were absent after cleanup. Raw recordings/logs/databases/assets remain ignored and are not bundled or pushed.

To reproduce, first build a clean committed checkout using `npm run package:development -- M6`; then `node scripts/package-acceptance.mjs <new-build-directory>`. With the retained recording path set in `HOI4_INTELLIGENCE_RECORDING`, set `HOI4_STRATEGY_SMOKE=1` and run `node --import tsx scripts/development-package-smoke.ts <extracted-executable>`, then `node --import tsx scripts/package-missing-installation.ts <extracted-executable>`. Use a new build root when repeating an existing commit; never overwrite an older artifact.

Read `MILESTONE-6-ACCEPTANCE.md` for desktop review. It is bundled as START-HERE.md. Engineering validation happens now; formal user acceptance and actual desktop compatibility remain pending until the user runs that machine.

## Repository checkpoint

Application/artifact source is `7e33b512da9c`; subsequent commit contains the validated archive-helper correction, runtime-environment assertion and final evidence/status. Full-history secret/path/binary review precedes the authorized normal push to private `origin/feature/hoi4-bridge`. Exact final local/remote SHA verification is retained in ignored `.bridge-local/m6-remote-verification.json` and the delivery message. No merge, force, tag, release, binary upload or branch change.

## Next milestone

Use acceptance feedback to prioritize usability and condition explanations. Then qualify supported telemetry completion/research coverage and mod source resolution before claiming campaign-specific eligibility or advanced research timing. Keep ordinary game control separate. Do not begin those features in M6.
