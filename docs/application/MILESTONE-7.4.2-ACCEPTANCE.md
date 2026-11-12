# M7.4.2 bounded acceptance

This is a developer evaluation foundation for the future Adaptive Strategy Workspace. The existing frontend remains in place. The evaluator is not wired into AI recommendations or observation contracts.

1. Review [API, source qualification, formulas and uncertainties](DESIGN-EVALUATION.md). From the matching source checkout, run `npm run design:demo` and `npm run design:demo -- --json`. After building, `node build/design-evaluation-demo.cjs --json` runs the bundled developer demonstration.
2. Inspect the seven candidate totals and five comparison deltas. For example, 9 infantry + 1 line artillery requires 21 nominal width, 9,500 manpower, 900 rifles, 24 guns and 534 base IC. Six medium + four motorized requires 20 nominal width, 7,800 manpower and 4,150 base IC.
3. Review the explicit counterfactual: 1.19.4.2, No Step Back disabled, no mods/modifiers, fixed models, zero upgrades and full establishment. These are manual assumptions. Research is asserted unlock membership only. No campaign availability, combat effectiveness or optimality is certified.
4. Confirm invalid counts, missing research, stale source versions, designer inputs and unsupported modifiers refuse totals. Run `node --import tsx --test tests/design-evaluation.test.ts tests/design-evaluation-index.test.ts` for reproducible positive/negative cases.
5. The isolated Windows development ZIP can be extracted to a new directory for ordinary app regression inspection. It is unsigned and not a release. Leave provider configuration unconfigured; no paid request or game launch is part of this milestone. The evaluation API is developer-facing and introduces no new player-facing screen.

Owner usefulness acceptance and human merge approval remain separate decisions. Independent agent review and green fixture CI cannot substitute for either. Do not start aircraft/naval/doctrine optimization, change existing apps/data or merge protected branches during acceptance. Return findings against the full source SHA and this milestone's draft PR.
