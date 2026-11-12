# Common candidate promotion and rollback reference

This is a preparation record, not approval to merge or release. See [integration report](COMMON-INTEGRATION-2026-11-12.md) and [manifest](../milestones/COMMON-2026.11.12.json).

## Develop, then main

1. Recheck origin/develop and origin/main and the candidate SHA. Both were `ba4c3c909931f57dcdff4084446f5ad26e06db9f` at preflight. Stop and assess any material advancement, review invalidation or conflicting task. Do not rebase or force-push historical feature branches.
2. Prepare a candidate-to-develop PR from `integration/common-2026-11-12`, preserving the reviewed base and all five merges. Keep it draft/blocked while NAV-01 and required review/check/approval gates remain open. Its description must name the exact runtime, final candidate, local artifact/hash, five pinned PRs, excluded #4, preserved ancestry, local tests and unresolved qualifications. Local check success is not hosted CI evidence. No remote publication occurred as part of this preparation.
3. Before any develop merge, require current four checks (`qa-typecheck`, `qa-test-ci`, `qa-schemas`, `qa-hygiene`), independent exact-SHA review, resolved material findings and explicit owner/maintainer approval. Verify actual protection/rules instead of assuming enforcement. This task stops before this action.
4. After a separately approved develop merge, record its actual merge SHA and ancestry. Prepare a develop-to-main PR for that reviewed snapshot; reassess only new deltas and required checks. Do not pretend the pre-merge candidate equals a future merge SHA. No main merge, tag, protected push, release or administration change is performed here.

The older workflow-only rollout document describes the earlier separate rollout proposal. This owner-requested full common-candidate preparation supersedes its workflow-only copying approach for this branch; historical evidence and branch-protection requirements still apply.

## Release gates

NAV-01 blocks promotion to a release candidate suitable for release, even if code integration checks pass. `npm run package` explicitly refuses. M7.4.2b remains partial/blocked with all five combat metrics null; do not advertise combat aggregation. Full source coverage, native/user qualification and actual repository approvals remain independent. A development ZIP is a review artifact only.

## Rollback

- Source rollback anchor: `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. Preserve `feature/hoi4-ai-m731`, all source PR heads, worktrees and original builds. A local reference `rollback/common-reviewed-base-2026-11-12` will pin this base. No reset/revert of an existing branch is needed to inspect it.
- Integration is isolated. Stop only its owned Companion/service before removing it from use. Launch a retained older build in its own original profile, or a fresh profile if comparing behavior. Never overwrite an installed app, historical executable, original saved database or game configuration.
- No store schema changed here. Closed-copy compatibility fixtures passed; this does not certify downgrading future saved formats. If data was edited after promotion, retain a closed copy/export first. Use the existing verified migration-backup/restore procedure for older schemas, with all relevant services closed; never blindly copy over a live WAL database.
- If promotion is later authorized, record actual develop/main merge SHAs and determine a normal revert with the maintainer. This task does not pre-authorize that future mutation.

## Prepared Local Goal worktrees

Prepare two clean branches at the independently reviewed common baseline: one for path/mechanics knowledge and one for combat/source-rule knowledge. Initial scope references are Issues #7 and #10 respectively. They must read this report and retain NAV-01, confidence, source-version and no-game/no-provider boundaries. Worktrees are prepared only; Goals are not created or started, and these notes do not authorize implementation.
