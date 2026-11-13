# Common candidate promotion and rollback reference

Current evidence: [continuation report](COMMON-NAV01-CONTINUATION.md), [manifest](../milestones/COMMON-2026.11.12.json), [NAV-01 receipt](../application/NAV01-VERIFICATION.json). This prepares promotion; it is not merge or release approval.

Published preparation: [draft PR #13](https://github.com/connorgreenleaf22/hoi4-companion/pull/13), unmerged, with four required checks passed on reviewed `668ad4e3` in [run 43345100254](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43345100254). Final receipt-head review/checks are recorded in the native handoff/PR. Main remains future preparation only.

## Develop, then main

1. Recheck integration/develop/main heads, actual repository rules, exact independent review and checks. Develop/main remained ba4c3c909931f57dcdff4084446f5ad26e06db9f at continuation preflight. Stop on material advancement or conflicting work; do not rebase/force-push historical branches.
2. The user authorized a sanitized normal push of integration/common-2026-11-12 and a draft candidate-to-develop PR if current permissions allow. Repository metadata reported push permission. Keep that PR draft and auto-merge off. It includes the original five pinned PRs plus the separately reviewed NAV-01 fix and unbundled harness correction. PR #4/live-Q&A remain excluded; historical ancestry remains intact. Public receipt/handoff records the observed PR/check links after publication; local check success is not hosted evidence.
3. Before a separately authorized develop merge, require current qa-typecheck, qa-test-ci, qa-schemas, qa-hygiene, resolved material findings, exact-SHA independent review and explicit owner/maintainer approval. Agent review is not a human GitHub approval. This task stops before any develop merge.
4. Only after that separately approved merge, record its actual develop merge SHA and prepare a develop-to-main PR for the reviewed snapshot. Reassess new deltas/checks; do not treat a candidate SHA as a future merge SHA. No main merge, tag, release or rules/settings change occurs here.

[Prepared descriptions](COMMON-PROMOTION-PR-DRAFTS.md) distinguish the draft integration PR from the future main promotion. No other feature branch or protected target is pushed. A full common-candidate PR is the current owner-requested preparation; the older workflow-only rollout proposal remains historical.

## Remaining release gates

NAV-01 is fixed within template scope, with 9 real-browser and 11 corrected packaged lifecycle checks and independent review. Its gate is replaced by QUAL-195: current 1.19.5 and all-DLC applicability remain outside retained 1.19.4.2 qualification. Unchanged source hashes are not semantic qualification. M7.4.2b remains blocked with all five numerical metrics/deltas null. Complete explanation coverage, deeper applicability, owner desktop/usefulness acceptance/invoice reconciliation and actual merge approval remain independent. The development ZIP is a review artifact only; release packaging still refuses.

## Rollback

- Continuation rollback anchor: 6984f88463d4ec9add39b174889b0152ab9c0a30, pinned by rollback/nav01-reviewed-base-2026-11-12. Earlier rollback/common-reviewed-base-2026-11-12 remains bdb8a4887522b38f5110f3900bbf1655cc5fd600. No existing branch is reset or rewritten.
- Retain both M7.4.2i-e27e28f8ff5d and new M7.4.2n-e0218610779c artifacts plus all older builds. Stop only owned Companion/service processes. Compare older builds in separate profiles; never overwrite an installed app, live WAL database, personal save or game configuration.
- Schema3 and saved-template format are unchanged. Save persists template name/rows, not army size. In-memory drafts are lost after forced termination or explicit Leave/discard; download before rollback. Retain a closed copy/export of newer data before using any historical build. Restore older schemas only through verified backup tooling with all relevant services closed.
- A future approved promotion must record actual develop/main merge SHAs and any maintainer-approved normal revert. No future mutation is pre-authorized by this reference.

## Prepared knowledge worktrees

Both prepared knowledge branches remain clean, unstarted and unchanged at 6984f884; exact paths and the native task reference stay in the local-only native handoff. They were not silently advanced while preserving existing worktrees. Any future start must explicitly choose the reviewed continuation baseline. No Goal, research expansion or implementation was dispatched.
