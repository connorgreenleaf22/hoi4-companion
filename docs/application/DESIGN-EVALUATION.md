# Military design evaluation API v1

M7.4.2 supplies a deterministic service module for the future AI-first Adaptive Strategy Workspace. It uses the existing ordered importer, canonical SQLite resolver, `calculateTemplate`, `resolveEquipment` and `productionSupport`. No frontend, interpreter, provider, bridge or observation contract is changed. Numeric comparisons do not pass the separate strategy coverage gate or establish an optimal build.

## Consumer contract

Types: `src/design-evaluation-types.ts`. Runtime validation: exported `designRequestSchema`. Public functions: `evaluateDesign`, `compareDesigns`, `designResultIsCurrent`, `indexedDesignSource` in `server/design-evaluation/index.ts`. The synchronous library is also built as `build/design-evaluation.cjs`; this is a developer API, not a newly exposed HTTP route.

```ts
import {evaluateDesign, indexedDesignSource, compareDesigns} from './server/design-evaluation';
const source = indexedDesignSource(existingApplicationStore);
const result = evaluateDesign(source, {schemaVersion: 1, candidate, scenario});
const comparison = compareDesigns(source, candidate, alternative, scenario);
```

Run `npm run design:demo`, or `npm run design:demo -- --json` for complete, serializable requests/results and five comparisons. After building, `node build/design-evaluation-demo.cjs --json` works without TypeScript or installed game files. `tests/fixtures/design-evaluation/corpus.ts` supplies concrete examples.

Candidate v1 includes an ID/name, family, counted unit rows and explicit archetype-to-concrete-model assignments. Units, models and research use exact `definition:<uid>` references. Scenario v1 pins game/index revision, force size and a **manual counterfactual**: unmodified base, No Step Back disabled, no mods, no modifiers, zero equipment upgrades. Research is a positive manual assertion of unlock membership. It does not establish research prerequisites, dates, country restrictions, availability or current campaign state. Unknown properties, including caller-supplied prices, doctrine assumptions and designer modules, reject. No assumed DLC ownership or actual campaign facts are created.

Result v1 has `evaluated`, `rejected` or `source-invalidated` status. Failed evaluations have null totals and an actionable diagnostic. Success includes per-division and force totals, per-unit/per-equipment breakdowns, explicit assumptions, unsupported metrics, formula version, qualification ID and source evidence. `compareDesigns` uses one shared scenario and returns right-minus-left deltas only when both evaluations succeed on the same index. Width under `force` is merely the sum of nominal widths, not a legal frontage or a combat-deployment prediction. Equipment breakdown quantities are per division; the separately named force totals multiply them by the requested division count.

Call `designResultIsCurrent` before reusing a saved result. It re-evaluates the original request and compares the full deterministic result and fingerprint; tampered totals cannot be validated by keeping an old fingerprint. Applications retain responsibility for saving a result and refreshing the underlying index. This milestone introduces no automatic persistence or result promotion into AI recommendations.

## Qualification and formulas

Application-owned `server/design-evaluation/qualification.json` pins 17 definition projections from 11 installed source files at **1.19.4.2**, importer revision 5. The corpus was extracted by the existing importer into an isolated disposable index. Only numeric inputs, minimal identity metadata and direct unlock lists are committed; full licensed scripts, localization, personal configurations and raw indexes stay out of Git. The `source.ts` projection deliberately excludes unrelated stats and presentation metadata. File hashes still invalidate a definition when any part of its source changes. Projection hashes additionally reject corrupted numeric data, missing fields and altered unlock lists even if the stored source hash was retained.

Source hashes are SHA256 of UTF-8 text as read by the existing importer. Source line, game version, canonical reference, file hash and projection digest accompany every calculation dependency, including inherited equipment costs and asserted research. `qualification.json` is a reviewed allowlist, not caller-controlled certification. Only four line units and four fixed equipment models are supported. Other units/models require a separately reviewed qualification, even when the parser recognizes them.

For battalion type b, count n, required equipment archetype a, assigned concrete model m:

| Metric | Formula | Validation boundary |
|---|---|---|
| Base combat width | sum(n[b] × explicit combat_width[b]) | Line units only; no modifiers or terrain adjustment |
| Base manpower | sum(n[b] × explicit manpower[b]) | Full establishment, no casualties or manpower modifiers |
| Required equipment | Q[a] = sum(n[b] × need[b,a]) | Exact declared positive integer quantities; explicit concrete assignment |
| Base industrial cost | sum(Q[a] × build_cost_ic[m[a]]) | No stockpile, upgrades, MIO, designer or production modifiers |
| Force requirements | per-division requirements × division count | 1–10,000 divisions; no reinforcement/loss forecast |

The arithmetic reuses `calculateTemplate`; the wrapper refuses missing stats before its legacy zero defaults can apply. Counts must be integers, positive, unique by unit type, and at most 25 line battalions. Support companies are outside this first qualification. Equipment inheritance follows **archetype** defaults; research `parent` is not statistical inheritance. Every inherited dependency is uniquely resolved before invoking the legacy resolver's first-match implementation. Direct concrete cost overrides the archetype cost. No naval or aircraft design is accepted.

Primary installed declarations, independently read back by `npm run design:audit -- "<game-root>"`:

| Input | Source (definition line) | Qualified facts |
|---|---|---|
| Infantry | `common/units/infantry.txt` (7) | width 2, manpower 1,000, rifles 100 |
| Motorized | same (410) | width 2, manpower 1,200, rifles 100, trucks 35 |
| Line artillery | `common/units/artillery_brigade.txt` (3) | width 3, manpower 500, guns 24 |
| Medium armor | `common/units/medium_armor.txt` (3) | width 2, manpower 500, medium chassis 50 |
| 1936 rifles | `common/units/equipment/infantry.txt` (56) | 0.5 IC each |
| Basic artillery | `common/units/equipment/artillery.txt` (42; archetype 3) | inherited 3.5 IC each |
| Trucks | `common/units/equipment/motorized.txt` (47; archetype 3) | inherited 2.5 IC each |
| Fixed medium tank | `common/units/equipment/x_tank_chassis.txt` (661) | medium chassis archetype, concrete 12 IC each |
| Research unlocks | `common/technologies/infantry.txt` (16, 53, 1962), `artillery.txt` (6), `armor.txt` (751) | direct enable_subunits / enable_equipments lists only |

The active fixed medium-tank definition is in **x_tank_chassis.txt**, not the commented legacy tank_medium.txt. The 3.75-IC designer chassis is not a complete tank and is never substituted for the 12-IC fixed model. Designer modules are limited to No Step Back in the installed module source; this corpus explicitly uses the counterfactual fixed-model configuration. This establishes extracted base cost, not that a particular country can currently produce the model.

Example checked independently of the implementation: 9 infantry + 1 artillery = 9×2+3 = **21 width**; 9×1,000+500 = **9,500 manpower**; 900 rifles and 24 guns; 900×0.5+24×3.5 = **534 IC**. Six medium + four motorized = 300 tanks, 400 rifles and 140 trucks; 300×12+400×0.5+140×2.5 = **4,150 IC**. The hand-worked golden corpus retains seven candidates and five pair deltas.

The source audit checks version and each file hash, parses raw installed declarations independently of the retained index, then matches the numeric projections and evaluates every candidate. It reads installed files without launching the game. These checks and the inherited baseline calculator establish reproducible static arithmetic. They do not independently measure engine combat behavior or prove all omitted modifiers are irrelevant to a real campaign.

## Invalidation and explicit unknowns

A changed game/importer version, stale scenario index, changed dependency hash/path/line/values or changed unlock declaration refuses the affected result. An index-only refresh with unchanged qualified definitions allows a *new* request at the new revision; an old result remains stale. Newly indexed mods reject because the base importer does not merge mod overrides. Missing/ambiguous references are never guessed. Source freshness is bounded by the index: changes on disk are discovered by reindexing or the explicit audit, not by polling installed files during each calculation. This is scoped evaluation invalidation, not M7.4.3's broader patch-aware knowledge system.

Organization, attack, defense, breakthrough, armor, piercing, supply, fuel, terrain effects, production time and combat outcome metrics are absent from totals and each has an explicit unsupported explanation. The old calculator also returns organization/supply; those unqualified outputs are deliberately not exported here. A cheaper, narrower or lower-manpower design is not automatically more effective. No score, winner, ranking, meta-guide authority or global optimality claim is generated.

Next validation steps, all future scoped work:

1. Establish organization/support-company weighting and equipment-to-unit attack/defense aggregation against independent patch-matched evidence; test mixed equipment and technology/country modifiers before expanding metrics.
2. Qualify terrain combat frontage, reinforcement and over-width rules independently; distinguish nominal template width from battle width and measured performance.
3. Add doctrine, country, MIO, upgrades and designer modules only after establishing stacking order, caps, multiplicative rules and completeness. Audit technology and DLC prerequisites separately from positive unlock assertions.
4. Build matched scenarios for strength, training, tactics, entrenchment, opponents, air support and logistics; compare predictions with separately authorized observations. Never infer actual combat outcomes from base resource comparisons.
5. Broaden infantry support, tanks and other military equipment incrementally. Aircraft, naval and whole-strategy optimization require their own contracts, formulas, fixtures and validation gates.
