# M7.4.2b partial-delivery review

This candidate provides a combat-input audit and versioned refusal/dependency contract. **It does not provide qualified division combat totals.** All organization, soft/hard attack, defense and breakthrough totals/deltas are null/unsupported. [Rule-validation blocker #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10) must remain open until independent patch-matched equations are established.

1. Review [the formula/source audit and API](COMBAT-EVALUATION.md), then run `npm run combat:demo` and `npm run combat:demo -- --json` from the matching checkout. The built demonstration is `node build/combat-evaluation-demo.cjs --json`.
2. Inspect all three comparisons. Resource differences are the existing M7.4.2 base-only results; source declarations sit in a separate input namespace. No raw equipment value or organization declaration is presented as a division contribution.
3. Check source/version changes, unsupported modifiers, false caller certification and stale saved results using the focused combat tests. Support artillery/engineer/recon input inspection does not make support candidates eligible for combat calculations.
4. Review the type-only future attacker/defender scenario contract and prioritized missing rules. No simulator accepts it. Determine whether this partial audit/contract is useful groundwork; do not mark numerical combat evaluation accepted.
5. The isolated unsigned Windows package can be extracted into a new directory for ordinary startup/service/offline persistence regression checks. It has no new player-facing screen. Keep provider configuration unconfigured; no game launch, paid request, invasive interface, personal-data changes or merge is part of this review.

The existing numeric-only packaging helper labels this build `M7.4.2-<source SHA>`; the source SHA identifies this M7.4.2b candidate uniquely. Older packages and PR #8 remain intact. Owner acceptance and any integration/merge remain separate decisions.
