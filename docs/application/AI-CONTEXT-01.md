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

## Completion and verification

**The bounded engineering goal is complete.** Tested/package source: `7f8cd6e4a3e7d1c507e736fd2931ddf0b93a5998`. The production build ran at `4b876ae80b6b31d00dfac6cace2a03435b31d029`; the subsequent commit changed only unbundled harness wait/cleanup behavior. A Git comparison verified all `src`, `server`, `electron`, `assets` and package inputs are identical. The package is stamped with the final tested source SHA. Evidence-only follow-up commits do not change that runtime.

The exact retained-source Germany request now returns **79 definitions: 34 focuses, nine technologies, seven decisions, 28 events and one tree**. Source envelope: **165,477 characters**; exact provider JSON request body: **179,747 UTF-8 bytes**, each within its 180,000 limit. Twenty-six optional groups are admitted and 11 are explicitly omitted. Repeated HTTP previews have identical source selections, fingerprints, quotes and wire bodies; every included definition's identity/hash matches the original retained corpus. The original source-index SHA256 remains `029983ddc272b4e138c7038b23f2cb8db34ed75f9fc93186d290a3464052588b`.

These measurements use a disposable synthetic campaign seeded only with 65,144 retained source entries/metadata, not a personal campaign. They establish retrieval and payload-size behavior, not active-DLC applicability, engine semantics, strategic usefulness or generated output quality. Two observed preview times were approximately 3.86 and 3.51 seconds; they are one-run diagnostics, not a performance qualification.

| Check | Actual result and scope |
| --- | --- |
| `node --import tsx --test tests/ai-planning.test.ts tests/ai-reliability.test.ts tests/strategy-drafts.test.ts` | 32 pass, zero failed/skipped. Exact 180,000-byte boundary passes; 180,001 bytes refuses. Unicode/escaping, mandatory prior content, stale approval, atomic groups, corrected focus closure, cycle/work bounds, research starvation and insertion order covered. |
| Independent focused rerun | `/root/context_review` independently reran the 27 AI tests at the exact final source SHA; zero failed/skipped. Builder `/root/context_builder`, source investigator `/root/context_installed_audit` and reviewer were separate agents. |
| `npm run test-ci` | 206 portable fixtures plus three workflow guards pass. Existing allowlist only; no new installed-source, native, network/provider or process-control scope added to hosted CI. Counts overlap with focused tests. |
| `npm run build`; explicit strict TypeScript check of new harnesses | TypeScript/Vite/Node build and new browser/package/source-audit harness imports pass. Runtime-input equality across the harness-only follow-up is verified. |
| Browser `scripts/ai-context-ui.ts` with installed Edge override | Six pass: complete included fields and dual-unit disclosure, repeat determinism, measured mandatory overflow with retained work, stale-error suppression, recovery/save, tool navigation with transient preview approval. Zero renderer errors. |
| Existing `scripts/strategy-drafts-ui.ts` with Edge override | All 11 previous draft-safety cases pass at the same frozen candidate, including campaign saved-list isolation, failed/delayed saves and browser Stay/Leave. |
| `scripts/ai-context-installed.ts --source-index <explicit retained index>` | Four pass: source-only isolated copy, exact broad Germany HTTP preview, all-reference provenance and repeated selection/wire/approval determinism. Read-only original index unchanged; zero provider calls and no attempts/saved strategies created by preview. This script is excluded from hosted CI. |
| Development package and fresh extraction | `M7.4.2c-7f8cd6e4a3e7`; 75 extracted files byte-identical. Older builds retained. |
| `scripts/ai-context-package.ts <freshly extracted exe>` | Nine actual extracted Windows app checks pass, including shared browser journey, clean shutdown/service refusal and full process restart followed by reopening saved objective/reference and previewing again. Zero renderer errors. |
| Schemas, hygiene and committed-diff whitespace | Pass; the final manifest/report are checked again before publication. Hygiene is a heuristic plus independent/manual diff review, not comprehensive credential-history certification. |

All final recorded journeys report source unchanged throughout the run. Synthetic originals and the retained source index are unchanged. The two owned extracted Electron processes are closed. No real provider call, game launch, personal profile/save change or qualification promotion occurred. Failure-only package cleanup can inject discard into the owned disposable app; no human native-dialog acceptance is claimed, and the tested clean shutdown did not need that fallback.

Artifact: local-only `Documents/HOI4 Companion Development Builds/M7.4.2c-7f8cd6e4a3e7/M7.4.2c-7f8cd6e4a3e7-windows-x64.zip`. SHA256: `49647597786abf6eb1cf5414458f61707900f4dcf688d96eba67a223fd1ab279`. The executable is in that directory's `acceptance-extracted/win-unpacked/`; no installed application was replaced. Sanitized receipt: [AI-CONTEXT-01-VERIFICATION.json](AI-CONTEXT-01-VERIFICATION.json).

Independent source approval covers exact `7f8cd6e4a3e7d1c507e736fd2931ddf0b93a5998`, including UI, budget accounting, serialization, privacy, hosted-test boundaries and harness cleanup. The reviewer also checked raw browser/source/package records, matching hashes and final browser/restart screenshots with no blocking findings. Final evidence-only publication SHA, hosted checks and actual main merge are recorded in the delivery PR separately from this tested runtime.

## Diagnoses and remaining boundaries

The first changed-source installed-corpus check returned a size-compliant preview but contained no technologies. That failed the declared research-preview criterion; admission now rotates across source families and has a starvation regression. Independent review also found that reverse-exclusion neighbor insertion order could change which events survived a saturated 24-event group cap; sorted neighbors and a 26-event reversed-order regression close that defect. A changed-source preliminary corpus check passed, followed by the final frozen check after remaining source/prompt changes. Failed and preliminary evidence remain local and are not substituted for final certification. Final cases include both focus and research records, full-record marker preservation, exact UTF-8 accounting, explicit/prior-reference overflow, stale quote/error behavior and saved-strategy restart.

Existing QUAL-195, final explanation coverage, numerical combat formulas, broader Campaign-first production work and owner usefulness acceptance remain open. Previewing a source subset cannot raise strategy confidence, ranking or optimization eligibility. No provider credentials, raw saves, observations, private notes or account paths are added to outgoing context.

The manifest uses acceptance `not-applicable` for objectively verified source-preview engineering exit criteria. This neither assigns nor waives the owner's broader strategy/desktop usefulness decision. Native gameplay qualification is `not-applicable` because no observation/control qualification is claimed. No blocker remains for the declared preview scope.

The package walkthrough is [MILESTONE-7.4.2c-ACCEPTANCE.md](MILESTONE-7.4.2c-ACCEPTANCE.md); this build label identifies the bounded preview change only. Generate `npm run hq:handoff -- docs/milestones/AI-CONTEXT-01.json`. Project HQ synchronization remains pending; no Page edit or automatic synchronization is claimed.
