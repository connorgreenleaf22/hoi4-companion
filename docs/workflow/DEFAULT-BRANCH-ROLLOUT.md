# Default-branch QA rollout plan — review required

As verified 2026-11-10, main and develop both point to `ba4c3c909931f57dcdff4084446f5ad26e06db9f`; they predate the active application milestones. Main, develop and feature/hoi4-ai-m731 are unprotected; repository rulesets are empty. No administration settings, visibility, default branch or paid services were changed.

## Safe default-branch integration

Prepare a new worktree and branch from the freshly verified origin/main, not from the development candidate. Open a separate workflow-only PR to main; obtain independent review and explicit approval before merging it. Do not merge or wholesale cherry-pick PR #3 or the M7.3.1 branch: later evidence/tests/scripts assume newer application code.

Copy only reviewed `.github` Issue/PR templates and portable workflow configuration, `scripts/ci` tooling, the milestone schema, public-data ignore additions and generic workflow guidance. Patch main's package scripts and add Ajv as a dev dependency using main's lockfile; never replace package.json/package-lock.json with the newer application's versions. Do not copy runtime code, renderer, Electron code, newer fixture suites, native tooling or application milestone histories.

Main already has domain and prepared planner-domain tests; initially allowlist only those after verifying their imports. It does not have explanations, planning-coverage or ai-reliability tests, so copying the current allowlist would fail. Decouple workflow.test.mjs from M7.3.1.json using a clearly synthetic fixture and give the default rollout its own manifest/report. Preserve guards against unsupported acceptance/native claims. No application feature should be added to make CI pass.

Acceptance for that PR: clean main-only diff; main's TypeScript and selected fixtures pass; synthetic schema negative tests and a real default-rollout manifest pass; path/credential/whitespace hygiene passes; Issue forms parse; exact head independently reviewed; no runtime dependency or application behavior change. Verify all four checks on the main-targeted PR before configuring required checks. Review any old main failure as a separate issue rather than importing newer app features automatically.

## Proposed administration changes (not applied)

After approval, protect feature/hoi4-ai-m731 and main individually; protect develop if it remains an integration target. Require pull requests and the four unique check names `qa-typecheck`, `qa-test-ci`, `qa-schemas`, `qa-hygiene`. Require resolved conversations, one independent human approval when a real collaborator is available, stale-approval dismissal and approval of the latest reviewable push; prohibit force pushes/deletion and apply protections to administrators. Verify exact checks from a successful run before enabling. Do not invent CODEOWNERS or assume the PR author can approve their own PR.

If no second human reviewer is available, keep explicit owner approval plus independent agent review as the documented operating procedure until a suitable enforced policy is agreed. Do not claim it is GitHub-enforced. Codex Code Review remains an optional additional reviewer with unverified enablement; it is not a paid-service authorization or a substitute for the agreed approval gate. Leave auto-merge off. Track decisions in Issue #1.

## PR #4 after native user acceptance

Keep PR #4 draft and unmerged while its stated two-country native checks, 30–60 minute observation capture, performance measurements, desktop runtime verification and 3–5 paired gameplay questions are outstanding. These are acceptance criteria, not authorization to repeat native tests. Use the existing bounded native plan/limits and user-provided evidence; record each unperformed condition as pending.

After acceptance, inspect its then-current SHA and diff. Merge the current development baseline into its feature branch with a normal merge (no rebase/force push), resolve only actual conflicts, and preserve the QA workflow. Run the four checks plus the focused read-only campaign adapter/service fixtures and AI-planning regression if shared API wiring changes. Add only audited portable campaign fixtures to CI. Obtain a separate reviewer of that exact candidate, a manifest/report with native provenance and user acceptance evidence, and an explicit owner merge approval. Native acceptance alone does not approve code integration. Do not retarget PR #4 to main, promote fixture observations to native facts or grant gameplay controls.
