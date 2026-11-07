# Final-release mechanics explanation contract

M7.2 introduces tracking and a blocking release gate, not a new explanation engine. The M7.1 risk-weighted **plan** gate remains separate on its branch. Development builds may expose incomplete, clearly labeled explanations; a final supported-content release may not.

## Supported scope and denominator

No final-release content configuration is approved yet. The candidate qualification target is Windows HOI4 **1.19.4.2**, full launcher version `Operation Postern v1.19.4.2.2da5 (0bdb)`, executable SHA256 `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037`, English explanations, no gameplay mods. This does not establish support for other versions, mods, languages or every DLC activation combination.

`npm run coverage:inventory -- GAME_ROOT NEW_OUTPUT_DIR --inventory` creates a read-only, exact installed-content candidate profile: executable hash/version and sorted path/hash/size inventory for every file under `common`, `events`, `history`, `map`, `interface`, `localisation`, `tutorial`, `dlc`, `integrated_dlc`, and `dlc_metadata`. DLC descriptors and opaque archives are included. The profile digest pins the full list, not just a version label. Files outside these roots (including launcher assets, graphics/audio, binaries and documentation) are outside the initial census; an independent scope review must prove they contain no omitted gameplay definitions or add them. Links fail instead of silently crossing the declared scope. This census is deliberately conservative and includes non-mechanics.

Before final release, publish an approved, immutable profile with its exact DLC IDs, descriptor hashes, activation/entitlement configuration, mod order/replacement rules (empty for the candidate), language, executable hash, source inventory digest, inventory-scope audit and reproducible validation report. **Installed DLC files do not prove activated/owned DLC.** Each supported activation/configuration variant needs a reviewed profile or explicit branch-complete parameterized proof. The current unapproved profile cannot pass by being named “vanilla.”

## Obligations and semantic acceptance

The generated `obligations.jsonl` retains source path/hash/line and stable structural address for every source file and ordered script node. Duplicate keys, anonymous entries, country/state scopes, nested conditions and event references remain separate obligations. Non-script text receives line obligations. Unsupported/large/binary content and strict-parser failures receive explicit blockers. Counts are not a claim that syntax is semantics, and are not strategic significance scores.

Coverage must include all relevant requirements, costs, effects, modifiers, scope transitions, limits, conditional alternatives, random weights, timing, on-actions, events/options, decisions, focuses, technologies, doctrines, ideas/national spirits, units/equipment, resources, country/state history, defines, scripted effects/triggers, variables, localization substitutions and downstream dependencies. An explanation must account for every branch, not merely the branch observed in one campaign. A cross-reference creates an obligation to resolve the destination and context; a source-file review must establish those dependencies and complete definition membership. Cycles require bounded semantic reasoning, not silent truncation.

Each `explanation-coverage-reviews.json` entry binds a source obligation to:

- `explained` or independently justified `non-mechanic` disposition;
- source-backed evidence and a named independent reviewer;
- the verified semantics, conditions/scopes and downstream dependencies;
- named regression cases present in the current passed-test attestation.

An unresolved diagnostic, localized label, copied script, partial summary or one successful example is insufficient. Opaque content and parser failures remain blockers even if a ledger attempts to mark them explained. Non-mechanic exclusions are counted separately and must be audited; they do not inflate the explained-mechanic numerator. Meaningful tests compare expected mechanics against authoritative source/documentation and independently understood outcomes, including negative branches, costs and conflicts. A self-consistent parser test is not a semantic oracle.

The checker enforces completeness of this evidence structure, not the truth of human review prose. Independent scope/semantic review and trustworthy test attestations are mandatory release responsibilities. The empty checked-in ledger grants **no** approvals. A future reviewed implementation can provide richer machine-verifiable dependency/test bindings; this milestone does not fabricate those approvals.

## Measurement, invalidation and release enforcement

`server/release-coverage.ts` counts total, explained, non-mechanic and unresolved obligations and groups unresolved constructs. `scripts/release-coverage.ts` writes profile, obligations and report outside tracked sources. Do not commit raw installed assets or generated inventories. Zero unresolved obligations, a nonempty inventory, exact profile/implementation identity, approved denominator and current regression evidence are required. Stale/unknown/duplicate review IDs reject. Every unresolved item is independently addressable by its stable ID; no count-only waiver exists.

The implementation digest covers TypeScript under server/src/tests , the coverage scripts, package configuration and dependency lockfile. Source-byte changes change obligation IDs; added/removed files or executable/content/configuration changes invalidate the profile; interpreter/test/dependency changes invalidate test attestations. This is conservative: some nonsemantic edits require renewed attestation. External semantic dependencies and activation configuration must additionally be pinned in the approved profile/scope evidence before release.

`npm run package` now runs `prepackage` and refuses unless `HOI4_COVERAGE_GAME_DIR`, `HOI4_COVERAGE_OUTPUT` (a new evidence directory) and `HOI4_COVERAGE_LEDGER` select a passing current audit. Direct tool invocation can bypass npm hooks; release policy prohibits doing so. Existing QA-LEDGER gates also remain mandatory. No hosted native-game CI or release publication is added. `npm run package:development -- M7.2` remains an explicitly incomplete, isolated test build path.

## Campaign state and M7.1 reconciliation

A fully interpreted conditional mechanic can still have an **unknown campaign outcome**. State facts require independent source/version/session/world/freshness checks. Save time is persisted history; recent file modification is not live proof. Manual assertions retain their identity. Additional fields never automatically grant plan ranking/optimization eligibility.

When merging development baselines, map the final-release census into M7.1's existing `src/planning-coverage-types.ts` and `server/planner/coverage.ts` by source identity and condition/dependency references. Do not replace its frequency/significance prioritization, plan-level critical-mechanic checks or provisional/editable recommendation policy. M7.2 has imported none of that implementation. M7.3 AI planning remains provider independent and must consume those risk decisions explicitly. Final 100% scope coverage and safe provisional planning during development are different gates.
