# M7.4.2b — Combat-relevant division evaluation

**Partial delivery; numerical combat-stat qualification is blocked.** The safe input/metric-status API and audit are implemented and offline-tested, but **zero prioritized division combat metrics are independently qualified**. Organization, soft attack, hard attack, defense and breakthrough totals/deltas remain null/unsupported. This report does not claim the full combat-stat work order is achieved.

[Draft PR #11](https://github.com/connorgreenleaf22/hoi4-companion/pull/11) · [rule-validation blocker #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10) · [manifest](../milestones/M7.4.2b.json) · [audit/API/dependencies](COMBAT-EVALUATION.md) · [verification receipt](M742B-VERIFICATION.json) · [acceptance bounds](MILESTONE-7.4.2b-ACCEPTANCE.md) · [Rook handoff](M742B-HQ-HANDOFF.md).

## Baseline and ownership

New isolated worktree/branch `feature/hoi4-combat-evaluation-m742b`, stacked on independently reviewed PR #8 head **1fdf0a9af79b0afcaf465ccad33ee2a048591db8**. The original owner-confirmed integration ancestor remains **bdb8a4887522b38f5110f3900bbf1655cc5fd600**. GitHub still reports PR #8 draft/unmerged; stacking preserves its completed resource implementation without merging it. This PR targets `feature/hoi4-knowledge-meta-lab`, so its incremental diff excludes the resource foundation. PR #6 remains excluded. No original worktree/branch or older build was reset or replaced.

Tested new runtime/package source: **23c49ee9752262f7c583dce43fc68d52f937da96**. Later documentation commits do not replace that identity. M7.4.1's interpreter and live observation contracts remain untouched. Existing resource source/qualification/fixtures are unchanged. Shared additions are limited to task guidance, package/build/demo scripts, the fixture-only CI allowlist and milestone documentation.

## Outcome against the five phases

| Phase | Delivered | Unresolved |
|---|---|---|
| Existing-calculator audit | Eleven requested stat families classified with code/source evidence and required dependencies | Existing organization/supply arithmetic is not independent engine validation; most other existing outputs are raw equipment stats only |
| Prioritized combat metrics | Source-input qualification, per-metric null/unsupported statuses, reasons/dependency IDs and refusal/invalidation tests | All five totals require independent patch-matched aggregation rules; no approximate combat totals exposed |
| Bounded support subset | Support artillery, engineer and cavalry recon source inputs/requirements inspected; essential equipment and category-targeted AST context retained | No support eligibility or combat contribution is qualified; category modifiers and scaling/stacking remain unresolved |
| Representative comparisons | Three reproducible comparisons with unchanged qualified resource deltas, inspectable source inputs and explicit unsupported combat columns | No numerical combat deltas or superiority in real combat established |
| Future scenario contract | Versioned type-only attacker/defender, terrain, tech/doctrine, equipment/variants, supply/fuel, strength, entrenchment/planning and modifier interface | No simulator, current campaign data binding or scenario-specific effectiveness |

The independent builder/reviewer source investigation found no accessible primary equation sufficient to qualify division organization weighting, equipment-to-battalion normalization, essential/transport effects or final attack/defense aggregation for installed 1.19.4.2. Installed documentation defines base equipment stat declarations; publisher announcements corroborate category-targeted support effects and equipment/manpower scaling, but do not establish a complete current-patch equation. Official wiki reads failed with 401 and the bounded investigation stopped. Community formulas and old calculator outputs were not promoted to authoritative evidence.

## API and reproducible comparisons

`server/combat-evaluation` is separate from the preserved resource module. It uses the current `DesignSource`/SQLite canonical resolver, hash/digest helpers, resource evaluator and comparison API. A second application-owned qualification pins 15 minimal source input projections from 11 installed files; it explicitly says `source-inputs-only` and `divisionAggregationQualified: false`. Changed combat-only fields invalidate this layer even if the resource projection still matches. Missing declarations are null/not-declared, never implicit zero combat contributions.

`evaluateCombatDesign`, `inspectCombatInputs`, `compareCombatDesigns` and `combatResultIsCurrent` expose qualified source inputs and the existing resource breakdowns, with strict requests and explicit limitations. `npm run combat:demo -- --json` and the compiled developer demo show:

| Left → right | Width delta | Manpower delta | Equipment delta | IC delta | All five combat deltas |
|---|---:|---:|---|---:|---|
| 9 infantry → 9 infantry + 1 line artillery | +3 | +500 | +24 guns | +84 | unsupported / null |
| 9 infantry → 9 infantry + 2 line artillery | +6 | +1,000 | +48 guns | +168 | unsupported / null |
| 6 medium + 4 motorized → 5 medium + 5 motorized | 0 | +700 | −50 tanks, +100 rifles, +35 trucks | −462.5 | unsupported / null |

These resource values retain the manual base-only no-NSB/no-mod/zero-upgrade assumptions from M7.4.2. Research asserts unlock membership only; combat technology effects are not applied. The defensive/offensive roles are proposed use cases rather than validated outcomes. Source-unit organization and equipment attack values are inspectable only as declarations, not multiplied or summed into battalion/division combat totals.

## Validation and independent review

- **57 focused tests pass**: 20 new combat-layer tests plus all 37 resource regressions. Covers three comparisons, seven resource goldens, null metric guarantees, malformed/unsupported inputs, source/version changes, combat-only corruption, preserved support contexts, stale/tampered results and SQLite persistence/reopen/invalidation.
- **178 portable fixture tests plus 3 workflow guards pass**. The new hosted allowlist entry is pure deterministic code/static fixtures. Installed readback, SQLite integration, Windows processes and provider/native operations remain outside hosted CI.
- TypeScript, production build, compiled JSON demo and hygiene pass. The installed source audit independently parses raw files and matches **15 declarations across 11 files**; it explicitly reports **zero qualified division combat metrics**. A transient TypeScript inference error in the new dependency collection was corrected before the passing checks.
- Separate read-only reviewer `/root/review_m742` independently audited the formulas, then reviewed runtime **23c49ee9752262f7c583dce43fc68d52f937da96** against the stack baseline. No blocking code findings. Reviewer independently ran all 57 focused tests, typecheck and source audit; checked strict caller-certification/simulator/modifier rejection, null metrics/deltas, combat-only invalidation, support context, unchanged resource files and fixture-only CI imports. This is independent agent evidence, not human GitHub approval or acceptance of unqualified mechanics.
- Windows/package and final evidence details are retained in the verification receipt. The existing packaging helper's numeric milestone label is `M7.4.2-23c49ee97522`; the full source SHA identifies the M7.4.2b runtime. Its new START-HERE explains partial scope. No packaging-label or Electron frontend rewrite was introduced.

## Remaining gate and integration handoff

Blocker #10 needs independent patch-matched equations and positive/negative vectors for organization/support weighting, equipment normalization, essential-equipment fulfillment, unit/scoped modifier ordering and division aggregation. Only after those close can a metric move from null/unsupported to a numeric qualified result. The audit/API document prioritizes organization first, then normalization, support modifiers, technology/doctrine/country/MIO/variants and other stats/conditions. There is no claim that such evidence cannot exist, only that the bounded investigation did not establish it.

Owner acceptance remains pending; the milestone stays blocked rather than complete. No combat simulator, optimal template, validated campaign-specific effectiveness, new permanent UI, paid provider call, native HOI4 operation, invasive method, personal-data change, merge or release is claimed. No additional investigation or whole-strategy optimization is started automatically.

Rook/HQ coordination is manual: the handoff names branch, full runtime SHA, tests, blocker and stack requirements. PR #8 must be integrated by a separate approved decision before retargeting this incremental PR onto the common integration branch. Keep M7.4.1 interpreter ownership and existing source/observation contracts. Review any shared AGENTS/build/package/CI/doc conflicts rather than forcing integration. HQ was read for the approved product/protocol; no synchronization claim is made.
