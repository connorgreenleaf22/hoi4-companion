# Milestone 6 — Advanced strategic planning

2026-11-05, source checkpoint on `feature/hoi4-bridge`, based on synchronized M5.1 `d9d470b`. No HOI4 launches, game inputs, source rewrites or dependency changes.

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

## Windows acceptance gate

Pending at source checkpoint: commit source, build M6 with existing packaging/worker fix, archive the complete folder using `scripts/package-acceptance.mjs`, then run `scripts/development-package-smoke.ts` with `HOI4_STRATEGY_SMOKE=1` on the **fresh extraction**. The helper sets the packaged process working directory outside the checkout and removes developer paths/NODE_PATH/NODE_OPTIONS. Also run `scripts/package-missing-installation.ts` for missing configured game files. Record concrete artifacts/results here before declaring this gate passed.

Read `MILESTONE-6-ACCEPTANCE.md` for desktop review. It is bundled as START-HERE.md. Engineering validation happens now; formal user acceptance and actual desktop compatibility remain pending until the user runs that machine.

## Next milestone

Use acceptance feedback to prioritize usability and condition explanations. Then qualify supported telemetry completion/research coverage and mod source resolution before claiming campaign-specific eligibility or advanced research timing. Keep ordinary game control separate. Do not begin those features in M6.
