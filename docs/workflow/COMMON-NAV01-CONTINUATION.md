# Common integration continuation — NAV-01 and installed-version audit

Manifest: [COMMON-2026.11.12.json](../milestones/COMMON-2026.11.12.json). [NAV-01 receipt](../application/NAV01-VERIFICATION.json), [version delta](../application/QUALIFICATION-195-DELTA.json), [promotion/rollback](COMMON-PROMOTION-2026-11-12.md). Related tracking: [acceptance #2](https://github.com/connorgreenleaf22/hoi4-companion/issues/2), [mechanics #7](https://github.com/connorgreenleaf22/hoi4-companion/issues/7), [combat #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10).

## Scope, identity and review

Connor's continuation through Rook authorized an isolated NAV-01 fix, normal incorporation into the single integration branch, a separate read-only version audit, and sanitized feature/integration publication with a draft PR if permitted. It did not authorize develop/main merges, release promotion, paid calls, game launches or knowledge Goals. On entry, `integration/common-2026-11-12` was clean and unchanged at reviewed `6984f88463d4ec9add39b174889b0152ab9c0a30`. All 19 existing worktrees were clean; no other local repository task was active. The five source PR heads and develop/main still matched the prior report. Public-repository metadata reported push permission; no settings/rules were changed.

The implementation was isolated on `fix/nav01-template-drafts` from that reviewed candidate. Separate reviewer `/root/review_common_candidate` approved exact clean fix `58114ad8c2a93fc1b2cf04469724828b644f0e4c`, then exact harness correction `ed207cb31d2082c034b87085b44772eb918253c5`, with no remaining blocking findings. Normal merges produced runtime `e0218610779c829bd24eb60c6d04713897fd1456` and combined source/harness checkpoint `b54164bfe68c0deebb9856b68ce6b70962284861`. Both merges were conflict-free. All original PR ancestry (#6 → #9 → #12 → #8 → #11) remains intact; no historical branch was re-merged, and PR #4/live-Q&A remain excluded.

Final evidence commits retain the packaged runtime SHA separately. Consult local-only `.bridge-local/nav01-2026-11-12/final-review.json` and the native handoff for the exact final reviewed/published SHA and hosted checks. This avoids inserting a document's own hash into itself. Review evidence is independent code/evidence review, not human GitHub approval, owner acceptance or release authorization.

## NAV-01 result

NAV-01 is fixed within its stated template scope. A per-campaign in-window cache retains template name, unit rows/counts and army size across tool navigation and campaign switches. Global review can return to the template, download it, or explicitly discard it. Loading another saved template over dirty edits, discarding edits, and replacing different rows under an existing name require explicit confirmation. Cancel keeps the draft and saved data. Save continues through the existing profile API/revision checks; no store schema, migration or saved-template format changed.

Pending writes remain registered outside the mounted component; return navigation cannot discard or edit that pending template. A late save acknowledgement cannot clear newer cached edits. Failed saves preserve both the template draft and the existing campaign-recovery path. The existing beforeunload/native close infrastructure now counts template drafts and writes.

Limits: drafts are memory-only, not crash durable. Normal reload/close offers Stay/review or explicit Leave/discard. Save persists name and rows; army size is only a window calculation input and defaults after restart. Scratch/deleted-campaign drafts remain downloadable/discardable, with no automatic adoption into another campaign. Production-line/comparison selections and whole-strategy editor recovery are outside this fix. No broader recovery guarantee is implied.

## Exact checks and evidence

Local commands below used isolated fixture data, never original saved data. Counts overlap; they are not a sum of distinct tests. Unchanged earlier parser/planner/provider/compatibility evidence remains scoped to its original source. No full historical milestone suite was repeated.

| Command | Actual result |
|---|---|
| `npm ci --ignore-scripts --offline` in the isolated fix | Locked dependency install passed; no forced upgrade or fresh security-audit claim |
| `node --import tsx --test tests/lab-drafts.test.ts tests/draft-close.test.ts tests/integration-compatibility.test.ts tests/knowledge-store.test.ts` | 20 pass, zero fail/skipped |
| `npm run build` | TypeScript, Vite and Node bundles pass; integration build repeated once for the new packaged runtime |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=<installed Edge>; node --import tsx scripts/lab-drafts-ui.ts` | 9 pass, zero renderer errors; real browser confirmation/Stay/Leave, failed/pending saves, replacement Cancel, separate campaigns, download and legacy data |
| `node --import tsx scripts/draft-close-ui.ts` with the same Edge override | 7 affected planner-close cases pass after correcting an inherited stale campaign-button selector; initial failure retained |
| `npm run test-ci` | 195 portable fixtures + 3 workflow guards pass; only the pure in-memory Lab draft test was added to the hosted allowlist |
| `npm run schemas`; `npm run hygiene`; `git diff --check ba4c3c909931f57dcdff4084446f5ad26e06db9f HEAD` | Seven manifests and hygiene/actual develop-base whitespace pass; final evidence-only checks recorded with final SHA |
| `node scripts/package-development.mjs M7.4.2n`; `node scripts/package-acceptance.mjs <new build root>` | New unsigned package and fresh extraction; 75 files byte-identical |
| `node --import tsx scripts/lab-drafts-package.ts <extracted exe>` | Corrected harness: 11 pass, zero renderer errors; actual app/service, template lifecycle, clean reload, shutdown/service refusal and full restart |
| `node --import tsx .bridge-local/nav01-2026-11-12/qualification-delta.ts` | One isolated index, 53.343 seconds, 1,913 indexed files; 39 pinned files compared; refusal checks pass; no qualification promotion |

Package: `M7.4.2n-e0218610779c-windows-x64.zip`, local-only under `Documents/HOI4 Companion Development Builds/M7.4.2n-e0218610779c/`. SHA256 `fc4a789c18ed2b01038a63d28e6c794f4ae167a17b91fde8b6820ca3e7676ddc`. All older builds remain available. The successful run is local-only `nav01-lab-package-2026-11-13T01-10-18-392Z-510da024` in the fix worktree's `artifacts/qa/`; its UTC timestamp falls on November 12 in New York. Builder reviewed the packaged restart screenshot.

Native confirmation/close responses were injected through Electron's actual handlers; this is not human OS-dialog acceptance. Browser prompts were exercised separately without this injection. The first packaged attempt waited for an unsupported browser download event; the second mixed CDP confirmation handling with Electron's injected dialog response. Both failed receipts are retained. The harness was corrected to observe Electron `will-download`/completion and use explicit Electron response injection. The successful rerun used the exact same extracted package: no application/binary rebuild, provider call or game launch. Subsequent changes to unbundled test harnesses do not invalidate the runtime package.

Final documentation validation initially found that the new report's tracking-Issue links were absent from the manifest's GitHub list. The actual #2/#7/#10 links were added, and all seven manifests then passed. No schema rule was weakened. That failed check and the stale-selector/package-harness failures remain in local evidence; none is represented as an application test pass.

## Separate 1.19.5 source audit and all-DLC boundary

Installed identity is `1.19.5.0`, launcher `Operation Postern v1.19.5.0.7c6c (c184)`; launcher/executable hashes and index identity are in the sanitized receipt. Compared with the retained 1.19.4.2 corpus, 38 pinned file hashes match, only `launcher-settings.json` differs, and none is missing. Hash equality does not qualify semantics, current patch behavior or DLC applicability. No pinned version, qualification JSON, golden vector or source layer was relabeled.

Against the actual isolated 1.19.5 index, resource evaluation, combat evaluation and combat-input inspection return `source-invalidated`. Retained **fixture-generated** old results fail current-result validation. These are stale-result checks, not a read of historical user-saved evaluations. An NSB-enabled tank request is rejected by the retained no-NSB contract. The installed legacy Germany/Hungary definitions are present as source, but their retained paths and the no-NSB tank fixtures are counterfactuals, not evidence for the user's all-DLC target configuration. Installed descriptors alone do not prove entitlement, enabled playset or active-tree applicability; active mods are not merged.

PR #11's source-inspection capability is preserved, and all five numerical combat metrics/deltas remain unsupported/null. M7.4.2b and Issue #10 remain blocked. No current-patch mechanics, all-DLC path, combat formula, native/live-state or engine qualification is asserted. The raw isolated index and source excerpts stay local/ignored.

## Preservation, rollback and handoff

Fresh before/after comparison verified 146 original file hashes unchanged (22 pre-existing ZIPs plus 124 prior profile/database files), and all 18 other pre-existing worktree heads/statuses unchanged. That includes PR #4/live-Q&A and both prepared knowledge branches at 6984f884. The integration branch advanced intentionally; the NAV-01 fix worktree is new. Closed synthetic originals were copied for UI/package tests; originals remained byte-identical, and legacy names/rows/notes/bookmarks/queues/revisions stayed compatible. Test data was removed and no owned QA process remained. No original database was migrated or opened by the candidate, and no game configuration/save was modified.

Rollback anchor for this continuation: `6984f88463d4ec9add39b174889b0152ab9c0a30`, also pinned by `rollback/nav01-reviewed-base-2026-11-12`. Earlier bdb8a488 rollback and both historical artifacts remain intact. Do not reset another branch or overwrite a live database. Use retained builds with separate profiles and the existing closed-copy/backup procedure.

Release promotion stays blocked by `QUAL-195`, full explanation coverage, M7.4.2b formula qualification, broader applicability and owner acceptance/invoice gates. Develop/main merges need required hosted checks, exact-SHA independent review and explicit maintainer approval. The integration PR stays draft; the future develop-to-main draft remains local preparation only. Project HQ synchronization is pending; no Page was edited.

Native task reference and exact integration/fix/knowledge worktree paths are in local-only `.bridge-local/nav01-2026-11-12/NATIVE-HANDOFF.md`. They are intentionally excluded from public repository/PR content. Both prepared knowledge Goals remain unstarted and at their original preparation SHA; they were not silently advanced. Any future start must explicitly select the reviewed continuation baseline and preserve remaining qualification gates.
