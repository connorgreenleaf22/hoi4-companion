# M7.4.2 — Source-backed meta evaluation foundation

**Engineering status: offline-tested; owner acceptance and human merge approval pending.** [Draft PR #8](https://github.com/connorgreenleaf22/hoi4-companion/pull/8) · [manifest](../milestones/M7.4.2.json) · [verification receipt](M742-VERIFICATION.json) · [API/formulas/uncertainty](DESIGN-EVALUATION.md) · [bounded acceptance](MILESTONE-7.4.2-ACCEPTANCE.md).

Owner-confirmed baseline: `feature/hoi4-ai-m731`, **bdb8a4887522b38f5110f3900bbf1655cc5fd600**. Isolated branch: `feature/hoi4-knowledge-meta-lab`. Tested implementation and Windows package source: **44549fbc5216cf1b5f2f46190c523137f45fd8ce**. Subsequent report/manifest commits do not replace this runtime identity. PR #6 remains excluded; no merge or release is performed.

## Delivered and reused

The existing Division Lab calculator already sums unit requirements, but silently defaults missing fields to zero and does not establish source identity, model assignment or unlock membership. The existing equipment calculator correctly inherits archetype defaults rather than research-parent statistics; its first-match dependency lookup requires a prior ambiguity check. The production calculator already accepts stockpile/output assumptions, but those are outside a base equipment-cost comparison.

The new `server/design-evaluation` module wraps these existing calculations with a strict versioned candidate/scenario/result contract, canonical resolution, application-owned source qualification, explicit concrete model assignment, technology assertions and source-invalidated results. It exposes `evaluateDesign`, `compareDesigns`, `designResultIsCurrent` and `indexedDesignSource`. A readable CLI and a complete JSON demo are built alongside `build/design-evaluation.cjs` for future frontend/service consumers. No permanent UI architecture or HTTP surface is introduced.

Source fixture inputs were captured through the current ordered importer in an isolated disposable index. Seventeen minimal definition projections from eleven installed files are pinned to **HOI4 1.19.4.2**, importer revision 5; exact path, definition line, file hash, projection digest and dependent research/archetype references are retained. The audit independently parses the installed files and matches the projections. Full scripts, raw indexes, personal saves/configuration and account data are excluded from Git.

## Reproducible comparisons

All values are **unmodified full-establishment resource requirements**. Scenario: manual counterfactual, No Step Back disabled, no mods/modifiers, fixed equipment models, zero upgrades, positive manual research assertions. No campaign eligibility or engine combat behavior is implied.

| Candidate | Nominal width | Manpower | Equipment (rifles / guns / tanks / trucks) | Base IC |
|---|---:|---:|---|---:|
| 6 infantry | 12 | 6,000 | 600 / 0 / 0 / 0 | 300 |
| 9 infantry | 18 | 9,000 | 900 / 0 / 0 / 0 | 450 |
| 9 infantry + 1 line artillery | 21 | 9,500 | 900 / 24 / 0 / 0 | 534 |
| 9 infantry + 2 line artillery | 24 | 10,000 | 900 / 48 / 0 / 0 | 618 |
| 6 medium + 4 motorized | 20 | 7,800 | 400 / 0 / 300 / 140 | 4,150 |
| 5 medium + 5 motorized | 20 | 8,500 | 500 / 0 / 250 / 175 | 3,687.5 |
| 8 medium + 7 motorized | 30 | 12,400 | 700 / 0 / 400 / 245 | 5,762.5 |

Five explicit right-minus-left comparisons are golden-tested: 9 infantry → 6 infantry (**−6 width / −3,000 manpower / −150 IC**); → 9+1 (**+3 / +500 / +84**); → 9+2 (**+6 / +1,000 / +168**); 6 medium+4 motorized → 5+5 (**0 / +700 / −462.5**); → 8+7 (**+10 / +4,600 / +1,612.5**). JSON output also includes per-model quantity deltas and every calculation dependency. These values do not identify a winner.

Width and manpower are sums of explicit per-unit values times unit counts. Equipment requirements use the declared `need` quantities; IC is quantity times the assigned model's concrete or archetype-inherited `build_cost_ic`. Force requirements multiply by the explicit division count. In this installation, the fixed medium model is in **x_tank_chassis.txt** and costs **12 IC**, while an incomplete designer chassis costs **3.75 IC**. The evaluator never substitutes the chassis cost for a finished tank. Full equations, hand-worked examples and source locations are in the API documentation.

## Verification and review

- `node --import tsx --test tests/design-evaluation.test.ts tests/design-evaluation-index.test.ts`: **37 pass**, including seven hand-worked candidate totals, five comparisons, malformed inputs, source/version/hash changes, unsupported modifiers/designers, missing technologies, contradictions, tampered saved results, ambiguous dependencies and existing SQLite persistence/reopen/invalidation.
- `npm run test-ci`: **159 portable fixture tests plus 3 workflow guards pass**. Only the pure new evaluator test is added to hosted CI. Installed indexing/audits, SQLite integration and Windows application processes remain outside the hosted allowlist. The reviewer independently inspected transitive imports.
- TypeScript, production build, compiled JSON developer demo, local schema and hygiene checks pass. Read-only installed audit: **11 files, 17 definitions, 7 candidates** match. This verifies static inputs and arithmetic, not engine performance.
- All four required hosted checks pass on runtime SHA `44549fbc5216cf1b5f2f46190c523137f45fd8ce`: [CI run 43129361372](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43129361372).
- Builder `/root`; independent read-only reviewer `/root/review_m742` reviewed the exact full runtime SHA above against the owner-confirmed baseline. **No blocking findings.** Reviewer independently ran all 37 focused tests, typecheck and source audit; checked the fixed-tank cost distinction, five deltas, strict assumptions, canonical resolver, stale-result behavior, fixture hygiene and CI boundary. This is agent review evidence, not a human GitHub approval or owner acceptance.
- Windows package and final evidence details are recorded in the verification receipt. Package regression results and final evidence review are retained separately from static formula qualification.
- All seven candidates additionally pass through the actual full installed-source disposable index using the existing SQLite resolver. The package has 75 matching extracted files and three passing actual Electron launch/service/offline-save/restart cases; both packaged API/demo modules match the source build, and the extracted standalone demo passes. The separate reviewer independently recomputed the ZIP/EXE hashes, compared every extracted file and module, ran the extracted demo, inspected the reopened screenshot and verified unchanged source identity and absent owned processes. Final evidence reviewed: **2c0cdc4cdd6e2276e17bf99dfd09dcbb9505f17c**, no blockers. [Documentation CI 43130239831](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43130239831) passes all four checks. The local compiled-check harness needed a CJS import correction before its successful run; no product change or repeated package run was needed.

## Remaining bounds and integration

Only four line units and four fixed equipment models are qualified. Organization, attack, defense, breakthrough, armor/piercing, supply/fuel, terrain, production time and combat outcomes are explicitly unsupported. Old calculator organization/supply outputs are not surfaced. Support-company weighting, designer-module aggregation, doctrines, MIO/country/variant modifiers, research prerequisites and actual country/campaign eligibility need separately validated rules. Source freshness depends on reindexing or an explicit installed audit; there is no automatic on-disk polling. M7.4.3 remains planned, with no broader knowledge invalidation system added here.

The API documentation gives the next finite validation steps for terrain, doctrines, measured combat performance and broader military equipment. Extensive aircraft/naval/whole-strategy optimization is deferred. No paid provider request, HOI4/gameplay execution, invasive interface, personal-data change or observation qualification occurred.

Integration requirements: retain the confirmed common baseline; review any future overlap in `AGENTS.md`, roadmap/STATUS, `scripts/build.mjs`, `package.json` and CI allowlist with the M7.4.1 workstream. Numerical evaluation owns its new module/types/fixtures; M7.4.1 owns the interpreter; UXD-01 remains read-only. Future AI-assisted consumers still require the existing strategy review/coverage policy and must not convert these base resource deltas into confident recommendations. No integration of PR #6, protected-branch merge or release is authorized here.

The concise [Rook/HQ handoff](M742-HQ-HANDOFF.md) is generated from the schema-valid manifest. Current HQ access was verified read-only; synchronization is pending. The owner will provide this local task's handoff to Rook; no search for a local Rook chat or automated message is required.
