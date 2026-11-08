# M7.3 — integration baseline and AI-assisted strategy proposals

## Delivery status

Implementation candidate; real-provider and user strategic-quality acceptance remain open because the user selected configure-later. A real OpenAI Responses adapter is implemented; fixture output is never evidence of actual model generation. No native HOI4 launch or gameplay control occurred. The final isolated package and publication receipt are recorded in STATUS.md.

## Integrated baseline

Branch feature/hoi4-ai-m73 starts at validated M7.1 46b0206 and merges M7.2.1 f39f96d in cf8a31bf4843. Common ancestor 0620369; prior worktrees/history are preserved. Only AGENTS, roadmap and STATUS conflicted. Existing source explanations, coverage gate, native qualification, supervision, MCP/gateway and campaign persistence coexist.

Phase 0: 32 focused tests and production build passed, followed by actual packaged explanation/strategy/history/restart and save/provenance/external-MCP checks. Evidence: artifacts/qa/development-package-2026-11-08T08-08-25-064Z-f3ddc1be and platform-package-2026-11-08T08-09-44-531Z-e787835c. The first journey incorrectly received an eight-snapshot M65 recording rather than its documented two-snapshot input; correction passed without application changes. Native testing was not repeated.

## Implementation and interfaces

- src/ai-planning-types.ts: provider-neutral whole-strategy content, source bundle, campaign-context identity and revisioned document. Focus plans reuse CampaignPlan. Every model sentence remains provisional; economic/military advice is identified as heuristic, other advice as provisional inference. Independent source mechanics remain separate. No observation class is forged from typed text.
- server/planner/ai-provider.ts: interchangeable PlanningProvider plus fixed HTTPS OpenAI Responses transport, strict JSON schema, bounded response/output, 90-second cancellation, sanitized failures, no automatic retry or arbitrary credential endpoint. No new dependencies. Current API documentation and provider comparison: M73-AI-PROVIDERS.md.
- server/planner/ai.ts: bounded installed-source retrieval, exact-reference/unique-ID canonicalization, existing M7.1 deterministic review, source/profile guards, request-ID deduplication, session-only configuration, separate ai_strategies and ai_evaluations tables in the existing SQLite store. No automatic campaign mutations. Missing, ambiguous, wrong-kind or outside-tree IDs reject. Invalid-order drafts may be saved for editing but cannot be adopted as focus alternatives.
- server/api.ts: local-only JSON endpoints GET ai/config, ai/strategies?profile=, ai/evaluations?profile=; POST ai/config, ai/clear, ai/cancel, ai/context, ai/generate, ai/review, ai/save. Existing strategy/review remains authoritative; both call the same reviewPlanCoverage/reviewProposal implementation. Neither AI nor MCP can enable rank/optimize or execute gameplay.
- src/planner/AiPlanner.tsx and existing StrategyWorkbench/CampaignPlanner: objective, optional manually asserted campaign context, exact outgoing preview, key configuration, generation/revision, editable focuses/support tasks, save/reopen/comparison, evaluation export and reviewed focus-alternative handoff. Source-changing edits invalidate the displayed review. Raw reference editing is expandable.
- src/mechanics.ts: conditional event immediate/option/after explanations reuse the existing interpreter and scope handling. Preserve known effects beside unknown character transfers, formulas and choice weighting. No probabilities or event-closure guarantees are invented.

The source bundle includes up to 200 focuses, 30 decisions, 30 technologies and 24 event dependencies, at most 180,000 characters. Research retrieval samples early industry/electronics/infantry definitions as well as objective matches, avoiding alphabetic aircraft-only selection. This is reference discovery, not a research ranking. Mod overrides and whole-world simulation remain unsupported. Manual DLC facts are transmitted only as values; source paths/account metadata from assertions are omitted. Optional campaign context is manually typed, never automatically promoted from a historical capture.

Session keys are never stored in SQLite, exported, or returned by configuration status. Generated drafts remain unsaved until Save; evaluation records retain successful responses and reviewed revisions locally. Paid work may occur before local rejection or cancellation. The app does not promise a dollar cap or zero provider retention.

## Portugal evidence and remaining coverage

Installed 1.19.4.2 source test follows: Estado Novo → A Royal Wedding → The Return of Duarte → Promote the Monarchist Cause in Portugal → Restoration of the Monarchy → Monarchist Uprising in Brazil → The Empire of Brazil → The Kingdom Reunited. Unique IDs and order are checked by the existing path/review engines, not a model assertion. Two monarchist decisions and Basic Machine Tools are supporting references; construction and military notes are heuristics.

The reviewed fixture has valid sequence structure and **104 interpretation/campaign checks**, not 104 distinct engine defects. Risk-weighted priorities: eligibility/branch conditions affect 10 definitions; event consequences affect 5; civil-war allocation affects 1 but is critical. Political transitions, national spirits and unhandled administrative/game rules also remain. No confidence, ranking or optimization eligibility is granted.

In events/LaR_Portugal.txt, lar_portugal_promote_monarchist_cause.2 (line 1722) has acceptance and refusal options. Acceptance includes Portuguese cores on qualifying Brazilian core states, follow-up events and Portugal annexing the event recipient with troop transfer. Refusal includes a Portuguese annexation war goal against the recipient. Character nationality transfers and runtime recipients remain context-sensitive/unresolved. Conditional AI weights are not acceptance probabilities. The event-choice view now exposes independently understood effects without claiming complete consequences. The existing gate still marks downstream event closure unresolved. Monarchist restoration's low-stability civil-war risk remains explicit; force allocation is not predicted.

Community hoi4_agent_tools event inspector was unavailable (transport closed). Existing installed index/source readers were used; no third-party code or native components were installed. Existing Node parser/indexer, interpreter, planner and SQLite were reused. No new community component was vendored.

## Verification and reproduction

42 focused tests passed across AI, API, planner-service, coverage, explanations, release gate and save reading. The actual OpenAI HTTP format is tested with a fixture transport, including schema, store:false, authentication failures and incomplete/refusal responses. Invalid IDs, wrong kinds, malformed outputs, conflicts, stale sources, cancellation, duplicates and saved revisions are covered. Strict TypeScript/production build passes.

Installed-source UI evidence: artifacts/qa/ai-planning-2026-11-08T08-20-45-739Z-a35b0536. Three journeys pass: deterministic fixture generation/review; edit/order rejection/revision/comparison/mobile; service restart/key forgetting/history protection. Two fixture calls, no real-provider calls. The reviewed eight-focus route's cited files were hashed against the installation. A later cosmetic reference-editing refinement and assumption handoff are checked by the final packaged acceptance.

Earlier failures are retained: missing Playwright download was resolved using the already documented installed-Chrome override; its owned test service was stopped. Retrieval initially omitted Basic Machine Tools, which correctly rejected a fixture citation. Balanced research retrieval corrected that integration defect; the same installed-source case then passed. Do not repeat these investigations without new evidence.

Run from this branch:

```powershell
npm run build
node --import tsx --test tests/ai-planning.test.ts tests/api.test.ts tests/planner-service.test.ts tests/planning-coverage.test.ts tests/explanations.test.ts tests/release-coverage.test.ts tests/bridge-save.test.ts
# Source UI: retained read-only index path, not personal application DB
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:HOI4_UI_REFERENCE_DB = '<retained installed-reference SQLite file>'
node --import tsx scripts/ai-planning-smoke.ts
# Clean committed checkout; never overwrite an existing build
npm run package:development -- M7.3
node scripts/package-acceptance.mjs '<new build root>'
node --import tsx scripts/ai-package-smoke.ts '<freshly extracted executable>'
```

## Reconciliation and next gate

M7.1 CampaignPlan/coverage contracts and M7.2 observation qualification are unchanged. New optional whole-strategy tables/contracts coexist; old profile export does not include whole strategies, so use the separate evaluation export. Older apps ignore these tables. There is no AI-facing current-observation admission adapter yet; manual text, parsed-unqualified saves and capture-qualified facts remain separate. A future admission adapter must carry source/hash, game version, session binding, capture time and freshness, bind them to a specific assumption, and explicitly re-review rather than raise confidence automatically. M721 Basic Machine Tools cannot fill a current Portugal assumption.

Next: user chooses/configures a provider and runs the documented Portugal objective, evaluates practical usefulness and edits, then compare actual model outcomes with the deterministic cases. Qualify provider access/schema/latency/usage before claiming M7.3 accepted. Afterward prioritize Portugal event closure and decision/condition semantics; keep the complete supported-content final-release gate, M7.5 memory investigation and M8 control work separate.
