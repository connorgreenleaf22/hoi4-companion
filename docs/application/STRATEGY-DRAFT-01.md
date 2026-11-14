# STRATEGY-DRAFT-01 — whole-strategy draft protection

Tracking: [Issue #15](https://github.com/connorgreenleaf22/hoi4-companion/issues/15). Completion manifest: [STRATEGY-DRAFT-01.json](../milestones/STRATEGY-DRAFT-01.json). Management assessment: [project goals and gameplan](../workflow/PROJECT-GOALS-2026-11-14.md).

## Problem and required result

The UXD-01 audit reproduced loss of an unsaved AI/manual strategy when navigating to another tool: the proposal disappeared, objective cleared and close accounting showed zero drafts. NAV-01's Division Lab fix did not cover this editor. Base main `89ddada9a56afb15bbdc03f96620312fbaf9f462` includes the common application and NAV-01 through PRs #13/#14.

The bounded engineering goal is to retain whole-strategy work across tool navigation and campaign switches, protect destructive replacement/discard and uncertain pending writes, preserve edits after failed or delayed saves, and reopen explicitly saved work after full app restart. Provider keys, transmission consent and spending approval must stay outside the draft cache. This goal requires no provider request or game launch.

## Implementation and scope

A campaign-keyed external in-window store retains objective, manual context, revision instructions, additional source references, proposal content and its existing provenance. App's existing global review/download/discard and browser/native close accounting include strategy drafts and pending operations. Save acknowledgements update the saved revision while preserving newer edits. Reopening an old saved strategy remains compatible; additionalReferences is an optional JSON field and needs no database migration.

Unsaved drafts remain in this window only. Explicit save persists strategy content and request fields through the existing local validation/persistence API. Download exports the retained work with its source-context basis. Forced termination or explicit Leave/discard can lose unsaved edits. Current-patch source changes require review; retaining a draft does not certify mechanics or its applicability.

## Verification checkpoint

Implementation is being verified. The final evidence checkpoint will record exact reviewed runtime SHA, focused/browser/package results, artifact hash, independent review and delivery status here and in the manifest. No completed test, user acceptance, release qualification or main-delivery claim is implied by this pre-verification source document.

The acceptance walkthrough is [MILESTONE-7.4.2s-ACCEPTANCE.md](MILESTONE-7.4.2s-ACCEPTANCE.md). M7.4.2s is a packaging label for this defect only. QUAL-195, the final explanation-coverage contract, numerical combat qualification, native gameplay, strategic usefulness and broader owner acceptance remain outside this fix. The unchanged release guard continues to refuse final release packaging.
