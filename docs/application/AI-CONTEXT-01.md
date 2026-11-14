# AI-CONTEXT-01 — usable bounded strategy source previews

Tracking: [Issue #17](https://github.com/connorgreenleaf22/hoi4-companion/issues/17). Manifest: [AI-CONTEXT-01.json](../milestones/AI-CONTEXT-01.json). Starting main: `40ecca641022c626a7b7fea0499659252a9cc1cf`, including completed STRATEGY-DRAFT-01 through PR #16.

## Goal and acceptance scope

The UX audit's exact objective was: “Give me a Germany 1936 campaign strategy with infantry and medium tanks, research and production. Prioritize fun, then winning, then efficiency. Current campaign state is unknown.” Its source preview failed at the 180,000-character limit before generation. The engineering goal is to make that broad request preview a useful, disclosed subset while preserving complete included source records and all mandatory citations/dependencies. An oversized mandatory subset must refuse with a specific recovery path and retain editable work.

The retained 1.19.5 source-only corpus reproduced the old refusal: 118 selected records, 259,295 source-context characters and 279,326 UTF-8 bytes in the provider request. This diagnostic used a disposable synthetic Germany profile and copied source entries/metadata only. It did not open a personal campaign, launch the game, send a provider request or qualify current patch/DLC/engine behavior.

## Implementation contract

- Keep the source envelope at or below 180,000 serialized characters, and the exact complete provider request body at or below 180,000 UTF-8 bytes. These are separate units and include the final transmitted disclosure/warnings. Preview-only accounting metadata is outside the source-envelope measurement and is not sent to the provider.
- Admit complete dependency groups; never clip an included `AiSource`'s requirements, costs/timing, interpretation gaps, identity or provenance to make it fit. The existing bounded explanation serializer remains bounded interpretation, not full semantic coverage.
- The selected tree plus explicit references and previous-proposal citations, with required focus prerequisites/exclusions, are mandatory. Use resolved selected-tree focus objects, including corrected repeated exclusions. An oversized mandatory set is rejected before dispatch; the user can reduce explicit references, shorten manual context or save a smaller/new local revision.
- Select optional research/focus/decision groups in a deterministic rotation, then continue within the budget. This prevents focus groups consuming all space before research. Selection is retrieval policy, not strategic ranking or an optimality claim. No-fitting-focus/research cases remain disclosed.
- Focus closure is cycle-safe and bounded; both AND-of-OR prerequisites and exclusion directions remain represented. Automatic event expansion is capped at 24 definitions per dependency group, with explicit omissions; the selected union may exceed 24 events but remains subject to payload/work bounds. It is not complete event closure.
- Expose optional `contextBudget` metadata and omission reasons in local preview. Bind the final selection/accounting to its fingerprint and recompute the spending quote from actual provider-wire bytes. Existing request/session limits, approval, validation, provisional coverage and no-retry rules remain in effect.
- Preserve preview inputs and registered strategy drafts on error. Clear obsolete preview errors when request inputs change, and ignore a late failed preview for an older request key. The new metadata is optional for older retained attempts.

The source-size budget is independent of the spending ceiling. A preview that fits can still require a smaller request or an explicit spending-settings change. This goal neither approves a provider charge nor certifies generated strategy quality.

## Verification checkpoint

Implementation and checks are in progress. Final runtime SHA, test counts, retained-source results, independent review, package identity and delivery receipt will replace this checkpoint after verification. No final qualification, user-usefulness acceptance or main-delivery claim is implied here.

## Diagnoses and remaining boundaries

The first changed-source installed-corpus check returned a size-compliant preview but contained no technologies. That failed the declared research-preview criterion; admission now rotates across source families and has a starvation regression. Failed evidence remains local. Final checks must include both focus and research records, full-record marker preservation, exact UTF-8 accounting, explicit/prior-reference overflow, stale quote/error behavior and saved-strategy restart.

Existing QUAL-195, final explanation coverage, numerical combat formulas, broader Campaign-first production work and owner usefulness acceptance remain open. Previewing a source subset cannot raise strategy confidence, ranking or optimization eligibility. No provider credentials, raw saves, observations, private notes or account paths are added to outgoing context.

The package walkthrough is [MILESTONE-7.4.2c-ACCEPTANCE.md](MILESTONE-7.4.2c-ACCEPTANCE.md); this build label identifies the bounded preview change only. Project HQ synchronization remains pending; generate a handoff after the completed manifest is available.
