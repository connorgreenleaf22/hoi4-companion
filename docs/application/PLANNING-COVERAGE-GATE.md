# Risk-weighted planning coverage gate

Implemented as M7.1 follow-up groundwork for M7.3, 2026-11-07. **M7.1 acceptance remains open. No AI generation or optimal strategy is claimed.** Existing Node service, planner, interpreter, SQLite index and editable alternatives are reused. No new dependency, provider, telemetry export or gameplay adapter.

## Policy and interfaces

`src/planning-coverage-types.ts` defines a version-1, provider-independent proposal/review contract. `server/planner/coverage.ts` reviews the exact submitted focuses and up to fifty supporting decision/technology references. `POST /api/v1/strategy/review` accepts:

```ts
{
  schemaVersion: 1,
  profile,                 // existing validated Profile; manual scenario, not live truth
  plan,                    // existing editable CampaignPlan
  supportingReferences: [], // explicit same-index decision/technology definition references
  indexRevision,
  intent: 'provisional'    // alternatively 'rank' or 'optimize'
}
```

The service recomputes coverage; caller-supplied confidence/coverage cannot certify anything. HTTP 200 permits a labeled provisional draft. HTTP 422 returns `{allowed:false, coverage}` for invalid sequences or any rank/optimize request. HTTP 409 rejects a stale index or saved-profile revision. Malformed/unresolved supporting references return 400. Read-only review never saves or executes a proposal. The existing preview/apply flow remains responsible for explicit edits/persistence and its revision checks.

`strategy/paths` and `strategy/compare` now attach the same review. The renderer displays it on routes, saved comparisons and **Review current draft coverage**; editing invalidates the displayed review. The result includes policy version, input/source fingerprint, dimensions, assumptions, structured explanations, gap kinds, criticality, condition/scope ancestry, paths/lines/hashes/game version/index revision and event references where resolvable. Fingerprints identify a review; they are not authorization tokens or permanent certificates. Always recompute after an edit, source change or campaign update.

Checks cover costs/duration, ordered prerequisites, both directions of branch exclusions, source rewards, event dependencies and source context. Missing/ambiguous references, duplicates, malformed or unsupported structure, unaccounted top-level declarations, unknown costs and parser recovery cannot silently become complete coverage. Conflicts are checked even when prior completion is conditional. Unknown current campaign state is distinct from unknown script semantics. Explicit manual positives are not inferred from absent telemetry fields.

Three separate questions remain visible:

1. Is the focus sequence structurally supported by the submitted references and manual assertions?
2. Which source mechanics and campaign conditions remain unresolved?
3. Is there a qualified whole-strategy objective/economic/military model?

The third answer is currently **no**. Critical/high gaps veto confidence, ranking and numerical optimization; removing those gaps would still not qualify a utility model. Every review also records the incomplete whole-strategy scope: omitted decisions, research and preparation cannot be discovered merely from a valid focus chain. Provisional drafts stay editable. Known effects remain available beside uncertainties, never replaced with a single unsupported-summary fallback.

## Targeted audit and priorities

`scripts/planning-coverage-audit.ts` uses the retained index read-only, copies relevant definitions into a disposable service, and tests the real HTTP endpoints. It does not index again or launch HOI4. `tests/fixtures/planning-coverage-sources.json` pins Portugal/Germany focus-file hashes and game **1.19.4.2**. All **12 cited source files**, including linked idea/helper/event sources, are checked against their actual installed hashes. Changed files/versions fail the audit rather than silently refreshing the baseline.

Corpus: **20 distinct submitted definitions** (17 focuses, two Portuguese decisions, Basic Machine Tools), plus tree/source context. These are targeted path measurements, not global explanation percentages or native eligibility verification.

| Priority category | Risk | Definitions affected | With semantic gaps | With unavailable campaign state | Plans affected |
|---|---|---:|---:|---:|---:|
| Eligibility and branch conditions | Critical | 18 | 13 | 17 | 3 |
| Event choices/downstream consequences | Critical | 6 | 6 | 0 | 2 |
| Civil-war consequences | Critical | 1 | 1 | 0 | 1 |
| Other uninterpreted mechanics | High | 9 | 9 | 0 | 3 |
| Dynamic economy/variable formulas | High | 8 | 8 | 0 | 2 |
| Recipients/scoped effects | High | 7 | 7 | 0 | 1 |
| Research/military preparation | High | 7 | 7 | 0 | 1 |
| National spirits/modifiers | High | 6 | 6 | 0 | 2 |
| Government/political transitions | High | 3 | 3 | 0 | 1 |
| Campaign applicability | High | 2 tree contexts | 0 | 2 | 3 |
| Whole-strategy completeness | High | 2 tree contexts | 2 | 0 | 3 |
| Names/localization | Low | 3 | 1 | 0 | 2 |

Counts overlap: a definition may have both kinds of gap and several categories. Repeated nodes, helper invocations and reused focuses are deduplicated by exact definition in the priority calculation. Sort by risk first, then distinct definitions × weight (critical 5/high 3/low 1), then affected plans. This is an explicit, conservative engineering triage policy, **not a strategy confidence score**. A rare civil war is never averaged away by many understood or cosmetic fields. All non-low gaps currently block confidence; a future model must justify any narrower domain policy separately.

The monarchist Portugal route to `POR_the_kingdom_reunited` has eight ordered focuses, with both restoration and Brazil prerequisite arms. Supporting references include the two monarchist-sentiment decisions and Basic Machine Tools. Germany regressions use the eight-focus Autarky route and Oppose Hitler. All three have supported ordering, remain provisional and reject rank/optimize requests. Removing an ancestor causes rejection. The deterministic HTTP tests additionally reject reversed exclusions, duplicate steps, stale context and forged confidence.

## Targeted interpretation improvements

- Fixed a real Portugal route defect: its root's empty prerequisite block was already normalized by the importer but rejected by the explorer. Empty blocks now represent no listed prerequisite; nonempty unsupported syntax still rejects.
- `has_stability < 0.4` explains the below-40% condition. A known `start_civil_war` ideology now exposes the civil-war consequence and preserves scope/guards, while force allocation, dynamic size, leaders and later outcomes remain explicitly unsupported. Portugal's alternative stability loss remains separately explained.
- Display-only `effect_tooltip` blocks, `show_ideas_tooltip` and `unlock_decision_tooltip` no longer masquerade as executed rewards/event dispatches or genuine decision unlocks. This prevents false rewards as well as false risk counts.
- Linked national-spirit modifier evidence now points at its idea source, not an unrelated focus-file line.

Semantics were checked against this installation's `documentation/effects_documentation.md` (`start_civil_war`, `effect_tooltip`, `show_ideas_tooltip`, `unlock_decision_tooltip`) and `triggers_documentation.md` (`has_stability`), plus actual Portugal declarations. The official wiki fetch was unavailable (401); no third-party code was executed and no mirror was treated as stronger evidence. These are source/documentation checks, not independently observed native outcomes.

## Deliberate limitations and next milestone

Event discovery is bounded to depth 16 / 12,000 visited nodes per submitted definition, including linked helpers and unsupported wrappers. Repeated calls retain their guards; recursive/bounded scans stay incomplete. A resolvable event links to its definition but **its choices, weights, recipient decisions and downstream chains are not simulated or qualified**. Unresolved/ambiguous event IDs remain blockers. Display-only tooltip blocks are excluded. Complete event closure is the next useful improvement, not a reason to allow confidence now.

Technology schedules/prerequisites, political transformation scripts, selective/random state scopes, many national-spirit units, parameterized helpers, dynamic cost formulas and mod merging remain partial. `select_effect` and unknown lifecycle declarations are flagged even when the existing summary omits them. No complete research/economic/military strategy generator exists. AI prose must never fill these gaps with invented mechanics. Source `reviewed` means only no significant gap detected in the submitted dimension, not exhaustive semantic coverage.

Next smallest work: resolve Portugal's Brazil-union event choices and response conditions with bounded source-backed event closure, then qualify the civil-war size formula and sentiment-decision costs/conditions. In parallel planning scope, specify explicit decision/research/preparation tasks and their dependencies in the provider-neutral envelope. Keep proposed plans provisional until those practical path gates pass. Autarky's resource requirements and dynamic modifier formulas are the German economic qualification case. AI-provider integration can generate editable proposals later; it cannot bypass this review.

## Verification and running

- **31 distinct focused tests pass** across planning coverage, strategy, explanations and scripted rewards; final overlapping coverage rerun 10/10. TypeScript and production build pass.
- Real installed-source HTTP regressions pass for all three goals, supporting references, negative ancestor removal and rank/optimize refusal. Evidence: `.bridge-local/planning-coverage-audit.json`; test logs `.bridge-local/planning-coverage-tests-final.txt` and `.bridge-local/planning-coverage-final-targeted.txt` (ignored).
- Renderer source/reward/keyboard/mobile journey passed at `artifacts/qa/explanation-browser-2026-11-07T07-02-49-704Z-6bbf3d0e/`. Screenshot inspection exposed the inherited horizontal notice layout; coverage now uses a readable block layout. Final packaged verification is recorded below when completed.
- Initial new tests exposed omission of the partial civil-war preview and duplicate/dynamic costs; both were fixed before the passing run. One edit failed under Windows' default Python text encoding, producing no edits; subsequent edits use UTF-8. Audit harness first required a CommonJS-compatible async wrapper, then exposed the real empty-prerequisite defect and a localized assertion mismatch (Fascist/fascism). Renderer setup omitted the recording environment variable; the harness now checks it before starting. No native launches or unchanged game-operation retries.

Developer checks:

```powershell
node --import tsx --test tests/planning-coverage.test.ts tests/strategy.test.ts tests/explanations.test.ts tests/scripted-rewards.test.ts
node --import tsx scripts/planning-coverage-audit.ts
npm run build
```

The installed audit requires `.bridge-local/m71-audit-db/companion.sqlite` from the retained 1.19.4.2 index; deterministic tests do not require HOI4. For the renderer journey set `HOI4_INTELLIGENCE_RECORDING` to the retained `owned-snapshots.jsonl` first. Investigate a source/hash mismatch rather than regenerating baseline pins automatically. No service writes to game files, saves, mods or playsets. Broad QA-LEDGER gates, actual desktop acceptance and native outcomes remain open.

## Final Windows development artifact

- Runtime/source **2fefb1911533**, `M7.1-2fefb1911533`. ZIP: `C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.1-2fefb1911533/M7.1-2fefb1911533-windows-x64.zip`.
- SHA256 **6223e6afef14253ba55245775d49be68b454dc2a22efe404b3ccd62a860f0589**. All **76** freshly extracted files equal the packaged originals. The intermediate 027a056 build is superseded: compiled CSS inspection caught the later global notice rule overriding the first layout fix, corrected by specificity before native application acceptance. No HOI4 test was needed.
- Three actual extracted-Electron checks pass: first window/index **32.0s**, renderer/API/source resources plus search/plans/coverage/references/history **36.8s**, shutdown/restart/persistence **6.3s**. The renderer asserts the corrected block layout, provisional label, refusal wording and enabled draft button; the existing strategy journey also reviews the edited draft. Actual packaged modules match compiled resources; developer PATH/Node environment is removed. Evidence: `artifacts/qa/development-package-2026-11-07T07-10-21-305Z-7cbe46cc/`. Source unchanged during run, screenshots reviewed; all three owned harness/application process IDs absent afterward.
- Extract the whole ZIP into a new folder and open `win-unpacked/HOI4 Companion M7.1-2fefb1911533.exe`. Keep all resources alongside it and follow **START-HERE.md**, including the risk-weighted planning follow-up. The unsigned build is isolated under `%APPDATA%/HOI4 Companion Development/M7.1-2fefb1911533/`, requires no desktop Node/npm, and has no update/release behavior. The normal build profile remains fresh; tests used disposable storage.
- Older M7.1-7b797e04d7c6 ZIP hash remains `88b4f07c0a519f340e7c331a563f96b3bf8a2a80597ee3183b9e4234267ef037`. Personal saves, mods, playsets and installed companion are unchanged. No native HOI4 launch or gameplay action occurred.
- `npm run browser` remains a development alternative using the same service/renderer in the system browser with checkout/system Node, rather than bundled Electron and this build's isolated profile. For slow first indexing allow up to two minutes; retain this build's diagnostics if startup fails, and do not repeatedly launch HOI4. Full desktop acceptance and the pre-existing broad QA gates remain open.
