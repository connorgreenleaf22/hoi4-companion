# Project HQ handoff — approved GitHub QA integration

PR #3 was approved by the owner and merged into feature/hoi4-ai-m731 on 2026-11-10. Exact merge: `440d62536e500ca5587fe1061b0b33076c2293d7`; approved head `25c90ffe4972f89d30007499240355a8758f7ba6` was unchanged. Four PR checks passed; independent review had no unresolved findings.

Post-merge local checks passed: TypeScript, 123 portable tests, two workflow guards, schemas/hygiene and ten additional offline AI-planning tests. Application source is unchanged. A hosted new-branch run exposed a whitespace-base bug; the narrow rollout correction and its final checks/review are recorded in the integration follow-up PR. No game launch, paid call, app package or new native qualification.

Operating procedure: isolated branch, bounded PR, CI, independent reviewer, versioned manifest, report separating implementation/testing/user acceptance, short HQ handoff, explicit approval before substantial merges. Preserve autonomy/native limits and public-data exclusions.

Default main/develop remain old. A workflow-only main-based port is planned, not merged; protection/rulesets and Codex Code Review enablement are not claimed active. PR #4 remains draft pending native user acceptance, integration regression checks, independent review and separate approval. M7.3.1 provider/user acceptance remains open.

Evidence: [PR #3](https://github.com/connorgreenleaf22/hoi4-companion/pull/3), [integration receipt](INTEGRATION-2026-11-10.md), [manifest](../milestones/WORKFLOW-1.json), [default rollout plan](DEFAULT-BRANCH-ROLLOUT.md), [Issue #1](https://github.com/connorgreenleaf22/hoi4-companion/issues/1). Read current HQ before applying; preserve product decisions. HQ Page update pending; no automatic synchronization.
