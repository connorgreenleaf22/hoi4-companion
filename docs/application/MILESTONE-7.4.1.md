# M7.4.1 — Mechanical Knowledge Accuracy

Engineering candidate: **offline-tested; owner acceptance pending**. [Manifest](../milestones/M7.4.1.json) · [Draft PR #9](https://github.com/connorgreenleaf22/hoi4-companion/pull/9) · [Remaining qualification gaps #7](https://github.com/connorgreenleaf22/hoi4-companion/issues/7).

Branch `feature/hoi4-knowledge-mechanics`; approved common base `bdb8a4887522b38f5110f3900bbf1655cc5fd600`; final runtime **`1d58eb7b79f756620225998bed04ded9e5d16c74`**. New isolated worktree, with no PR #6 or live-Q&A integration. The later report/manifest commit is documentation, not a different tested runtime. Implementation and tests reuse the existing ordered parser, index, interpreter and risk gate. No frontend, telemetry bridge, provider, API response schema or unrelated shared contract was edited.

## Baseline audit

The existing parser retains repeated keys, nesting, operators and source lines. It does not execute the game. Existing verified source semantics include AND/OR/NOT, literal stability requirements, country/state scope, ROOT/PREV within effect blocks, guarded annexation/cores, supported idea modifiers and bounded parameterless helpers. Campaign conditions remain state-unknown.

The baseline already has **direct `entryMechanics(event)` option/stage summaries**. It can explain annex/core effects with a generic event recipient, and marks AI weights unsupported. The strategy gate, however, discovers event references without expanding those event choices into the selected route's structured summaries. It cannot bind Brazil as the reunion event's ROOT there. Scalar calls, random event delays and `create_wargoal` remain unsupported. Parameterized helpers, character scopes, deeper FROM chains, arbitrary formulas and many political transitions remain partial or unsupported.

The retained-index HTTP audit at the base reproduces the established eight-focus route with two sentiment decisions and Basic Machine Tools: **104 blocking checks**, seven event references, no confidence/ranking/optimization permission. It also reproduces Germany Autarky (206) and Oppose Hitler (19). These are targeted risk counts, not quality percentages. M7.3.1 provider/context evidence was read as historical evidence; no provider prose or paid success was used to certify mechanics.

## Reusable interpreter change

`explainEvent` now supplies the same bounded stage/option interpretation to standalone event summaries and contextual dispatch expansion. `entryMechanics` accepts an optional resolver context; the existing strategy-review service resolves event definitions through its current index. No second parser, source index or analysis service is introduced.

- Literal country/news event calls support scalar IDs and documented nonnegative integer delays. Months mean 30 days. Random delay bounds are explicitly conservative when combined; distribution and probabilities are not inferred. Simultaneous legacy `random` and `random_hours` aliases refuse because joint precedence is unqualified.
- A country call binds ROOT to its scoped recipient; event entry does not inherit caller PREV/FROM. Every event stage, option and effect retains conditional ancestry. Source event triggers remain visible with **unknown applicability** across immediate/delayed/automatic delivery, rather than falsely gating every dispatch. Option trigger meaning stays separate from unknown campaign state.
- Literal `create_wargoal = { target = <country> type = annex_everything }` explains the war goal separately from declaration of war or annexation. Extra parameters/types remain unsupported.
- AI factors/modifiers and their understood conditions are inspectable, but the AI-choice node remains unsupported. Source 99/1 weights are not acceptance percentages. Unsupported character transfers and political formulas remain visible beside known effects.
- Missing, ambiguous, recovered, mismatched-version/type/identity, recursive and oversized event contexts refuse expansion. Caller helper/idea bindings cannot certify event-local definitions. Shared work budget 4,096; effect/condition depth 16; event recursion stack 8. The separate dependency scanner remains bounded at depth 16 / 12,000 nodes per submitted definition, and discovers nested references even through unsupported wrappers.
- Review fingerprints include event dependency identity/hash/version/lines plus an interpreter revision marker. This is bounded cache identity, not implementation of the planned M7.4.3 patch system. The final-release ledger and strict release gate are unchanged.

## Portugal source findings and before/after

The reunion focus dispatches `lar_portugal_promote_monarchist_cause.2` to Brazil after six hours, guarded by Brazil's existence. Acceptance grants Portugal cores in states satisfying the Brazil-core condition, calls Portugal's `.5` notification, and has Portugal annex event ROOT with troop transfer. Character-nationality effects and cosmetic changes remain unresolved. The scoped news call `.26` has three days plus a random delay below five days; the news audience is not qualified.

Refusal creates Portugal's annexation war goal against event ROOT and calls `.6`. The war-goal block in `.6` is **display-only `effect_tooltip`**, so only one executed war-goal effect is counted. AI acceptance/refusal modifiers depend on government and the flag recording Portuguese participation in Brazil's civil war; conditions are exposed, not evaluated.

The uprising focus retains both Trial of Allegiance routing to `JUNO_brazil_events.190` (and discovered `.191`) and the alternate `.7` event. Empire of Brazil's civil-war `.3` versus peaceful `.4` branches retain guards and unknown political/force-allocation details. Domestic Restoration retains its below-40% stability civil-war branch and alternate stability loss. A named option or resolvable event does not prove any campaign outcome.

The following eight **selected-route HTTP output checks** were absent before and present after. They do not measure all baseline interpreter capability, complete family coverage, or native correctness.

| Targeted field | Before in route review | After in route review | Remaining limitation |
|---|---|---|---|
| Reunion accept/refuse branches | Event cross-reference | Separate conditional options | Player/AI choice unknown |
| Acceptance annexation/troops | Not expanded | Brazil ROOT bound under Portugal scope | Campaign delivery/state unknown |
| Acceptance cores | Not expanded | State loop and Brazil-core guard preserved | Actual qualifying states unknown |
| Refusal consequence | Not expanded; command unsupported | Annexation war goal against Brazil | No war/annexation inferred |
| `.5` / `.6` follow-ups | Not discovered from route | Both linked and interpreted | Notification text is not extra execution |
| `.26` random timing | Not expanded; random call unsupported | Source delay and bound visible | News audience/distribution unqualified |
| AI modifier conditions | Not expanded | Government/participation-flag conditions visible | No normalized probability |
| DLC alternatives | Direct references only; scalar alternate unsupported | Both contextual dispatches visible | DLC entitlement/active configuration unknown |

With expanded discovery Portugal has **197 blocking checks** and **11 event references**. More known effects coexist with more visible risks: the increase from 104 is not a regression score or permission to suppress gaps. Autarky remains 206; Oppose Hitler becomes 67 with four discovered event references. No extra German mechanic was implemented. All three routes stay structurally valid/provisional and reject rank/optimize. Full event closure remains unqualified; `events[].consequences` intentionally stays `unresolved`.

## Provenance and independent evidence

[Source pins](../../tests/fixtures/mechanics-portugal-sources-m741.json) record **19 exact file hashes**, raw/full launcher version, executable hash and retained index revision. The installed audit verifies **15 cited source files** and every pinned file. HOI4 raw version **1.19.4.2**; launcher **Operation Postern v1.19.4.2.2da5 (0bdb)**; executable SHA256 **bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037**. Base-game index revision `39404c534a84409b4cecb169cc9fdb9b1fc5aaf252ad5703bf95077911f22fc9`. A mismatched launcher/source/index refuses the installed audit instead of silently replacing pins.

Authoritative local evidence: `events/LaR_Portugal.txt` reunion `.2` at line 1722, acceptance `.5` at 2128 and refusal `.6` at 2142; `common/national_focus/portugal.txt` uprising at 6462, Empire at 6558, Restoration at 6653, reunion at 6709; `events/TOA_Brazil.txt`, `events/LAR_NewsEvents.txt`; installed effects documentation `country_event` (2943), `create_wargoal` (3311), `news_event` (5053), `set_nationality` (7397); and `common/wargoals/00_invasion.txt` (`annex_everything`, 127). The pin file is the authority for exact bytes. Developer-agent event inspection reported `EVENT_INSPECTED_PARTIAL`, four reunion-related events, and did not certify engine behavior. Official wiki fetches returned 401; mirrors were not promoted to authoritative evidence.

Installed scripts include both DLC alternatives; entitlement, enabled DLC, active playset and mod overrides are unconfirmed. No raw game assets, private campaign data or tool reports are published. Synthetic fixtures are original reduced examples. Exact source checks are independent of provider generation and of the current interface design.

## Validation and use

[Sanitized verification receipt](M741-VERIFICATION.json) records the exact runtime, source checks, before/after field matrix, risk counts, test scope and package receipt. Raw local output stays under ignored `.bridge-local/` and `artifacts/qa/`. Runtime hosted CI passed all four required jobs: [run 43130168168](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43130168168). This includes 130 portable fixture tests plus three workflow checks; local build/typecheck and schema/hygiene pass.

The focused fixtures cover positive/negative choices, conditional cores, ROOT rebinding, no caller FROM/PREV leakage, display-only notifications, follow-ups, missing/ambiguous/recovered sources, changed hash/version, type mismatch, unsupported parameters/alias combinations, cycles, budgets and four 5,000-node stress cases. The HTTP regression confirms nested source evidence, unchanged response shape, dependency fingerprint changes and continued confidence/optimization refusal.

Commands from the candidate worktree:

```powershell
node --import tsx --test tests/explanations.test.ts tests/planning-coverage.test.ts tests/scripted-rewards.test.ts
npm run test-ci
npm run build
$env:HOI4_REFERENCE_DB = '<retained 1.19.4.2 companion.sqlite>'
$env:HOI4_COVERAGE_BASELINE = '<optional retained base audit JSON>'
$env:HOI4_COVERAGE_AUDIT_OUTPUT = '.bridge-local/m741-after-audit.json'
node --import tsx scripts/planning-coverage-audit.ts
npm run schemas
npm run hygiene
```

Consumers use existing `POST /api/v1/strategy/review`: `coverage.references[].summary/requirements` carry nested branches and evidence; `gaps` carries unresolved semantics separately from unavailable state; `events` carries discovered references. `strategy/paths` and comparisons reuse the gate. Source IDs may appear where caller localization lacks a linked event name. No future frontend needs to infer truth from prose, and the current UI is unchanged.

Independent reviewer `/root/review_m741` reviewed final runtime **1d58eb7b79f756620225998bed04ded9e5d16c74** against the approved base: **no remaining blocking findings**. Reviewer independently reran 31 focused tests on `472b6a8c273fd0b39b48efbbf8111475a292a5aa`, checked all 19 pins/launcher/executable against installation, and inspected the final two-line timing disclosure/assertion diff; builder reran all 15 explanation tests after that final change. Three review findings were corrected: unbounded AI/control traversal, unsupported random alias additivity, and trigger applicability. Review does not certify native outcomes, package/UI behavior, complete mechanics, human GitHub approval or user acceptance.

## Artifact, limits and handoff

The final isolated Windows candidate is `M7.4.1-1d58eb7b79f7`, retained locally under `Documents/HOI4 Companion Development Builds/`. ZIP SHA256 **393c4a042e4db9f4a2b21c7dc2809309516be7d4e542a690e5816445faf5e2d6**; all **75** freshly extracted files match. Three actual Companion checks pass: first window 32.6s, renderer/API/installed resources 12.0s, shutdown/restart/recording and plan persistence 5.1s. Packaged resources equal the compiled inputs, source stayed unchanged, the retained screenshot was inspected and all three owned QA process IDs are absent. These are Companion checks, not Portuguese native outcomes. The verification receipt retains exact scope. Earlier `7363152` and `472b6a8` unpacked candidates are superseded and retained. One archive preflight on the first candidate failed because this milestone's walkthrough did not yet exist; no application/game launch occurred in that attempt.

Remaining high-impact gaps are tracked in [Issue #7](https://github.com/connorgreenleaf22/hoi4-companion/issues/7): AI normalization/choice, character transfers/deeper event scopes, civil-war force/territorial allocation, government/leader transitions, dynamic popularity/formulas, event-local helpers/idea modifiers, news audience, active DLC/mod applicability and complete chain closure. Native qualification and desktop usefulness/owner acceptance remain pending. No paid call, native HOI4 launch, personal save/playset change, memory access, injection, merge or release occurred.

Integration requires a separate maintainer decision against `feature/hoi4-ai-m731`, current hosted checks and human approval. M7.4.2 remains independent. If PR #6 is later approved, reconcile its consumer expectations against this interpreter without silently including it here. Project HQ read access was verified; **no HQ Page edits were made**. The generated [Rook/HQ handoff](M741-HQ-HANDOFF.md) is ready for the owner to relay.
