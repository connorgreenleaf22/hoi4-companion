# Development and QA workflow

GitHub owns code, tests, schemas and technical evidence. [Project HQ](https://chatgpt.com/space/page_6af25f0e983c81918c96a2fa075d2901) owns product decisions and acceptance summaries. Neither replaces the other. Preserve QA-LEDGER and existing release/native gates.

## Builder and independent reviewer

1. Read AGENTS, bridge STATUS, the applicable roadmap, report and manifest. Check branch, dirty files, open Issues and existing evidence before repeating QA. Make an isolated worktree from the named candidate. Never fold unrelated work into the PR.
2. Builder implements the smallest change, records tested SHA/commands/results, and opens a PR with the template. Use defect, mechanic coverage, native blocker or acceptance Issue forms for actionable findings. Link Issues in both report and manifest.
3. A separate reviewer agent/session or human reads the actual diff, applicable guidance and evidence independently. The builder cannot certify its own review. Record reviewer identity, reviewed full SHA, findings and dispositions in the PR. Reviewers do not edit their reviewed candidate. After fixes, review the changed diff and rerun only affected checks; prior evidence remains reusable only for identical source, fixtures and environment.
4. Require qa-typecheck, qa-test-ci, qa-schemas and qa-hygiene plus one independent human GitHub approval before merge. Resolve review conversations; dismiss stale approvals after code changes; require approval of the latest reviewable push. A local reviewer agent is useful evidence, not a GitHub approval or user acceptance. User/maintainer approval is still required; no automatic merge.
5. Record the merge SHA separately after an approved merge. Do not rewrite tested runtime SHAs to a documentation-only commit. Produce the HQ handoff and preserve remaining qualification/acceptance gates.

## Current integration and enforcement

This workflow PR targets `feature/hoi4-ai-m731` from `49ccb29`, rather than mixing all unmerged application milestones into a PR to the old `main` baseline. Integrate into main only in a separate approved change. Issue forms appear in GitHub's new-issue chooser only after reaching the default branch.

On 2026-11-10 the repository was verified public and GitHub reported main unprotected. These files do not enable branch protection. After the first successful CI run, the maintainer should configure the four exact check names above and review rules for the integration branch and eventual main, including administrator enforcement. Leave visibility unchanged. Track rollout in [Issue #1](https://github.com/connorgreenleaf22/hoi4-companion/issues/1). No guessed CODEOWNERS identity is added; choose a real independent collaborator before requiring code-owner review.

[Codex Code Review](https://learn.chatgpt.com/docs/third-party/github) is an optional additional reviewer: enable it for this repository in Codex settings and request `@codex review` on the PR, or configure automatic reviews. Enablement and account entitlement have not been verified here. [Repository review rules](https://developers.openai.com/blog/custom-code-review-rules-for-codex) belong in AGENTS.md. Bot findings do not substitute for tests or a human merge approval. GitHub already supplies review threads, approvals, check enforcement, Issues, milestones and Projects; use those first. [Protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Focused hosted CI

Node 24.21.0 on Ubuntu; locked npm install with lifecycle scripts disabled. Four stable check names; read-only repository token, no secrets, no privileged pull_request_target, no packaging/artifact upload. A ten-minute job limit bounds failures. Action revisions are pinned.

`npm run test-ci` runs only `scripts/ci/test-files.json` and workflow guard tests. The initial list covers parser/domain, prepared planner vectors, mechanics explanations, planning risk gates and injected AI reliability fixtures. Review additions and their transitive imports for filesystem, network and process effects. Do not replace it with `npm test` or a wildcard: the wider suite includes Windows process/supervisor tests. This allowlist is a review boundary, not a sandbox against malicious code.

No hosted HOI4 launch, installed-game indexing, native process termination, desktop interaction, personal profile access or real-provider call. Native and packaged Windows qualification remain separate, bounded, explicitly authorized local work. Hosted green means portable checks passed, never native-qualified or user-accepted. Existing Zod runtime contracts remain covered by TypeScript/fixtures; JSON milestone contracts use draft-07 with strict Ajv validation.

## Milestone evidence and migration

Use `schemas/milestone.schema.json` and [report template](MILESTONE-REPORT-TEMPLATE.md). One manifest per milestone in `docs/milestones/`; full SHA identifies the tested implementation, not the document containing its own hash. Evidence entries contain kind, result, public reference and precise scope; local-only artifact references must say so. Artifact hashes identify files without uploading private packages. Null artifact means none produced.

Implementation status, native qualification and acceptance are separate. Complete requires no blockers, passing evidence, accepted/not-applicable acceptance and qualified/not-applicable native scope. Do not mark complete to hide partial qualification. Blockers link real Issues. A workflow-only milestone can use native not-applicable; an app milestone with untested native scope remains not-run/partial as appropriate.

M7.3.1 is migrated from existing evidence without rerunning or upgrading it. Older reports remain historical; migrate them when touched, never invent missing evidence or acceptance. New reports must link their manifest and an Issue/PR; schema CI enforces those links for every manifested report. For each completion run `npm run hq:handoff -- docs/milestones/<ID>.json` and include its short output in the handoff/PR.

## Public repository boundary

Keep credentials, personal saves, raw telemetry/account metadata, private planning notes and licensed game assets out of source, Issues, PR bodies and Actions output. Use ignored `.bridge-local/`, `artifacts/` or `private/` locally. Hygiene checks tracked filenames and high-confidence credential patterns without printing matches. It is a heuristic, not a complete secret/history scanner; manually review the staged diff and attachments before pushing. Never publish a raw QA folder. Existing intentionally synthetic fixtures are allowed. If a real credential is discovered, stop publication, revoke it and arrange targeted history remediation; do not echo it.

## When a future Site would be justified

No custom website now. Reconsider only after a documented repeated limitation: cross-repository manifest aggregation cannot be expressed with Projects; non-GitHub acceptance contributors cannot use the agreed forms; or artifact access needs permissions GitHub/HQ cannot provide. Record actual frequency, users affected, security requirements and simpler alternatives in an Issue before proposing a Site. A second status database or prettier dashboard alone does not justify it.
