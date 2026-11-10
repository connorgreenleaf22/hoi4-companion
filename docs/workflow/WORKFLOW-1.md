# WORKFLOW-1 — development QA and Project HQ handoff

Manifest: [WORKFLOW-1.json](../milestones/WORKFLOW-1.json). Review: [PR #3](https://github.com/connorgreenleaf22/hoi4-companion/pull/3). Rollout: [Issue #1](https://github.com/connorgreenleaf22/hoi4-companion/issues/1).

Status: implemented, locally and hosted offline-tested, independently reviewed; maintainer approval pending. Workflow-only branch `workflow/project-hq-qa` targets `feature/hoi4-ai-m731` at `49ccb29`; main remains an older baseline. No runtime features changed, no application package produced, no native/provider work performed. Public visibility preserved.

## Evidence and scope

- `npm run typecheck`: passed.
- `npm run test-ci`: 123 existing portable fixture tests passed. Initial workflow guard run failed because strict Ajv required explicit types in conditional constraints; corrected. Both workflow guard tests then passed, including malformed manifests, unearned completion, empty qualification evidence and private/credential path detection.
- `npm run schemas`: passed. M7.3.1 migrates existing evidence and retains all acceptance/native limits; no historical QA rerun.
- `npm run hygiene`: passed on tracked files. Manual diff audit found workflow/docs/test configuration only. High-confidence scanning is not proof that arbitrary private prose or all credential formats are absent.
- Tested workflow implementation: `e1a69c12d4ca5af20d37d6500cab6a586a30dfe6`; later evidence/handoff documentation does not alter app runtime. All four hosted PR checks passed: [Actions run 42893667916](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/42893667916).

## Independent review

Builder: primary Codex session. Reviewer: separate `independent_review` agent, read-only. First review of `cc30701` found P2 empty acceptance/native evidence and P3 whitespace check inert in clean hosted checkout. Both corrected with focused tests / event-base comparison in `e1a69c1`. The reviewer re-reviewed full commit `e1a69c12d4ca5af20d37d6500cab6a586a30dfe6` and reported no remaining actionable findings; schema, guard tests and committed-diff hygiene passed. Agent review is not human GitHub approval or user acceptance.

## Limits and handoff

GitHub connector reads worked; issue/PR writes returned integration 403. Existing local Git authentication successfully published Issues #1/#2 and PR #3 without exposing credentials. HQ read succeeded and reported write access on 2026-11-10, but no Page edits were performed. Codex Code Review enablement was not verified. Main was observed unprotected; settings are not changed by workflow files.

Use [HQ procedure](PROJECT-HQ.md) and `npm run hq:handoff -- docs/milestones/WORKFLOW-1.json`. A generated handoff is in [WORKFLOW-1-HANDOFF.md](WORKFLOW-1-HANDOFF.md). Preserve user decisions and pending acceptance. After human approval, integrate the workflow candidate and separately roll it into the default branch / configure required checks; no merge is authorized by this report. No Site is built; concrete future triggers are listed in the workflow guide.
