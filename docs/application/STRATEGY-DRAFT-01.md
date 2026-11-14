# STRATEGY-DRAFT-01 — whole-strategy draft protection

Tracking: [Issue #15](https://github.com/connorgreenleaf22/hoi4-companion/issues/15). Completion manifest: [STRATEGY-DRAFT-01.json](../milestones/STRATEGY-DRAFT-01.json). Management assessment: [project goals and gameplan](../workflow/PROJECT-GOALS-2026-11-14.md).

## Problem and required result

The UXD-01 audit reproduced loss of an unsaved AI/manual strategy when navigating to another tool: the proposal disappeared, objective cleared and close accounting showed zero drafts. NAV-01's Division Lab fix did not cover this editor. Base main `89ddada9a56afb15bbdc03f96620312fbaf9f462` includes the common application and NAV-01 through PRs #13/#14.

The bounded engineering goal is to retain whole-strategy work across tool navigation and campaign switches, protect destructive replacement/discard and uncertain pending writes, preserve edits after failed or delayed saves, and reopen explicitly saved work after full app restart. Provider keys, transmission consent and spending approval must stay outside the draft cache. This goal requires no provider request or game launch.

## Implementation and scope

A campaign-keyed external in-window store retains objective, manual context, revision instructions, additional source references, proposal content and its existing provenance. App's existing global review/download/discard and browser/native close accounting include strategy drafts and pending operations. Save acknowledgements update the saved revision while preserving newer edits. Reopening an old saved strategy remains compatible; additionalReferences is an optional JSON field and needs no database migration.

Unsaved drafts remain in this window only. Explicit save persists strategy content and request fields through the existing local validation/persistence API. Download exports the retained work with its source-context basis. Forced termination or explicit Leave/discard can lose unsaved edits. Current-patch source changes require review; retaining a draft does not certify mechanics or its applicability.

## Completion and verification

**The bounded engineering goal is complete.** Reviewed and packaged runtime: `f6ef73f2ea2d47da20840facc6cf0535a86853ff`, from main `89ddada9a56afb15bbdc03f96620312fbaf9f462`. Builder `/root/completion_audit` and independent reviewer `/root/independent_review` were separate agents. The reviewer approved source at `979e6e7b82222ff78185ee23a08b1230b08b78e2`, then the sole display-compatibility delta at `f6ef73f2ea2d47da20840facc6cf0535a86853ff`, with no remaining blockers. The reviewer independently reran 18 focused tests, inspected final run records/package receipt and viewed final browser/restart screenshots. Subsequent evidence-only commits do not change this packaged runtime. Final publication review and hosted checks are recorded in the delivery PR; engineering completion does not assert owner usefulness acceptance.

| Check | Actual result and scope |
| --- | --- |
| `node --import tsx --test tests/strategy-drafts.test.ts tests/ai-planning.test.ts tests/draft-close.test.ts tests/lab-drafts.test.ts tests/integration-compatibility.test.ts` | 32 pass, zero fail/skipped; pure draft/close behavior, fixture AI HTTP/persistence and compatibility. Independent overlapping strategy/API rerun: 18 pass. |
| `npm run test-ci` | 200 portable fixtures plus 3 workflow guards pass. Only pure in-memory strategy-draft/close tests were added to the hosted allowlist; no filesystem/process/provider/native expansion. |
| `npm run build` | TypeScript, Vite and Node bundles pass at final runtime. Explicit strict TypeScript check of the new browser/package harness imports also passed. |
| Browser `scripts/strategy-drafts-ui.ts` with installed Edge override | 10 pass: objective-only and full-draft retention, per-campaign isolation, real reload Stay/Leave, download/provenance, explicit replacement/discard, save/reopen, failed/delayed saves and mocked no-output provider failure. Cancel dispatches no mocked request. |
| Inherited `scripts/lab-drafts-ui.ts` / `scripts/draft-close-ui.ts` | 9 Lab cases pass at `979e6e7`; final 7 planner-close cases pass at `f6ef73f`. Only the banner text changed between these runtimes; no Lab behavior changed. Tests are overlapping scopes, not additive distinct-case totals. |
| `node scripts/package-development.mjs M7.4.2s`; `node scripts/package-acceptance.mjs <build root>` | New unsigned isolated build; 75 freshly extracted files byte-identical. Older artifacts retained. |
| `node --import tsx scripts/strategy-drafts-package.ts <freshly extracted exe>` | 11 pass: actual app/service, shared strategy journey, pending native close refusal, actual close handler Stay/Review/Discard, service shutdown/refusal and full process restart with saved content/objective/instructions/references. No renderer errors. |
| Schemas, hygiene, `git diff --check origin/main HEAD` | Passed; final manifested report is validated again before publication. Hygiene is a heuristic plus manual staged-diff review, not a comprehensive credential-history attestation. |
| `node --import tsx scripts/release-gate.ts` | Expected refusal on QUAL-195 remains; no release guard or qualification pin weakened. |

Browser and package records report frozen source throughout each run and unchanged original synthetic fixture databases. Tests use copied disposable fixture data, never a personal profile/save. No real provider call, game launch or gameplay command occurred. Native confirmation/close responses were injected through the real Electron handlers; browser beforeunload choices were real browser prompts. This does not claim human OS-dialog, screen-reader, high-DPI or physical-offline acceptance.

Artifact: local-only `Documents/HOI4 Companion Development Builds/M7.4.2s-f6ef73f2ea2d/M7.4.2s-f6ef73f2ea2d-windows-x64.zip`. SHA256: `89a2fe0508dac4d84c5b0608e8c081c96e5731b0b4e28549fc278cfe0341727c`. The executable is in that directory's `acceptance-extracted/win-unpacked/`; no installed app was replaced. A sanitized machine-readable receipt is [STRATEGY-DRAFT-01-VERIFICATION.json](STRATEGY-DRAFT-01-VERIFICATION.json).

## Diagnoses retained

The first new browser attempt stopped in fixture setup because it called nonexistent `store.profiles`; the harness now uses existing `store.profile(id)` and records/cleans failed setup. No application case ran in that attempt. The inherited planner-close journey then caught a status-label compatibility change. The final App delta restores prior planner/template-only wording and uses correct singular/plural counts when strategy drafts exist. The corrected journey passed; the runtime was rebuilt and final strategy/browser/package checks used the new source.

Independent review also caught two draft-loss edges before final verification: source references/instructions missing on save/reopen and a failed provider response with no content clearing an existing local proposal. Both were corrected and have fixture regressions. No unchanged broad failure loop, paid request or gameplay retry was used. Earlier failed evidence is retained locally, not represented as passing cases.

## Handoff and remaining product gates

The manifest uses acceptance `not-applicable` for this objectively verified engineering defect scope; it does not assign or waive the owner's broader desktop/strategy usefulness decision. Native gameplay qualification is `not-applicable` because this change makes no gameplay/observation qualification claim. No remaining blocker exists for the declared draft-safety scope. Crash-durable autosave remains outside the explicit in-window policy.

Generate `npm run hq:handoff -- docs/milestones/STRATEGY-DRAFT-01.json`. The generated handoff is an engineering summary; Project HQ synchronization remains pending, with no Page edit claimed. Main delivery is tracked in the final GitHub PR and verified remotely after merge.

The acceptance walkthrough is [MILESTONE-7.4.2s-ACCEPTANCE.md](MILESTONE-7.4.2s-ACCEPTANCE.md). M7.4.2s is a packaging label for this defect only. QUAL-195, the final explanation-coverage contract, numerical combat qualification, native gameplay, strategic usefulness and broader owner acceptance remain outside this fix. The unchanged release guard continues to refuse final release packaging.
