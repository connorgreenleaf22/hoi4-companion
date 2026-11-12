# M7.4.1b — Practical focus and event knowledge expansion

**Candidate, not owner-accepted.** Adds source-qualified political explanations and reusable path summaries for exactly three scenarios: Portugal monarchy/Brazil union, legacy Germany Oppose Hitler/Kaiser, and legacy Hungary Habsburg restoration. The largest concrete prerequisite correction preserves repeated focus exclusions: a Habsburg-plus-fascist king plan that previously passed now rejects. No complete engine-parity or native qualification claim.

Branch `feature/hoi4-knowledge-paths-m741b`; runtime **f4b7449e7c0a524025ebf015321b2806f161ff01**. Explicit owner-approved stacked baseline **895ef1cc16da27887d535165b8ea866476d148a4** from [PR #9](https://github.com/connorgreenleaf22/hoi4-companion/pull/9), unchanged and unmerged. This fresh decision supersedes the older HQ bdb8 baseline for this task only. [Draft stacked PR #12](https://github.com/connorgreenleaf22/hoi4-companion/pull/12) targets PR #9’s feature branch. [Manifest](../milestones/M7.4.1b.json) · [verification receipt](M741B-VERIFICATION.json) · [three player briefs](M741B-PLAYER-BRIEFS.md) · [acceptance procedure](MILESTONE-7.4.1b-ACCEPTANCE.md) · [remaining gaps, Issue #7](https://github.com/connorgreenleaf22/hoi4-companion/issues/7).

## 1. Audit and priorities

Retained base index revision `39404c534a84409b4cecb169cc9fdb9b1fc5aaf252ad5703bf95077911f22fc9` contains 10,341 focuses, 6,990 events, 3,931 decisions and 5,409 character definitions. A bounded traversal of those focus/event/decision ASTs counted **21,262 records / 912,816 nodes**. Counts below are raw occurrences, including metadata/conditions and repeated chains; they do not measure explanation quality. This was a retained-index census, not revalidation of every installed source. The route audit independently verifies all 20 snapshot pins and 15 cited route files against the current installation.

| Priority / family | Retained occurrences | Needed source information vs interpreter functionality | Result / remaining significance |
|---|---:|---|---|
| P1 focus dependencies / exclusions | 8,800 `has_completed_focus` | Existing ordered AST already retained repeated blocks; derived exclusion list lost later blocks | Shared normalization fixes import, cached tree reads and reference explanations; both Habsburg sibling exclusions visible and conflict rejected |
| P1 government / popularity | 547 `set_politics`; 71 `set_popularities`; 160 `neutrality` keys | Installed effect/trigger docs define literal units/scopes; no additional parser needed | Literal political assignment, exact 100-point popularity distributions and four ideology-group thresholds explained; dynamic/duplicate/malformed/custom cases remain unsupported |
| P1 state prerequisites | 3,655 `controls_state`; 2,423 `owns_state` | Existing nodes suffice; interpreter lacked useful descriptions | Literal state checks now distinguish ownership from control; actual state unknown |
| P1 character / leader roles | 278 `promote_character`; 860 `has_country_leader`; 700 `add_country_leader_role` | Character/role records exist; eligibility, transfer and scope bindings need more integration | Conditional promotion primitive explained with an explicit unresolved role child; no actual leader certification |
| P1 civil war / country state | 290 `start_civil_war`; 8,028 `has_government` | Existing source has allocations and guards; a runtime state/model is missing | Existing conservative civil-war warning retained; no distribution/victory model |
| P1 event/random/opinion branches | 317 `random_list`; 1,124 `has_opinion` | Source choice weights and guards exist; normalization, opinion/strength evaluation and complete closure remain unqualified | Discover branches through same index; do not turn weights into success chances or suppress unknowns |
| P1 configuration / helpers / decisions | 2,532 `has_dlc` | Need entitlement/active tree/playset and own event-local helper/idea context, not more raw base files alone | Preserve explicit supporting decisions and source guards; no entitlement or merged-mod authority inferred |

Existing `parser.ts` preserves ordered nodes; importer/SQLite retain identity, source bytes and ambiguity. `entryMechanics` and the interpreter provide shared explanations. `treeFocuses`, the planner and `coverage.ts` review the actual submitted sequence; `POST strategy/review` remains the policy boundary. No second parser/index, database schema, production frontend, provider, telemetry or live-Q&A implementation was added. The small `focusExclusions` helper reads only repeated top-level literal blocks, preserves malformed raw checks for the coverage gate and does not mutate retained rows.

## 2. Three-route coverage matrix

| Scenario | Focus route / nominal duration | Major branches and practical requirements | Source/configuration qualification |
|---|---|---|---|
| Portugal monarchy / Brazil union | Eight existing regression focuses; 560 nominal days | Restoration below 40% stability can trigger civil war; cause decisions remain explicit; conditional Brazil government/popularity/character changes; union accept/refuse, troops/guarded cores vs war goal | `La Resistance` tree selection; TOA/JUNO and older dispatch alternatives remain distinct; active entitlement/configuration unknown |
| Germany Oppose Hitler → Kaiser | Oppose Hitler → Secure the New State → Revive the Kaiserreich → Return of the Kaiser; 245 nominal days | Civil war; peace/no surviving fascist original-Germany condition; free-election conflict; >40% non-aligned support, Mackensen and Netherlands checks; Dutch accept/refuse and follow-ups | Audited legacy branch explicitly uses NOT Gotterdammerung. Distinct `_ww` branch is not silently substituted; source visibility/game rules partially unsupported |
| Hungary Habsburg / Austrian referendum | Balanced Budget → Strengthen Monarchists → Elect a King → Invite Habsburg Prince → Demand a Referendum → Restoration; 420 nominal days | >30% support; non-aligned government; both king exclusions; Austria existence/independence/peace; referendum/refusal/rigging; four state controls and independence before restoration | Legacy Death or Dishonor tree weight +10; installed Gotterdammerung alternative tree weight +50. Active tree requires campaign check; installed scripts do not prove entitlement |

Durations are sums of source nominal focus days, not elapsed completion forecasts. Bypass, stored progress, events, civil-war/war outcomes and waiting can change the schedule. The readable briefs document major event choices, timing, opportunities, unresolved conditions and next steps without expanding to more countries or treating every discovered news event as a strategic action.

## 3. Reusable backend capability and evidence

Add `includePathSummary: true` to the existing valid version-1 review request. The normal response is unchanged when absent. The opt-in result adds `pathSummary` alongside `coverage`, including:

- starting scenario, assumptions and source tree-selection script;
- ordered milestones, prerequisite explanations, immediate source actions and nominal days;
- conditional option records with branch-local consequences, full ancestor guards/scopes, exact evidence and unresolved-context flags;
- event dependencies/timing, explicit supporting decision references, semantic gaps separately from unknown campaign state;
- `source-mechanic` / `source-only` facts, `rules-based-inference` advice, empty `documentedExternalStrategy`, and explicit absent live state;
- bounded counts/omissions and a readable export. The full review remains authoritative when the brief omits detail.

Summary schema/version is `1` / `path-brief-v1`. Consumers must retain application/interpreter build identity with `reviewFingerprint` and source hashes; the existing fingerprint alone is not a cross-build interpreter-version identifier. Do not convert source-only facts into campaign truth. `policy` is copied from the actual coverage review; `rank` and `optimize` still return 422. `server/planner/coverage.ts`, CI workflow/allowlist and shared proposal contracts are unchanged. Future Adaptive Strategy Workspace integration should consume this additive object, preserve editable/provisional status and source indicators, and supply separately qualified campaign observations rather than overwriting manual assumptions.

Before/after evidence uses the same three source scenarios and supporting references, not the older Portugal-only count with different supporting research:

| Player-relevant field | Baseline output | Candidate output / practical value |
|---|---|---|
| Portugal political assignment | Unsupported `set_politics` | Five conditional assignments visible with Brazil recipient; does not imply popularity or known leader |
| Portugal literal shares | Unsupported `set_popularities` | Two fixed distributions distinguished from percentage-point changes; dynamic third distribution stays unknown |
| Portugal role promotion | Unsupported primitive | Three conditional descriptions, each retaining unresolved eligibility; no force/leader guarantees |
| Germany return prerequisite | Unsupported `neutrality > .4` | More than 40% support appears in both structured and readable brief |
| Hungary king prerequisite / state controls | Unsupported threshold and controls | >30% support plus all four control checks; explicit difference from ownership |
| Hungary second exclusion | Only democratic king visible; Habsburg + fascist sequence passed | Both exclusions visible; same incompatible sequence rejected through actual HTTP review |
| All three player briefs | No path-summary response | Source-qualified milestones/choices, next-check advice, bounds, evidence and separated unknowns; default response/policy unchanged |

Diagnostic blockers are **196→189 Portugal, 511→511 Germany, 225→225 Hungary** for the matched valid sequences; events are 11/17/14. These counts are not quality percentages. The Hungary conflict correction and useful literal requirements matter more than a reduction. The German result deliberately retains extensive downstream uncertainty. Unknown promotion roles remain blocking children even where their source primitive is now readable.

## 4. Verification, review and delivery

[Source pins](../../tests/fixtures/knowledge-path-sources-m741b.json): 20 exact file hashes, raw/full launcher version, executable SHA256 `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037` and retained index identity. Installation remains **1.19.4.2 / Operation Postern v1.19.4.2.2da5 (0bdb)**. Fifteen actual route evidence files match installed bytes; documentation and alternative-tree pins add the remaining qualification evidence. Hash/version/new-dependency mismatches refuse instead of replacing pins. No raw game scripts, personal campaigns, account metadata or tool reports are published.

The enabled developer event inspector reported partial German event tracing (four events, truncated boundary), not engine verification. It exposed both legacy and `_ww` roots; the Companion reuses its own existing AST/index for backend explanations. Source mechanics were checked against installed effect/trigger documentation (`set_politics`, `set_popularities`, `promote_character`, ideology-support and state-control primitives). No external strategy knowledge was needed.

Validation: **42 focused tests** including original interpreter/planning/importer tests and new negative/duplicate/malformed/scope/ambiguity/patch fixtures; TypeScript/build; installed-source HTTP three-route audit and incompatible Hungary negative. Runtime hosted CI [run 43180782000](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43180782000) succeeds. CI is fixture-only; no allowlist expansion. Full command/output hashes, separate review and isolated package receipt are recorded in `M741B-VERIFICATION.json`.

Independent reviewer `/root/review_m741b` identified three material issues: readable export omitted gates and selected verbose nested effects; unknown guard context was not propagated; repeated exclusion blocks were lost by the existing importer. Fixes and regression evidence are retained; exact final review and package results are recorded in the receipt. Earlier b1444a7 and 4ace07d isolated ZIPs are retained as superseded, with no Companion or HOI4 launch on those candidates.

Final isolated Windows build is commit-identified in the receipt. Fresh ZIP extraction, byte equality, actual Companion launch/service/persistence and screenshot inspection are distinct from native HOI4 qualification. **No HOI4 launch, paid inference, gameplay action, personal save/playset edit, memory access/injection, protected merge, release or Page mutation occurred.** Owner usefulness and native acceptance remain pending.

## Significant remaining gaps and integration

Full event closure and option localization; AI/random normalization and actual choices; strength/opinion/game-rule checks; country-leader/character role eligibility, transfer and deeper FROM/PREV; civil-war force/territory and victory; dynamic popularity/economy formulas; event-local helper/idea bindings; complete decision/research/military preparation; news audience; active DLC/tree/mod applicability and live campaign state remain unresolved. The brief explicitly reports omitted option/action details; it is not a complete strategy or native simulator. [Issue #7](https://github.com/connorgreenleaf22/hoi4-companion/issues/7) remains open.

Integration is stacked: review PR #9 and this PR separately, decide the integration order, reconcile future branch movement and require current CI plus explicit maintainer approval. No merge is requested. PR #6, PR #8/M7.4.2b, live-Q&A and UX remain independent. Existing production screens do not automatically consume `pathSummary`; future workspace integration is additive and must preserve policy/qualification. HQ/product-spec/coordination Pages were read successfully; **no Page was edited**. The owner can relay [the short Rook/HQ handoff](M741B-HQ-HANDOFF.md); Rook is a separate ChatGPT Dot, not this reviewer.
