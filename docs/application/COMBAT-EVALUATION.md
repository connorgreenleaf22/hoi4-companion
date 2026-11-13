# M7.4.2b combat evaluation: partial source-input layer

**Zero division combat metrics are qualified.** Organization, soft attack, hard attack, defense and breakthrough remain `unsupported`, with `value: null`. This is a partial implementation of the work order: it delivers an independent formula/source audit, qualified input inspection, metric-level dependency gaps, three reproducible comparisons and a future scenario interface. It does not yet deliver validated combat-stat aggregation or campaign-specific recommendations.

## Audit of the existing calculators

Reviewed `server/domain.ts`, `server/api.ts` and `src/Lab.tsx`, the M7.4.2 evaluation module and fixtures, current installed 1.19.4.2 declarations and primary documentation. `calculateTemplate` computes width, manpower, supply and organization; `resolveEquipment` overlays concrete stats on archetype defaults; the renderer compares individual equipment values. Neither a raw equipment profile nor a passing arithmetic test validates a division combat formula.

| Statistic | Existing behavior / audit verdict | Required inputs and missing rule |
|---|---|---|
| Organization | Arithmetic mean of counted unit `max_organisation`, including supports; missing values become zero. **Incomplete / not independently qualified.** | Positive unit declarations, technology/doctrine organization changes, exact denominator and support weighting, modifier ordering. A mean is a candidate rule, not newly verified engine behavior. |
| Soft attack | Individual equipment stats only. **No division calculation implemented.** | Concrete/archetype equipment stats, equipment-to-battalion normalization, unit scalars, technology/category bonuses, support effects, essential-equipment scaling and division aggregation. |
| Hard attack | Individual equipment stats only. **No division calculation implemented.** | Same dependency families; motorized transport/essential equipment cannot be ignored without proof. |
| Defense | Individual equipment stats only. **No division calculation implemented.** | Equipment inheritance, battalion contribution equation, additive/multiplicative order, technology/doctrine/country effects, support category targets. |
| Breakthrough | Individual equipment stats only. **No division calculation implemented.** | Rifles and trucks both declare stats; their battalion normalization is unresolved. Unit/technology/support adjustments and stacking order also need proof. |
| Armor / piercing | Raw equipment values; no division equation. **Unsupported for division totals.** | Highest/average selection and exact denominator, inheritance, unit/technology effects and current rule/define qualification. |
| Hardness | Raw equipment values; no division equation. **Unsupported.** | Equipment contribution rule, line-versus-support inclusion and technology effects. |
| Speed | Raw equipment values; no division equation. **Unsupported.** | Transport, affects_speed, essential equipment, slowest-unit rule, fuel/supply and terrain conditions. |
| Supply consumption | Sum of unit declarations, missing values become zero. **Incomplete for final consumption.** | Equipment contribution, logistics/category effects, activity, supply state and country modifiers. A declared sum is not actual supply use. |
| Fuel | Raw equipment values; no division requirement equation. **Unsupported.** | Equipment quantities versus normalized contribution, activity, fuel availability and transport/essential rules. |
| Support-company modifiers | Existing resource calculator counts support needs and organization; does not apply category-targeted effects. **Incomplete for combat.** | `battalion_mult` targets/modes, essential equipment, support groups, technology/doctrine changes, fulfillment scaling and stacking. |

No permanent UI is changed. The legacy Lab still has its historical behavior and assumptions. This module does not silently rebrand those outputs as verified combat facts. M7.4.2's four qualified resource dimensions and all seven golden candidates remain unchanged.

## Independent source and rule investigation

Builder and separate reviewer independently found no accessible primary equation establishing the five prioritized division totals for installed 1.19.4.2. Installed `common/units/equipment/_documentation.md:113` establishes the meaning of base equipment stat declarations before modules/upgrades, but does not specify equipment-to-battalion normalization or division aggregation. Its SHA256 is `fe7a672abe4be6ef0191c566b81c41d01effe7a45ab8d786a914fdb89c5400c9`.

The [publisher's May 31, 2023 support-company developer article](https://store.steampowered.com/news/posts/?appids=394360&enddate=1688648528&feed=steam_community_announcements) explicitly describes category-targeted additive/multiplicative support bonuses. It supports preserving targets/modes; its historical proposed balance numbers do not establish today's complete stacking equation. The [publisher's 2026 summer-beta notes](https://store.steampowered.com/news/posts/?appids=394360&enddate=1787058179&feed=steam_community_announcements) corroborate support-artillery percentage penalties and equipment/manpower-dependent battalion-adjuster behavior. Beta notes are not a complete equation or current-patch certification. Both are corroboration, not calculation authority.

Direct official-wiki Division/Unit_modding/Land_units reads returned HTTP 401; an alternate read also failed. The historical publisher strategy guide explains stat meanings but supplies no needed averaging equation. The investigation stopped rather than repeatedly retrying unavailable sources or promoting community calculators/meta guides to primary evidence. No game execution or invasive interface was used.

New `server/combat-evaluation/qualification.json` pins **15 minimal unit/equipment projections from 11 files**. They were projected from the retained isolated installed-source index, then independently parsed back from installed files. Existing indexed source identity and canonical resolver are reused. Each input retains source path, line, hash, game version and projection digest; absent declarations stay explicitly absent. No zero default or arithmetic combat contribution is inferred. `tests/fixtures/combat-evaluation/inputs.json` retains only numeric facts and small dependency blocks, not full scripts/localization or personal data.

Important source checks:

- `common/units/infantry.txt:37` declares infantry organization 60; motorized organization is at 437. Its transport/requirements at 448–453 name 100 rifles plus 35 trucks. These declarations do not specify their statistical weighting.
- `common/units/artillery.txt:30–47` declares support artillery width 0, organization 0, 12 guns, 300 manpower and four combat scalars of −0.5. A scalar is not an already computed division contribution.
- `common/units/engineer.txt:42–62` includes a category-targeted entrenchment block with `add=yes`, combat scalars and essential support equipment. `common/units/recon.txt:51–64` includes essential equipment and an artillery soft-attack modifier targeting other battalions. Both demonstrate why isolated equipment-stat summation is insufficient.
- The fixed medium equipment remains the 12-IC model in `x_tank_chassis.txt`; no designer chassis is substituted. This slice does not qualify its attack/defense contributions by assuming a summation formula.

## API and demo

The existing `server/design-evaluation` API, result shape, qualification pins and benchmarks are preserved. A separate module `server/combat-evaluation/index.ts` exports:

- `evaluateCombatDesign(source, {schemaVersion: 1, design: resourceRequest})`: `partial`, `rejected` or `source-invalidated`. A successful partial result contains the existing resource result, qualified source declarations, five null combat metrics with reasons/dependency IDs, a fingerprint and explicit limitations. `qualifiedCombatMetricCount` is literally zero.
- `inspectCombatInputs(source, {schemaVersion: 1, expectedIndexRevision, references})`: canonical unit/equipment declarations, including the three audited supports. `inputs-qualified` means declarations only; `divisionAggregationQualified` is false. It does not grant support candidates evaluation eligibility.
- `compareCombatDesigns(source, leftCandidate, rightCandidate, scenario)`: the existing qualified resource delta alongside five null combat deltas and explicit inference limits. Failed/stale inputs cannot yield a comparison.
- `combatResultIsCurrent(source, result)`: recomputes the partial result and compares its full deterministic content. Saved or caller-forged numeric metrics cannot be promoted by retaining a fingerprint.

TypeScript contracts are in `src/combat-evaluation-types.ts`; runtime requests are strict. Caller-supplied formula certification, doctrine/country/terrain modifiers, mixed-equipment shares, designers and simulator execution reject. The research list retains the resource API's manual unlock-membership semantics; combat technology effects are not applied. A change to a combat-only field invalidates this layer even when the old resource projection still matches.

Run `npm run combat:demo` or `npm run combat:demo -- --json`; after building, use `node build/combat-evaluation-demo.cjs --json`. The built API is `build/combat-evaluation.cjs`. The JSON has calculation ingredients and all existing resource breakdowns for understandable future AI explanations, but contains no unverified numerical division combat total.

| Comparison | Qualified resource difference (right − left) | Combat interpretation |
|---|---|---|
| 9 infantry → 9 infantry + 1 line artillery | +3 nominal width, +500 manpower, +24 guns, +84 IC | Attack, defense and organization deltas unsupported; does not establish a better defensive division. |
| 9 infantry → 9 infantry + 2 line artillery | +6 nominal width, +1,000 manpower, +48 guns, +168 IC | Proposed offensive role is a manual label; offensive effectiveness unsupported. |
| 6 medium + 4 motorized → 5 medium + 5 motorized | Equal width; +700 manpower, −50 tanks, +100 rifles, +35 trucks, −462.5 IC | Organization, attack and breakthrough deltas unsupported; equal width/cost differences do not establish a winner. |

All five combat metric columns remain visible as **unsupported**, never numeric approximations. Source-unit organization and equipment attack declarations remain inspectable in a separate input namespace with an explicit warning that they are not battalion/division contributions.

## Future scenario interface and prioritized dependencies

`FutureCombatScenarioV1` is a type-only dependency plan with `execution: 'not-implemented'`. It identifies attacker/defender designs, terrain/river/fort/weather, technology, doctrine, equipment models/variants, strength, supply, fuel, entrenchment, planning and scoped modifiers. Values are manual assumptions or unavailable; this introduces no new observation contract or actual-state certification. No evaluator accepts this interface as a simulation request.

Priority before implementing numerical combat totals:

1. **Organization**: obtain an independent patch-matched equation for unit averaging, denominator and support inclusion; then apply explicit unit organization changes and test mixed line/support cases.
2. **Equipment normalization**: establish rifles, guns, tanks and mixed rifle/truck contributions at full and reduced establishment; preserve essential/transport roles and exact inheritance. Validate unit scalars before summing anything.
3. **Support category effects**: establish target selection, additive/multiplicative order and equipment/manpower scaling for support artillery, engineer and recon. Only then extend support candidate eligibility and resource qualification together.
4. **Technology/doctrine/country/MIO/variants**: pin relevant definitions, prerequisites, modifier operations and stacking/caps. No automatic application from a research ID or model prose.
5. **Armor/piercing/hardness/speed/supply/fuel and actual battle conditions**: qualify their separate aggregation rules, then terrain, strength, training, tactics, air support, entrenchment and planning. Any native validation requires its own authorization. Aircraft, naval and whole-strategy optimization remain outside this milestone.

The milestone report records the rule-validation blocker and partial acceptance state. Tests, input hashes and independent code review do not close that blocker or certify combat effectiveness.
