# Common integration — 2026-11-12, CJ-Laptop

Manifest: [COMMON-2026.11.12.json](../milestones/COMMON-2026.11.12.json). Related source PRs: [#6](https://github.com/connorgreenleaf22/hoi4-companion/pull/6), [#9](https://github.com/connorgreenleaf22/hoi4-companion/pull/9), [#12](https://github.com/connorgreenleaf22/hoi4-companion/pull/12), [#8](https://github.com/connorgreenleaf22/hoi4-companion/pull/8), [#11](https://github.com/connorgreenleaf22/hoi4-companion/pull/11).

## Candidate and scope

The combined runtime is `e27e28f8ff5ddaa9d5820bceeba2073283868f0c`. Isolated Windows extraction, launch/service/save/restart and independent runtime review passed within the limits below. **This is a blocked development review candidate, not release-ready.** No protected merge, remote publication or release is authorized or performed. The [sanitized verification receipt](../application/COMMON-INTEGRATION-VERIFICATION.json) records exact local evidence hashes. The final documentation candidate is reviewed after evidence freeze; consult the local-only `.bridge-local/integration-2026-11-12/final-review.json` and task handoff for its full SHA, distinct from the packaged runtime.

Base and rollback source: `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. Branch: `integration/common-2026-11-12`. Subsequent evidence commits do not change tested runtime files. The numeric helper label `M7.4.2i` denotes integration, not a new completed feature milestone.

| Order | PR | Verified head | Dependency |
|---|---|---|---|
| 1 | #6 | `dfb27ec6a3b19e3a4240e550d501441db522c499` | reviewed base |
| 2 | #9 | `895ef1cc16da27887d535165b8ea866476d148a4` | reviewed base |
| 3 | #12 | `2bf89a5eaadcd6d22302cd1935fec5513a18b730` | #9 is an ancestor |
| 4 | #8 | `1fdf0a9af79b0afcaf465ccad33ee2a048591db8` | reviewed base |
| 5 | #11 | `747969632907827e89d261b5b157d93f3cb9f88b` | #8 is an ancestor |

GitHub connector metadata and direct remote refs agreed before integration. A final remote read still matches all five heads; develop/main remain `ba4c3c909931f57dcdff4084446f5ad26e06db9f`. All merges use these full immutable SHAs with `--no-ff`; stacked ancestry is retained. PRs #3/#5 and earlier application/native branches already included in the reviewed base are inherited, not re-merged. PR #4 (`fef4efec13e353d54e7b7afd291c6958e1107873`), live-Q&A readiness, UX audit/prototype branches and unrelated work are excluded.

Preflight inspected AGENTS, repository bridge skill, bridge STATUS, workflow/HQ/rollout guidance, all 16 existing worktrees and active app tasks. All 16 worktrees were clean; no other local repository chat was active. Only the new integration worktree was edited. The existing live-Q&A worktrees, branch tips, app profiles, game configuration and historical packages are preserved.

## Conflict and contract reconciliation

- #6 merged cleanly. #9, #12, #8 and #11 each conflicted only at the top of `docs/hoi4-bridge/STATUS.md`. Both sides' milestone evidence/limits were retained; current integration scope is added above historical entries. No application code conflict required resolution.
- `POST /api/v1/strategy/review` keeps the default response unchanged; #12 adds a strictly boolean, opt-in `includePathSummary`. Rank/optimize refusal and coverage policy are unchanged. Nested event interpretation feeds both this review and #6's corrected outgoing AI context. Old AiSource records remain readable because new serialization fields are optional.
- Parser/SQLite infrastructure remains shared; no store-schema or migration implementation changed from the base. Cached focus reads use repeated-exclusion correction as well as newly imported definitions. Source declarations, campaign assumptions, historical/save-derived observations and native-qualified facts remain separate.
- #8's four qualified base resource dimensions remain independent of combat qualification. #11 retains `inspectCombatInputs`, qualified declaration projections and dependency diagnostics. Organization, soft attack, hard attack, defense and breakthrough remain unsupported/null; every combat delta is null and qualified combat metric count is zero. M7.4.2b remains **blocked** on [Issue #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10).
- Build output includes both resource and combat APIs plus demos. #12's lowercase milestone suffix support is retained across Electron validation, development packaging and ZIP verification. CI additions are exactly the inherited design/combat fixture files; their imports use synthetic projections and in-memory sources. Installed-index/process tests remain outside hosted CI. No workflow permissions, secrets, action revisions, provider/native execution or uploads were added.
- NAV-01 is deliberately left unresolved and **blocks release promotion** through `INTEGRATION-RELEASE-GATES.json` and `scripts/release-gate.ts`. The legacy Lab loses unsaved template edits when unmounted. Existing registered campaign/planner recovery does not protect this editor or every whole-strategy draft. Save before navigation; require a separately reviewed fix and extracted-build regression before lifting the gate. The existing final explanation-coverage gate remains behind this additional refusal.

## Validation scope and results

Local logs: ignored `.bridge-local/integration-2026-11-12/`; never upload this folder wholesale. Node 24.21.0, npm 11.19.0, Windows x64. `npm ci --ignore-scripts` passed; Electron's reviewed installer script completed. The lockfile is unchanged. npm reported six moderate dependency advisories; no forced upgrades were attempted.

| Command | Result |
|---|---|
| `node --import tsx --test tests/ai-planning.test.ts tests/knowledge-importer.test.ts tests/knowledge-store.test.ts tests/design-evaluation.test.ts tests/combat-evaluation.test.ts` | 77 passed, 0 failed/skipped |
| `node --import tsx --test tests/integration-compatibility.test.ts tests/planner-model.test.ts tests/planner-service.test.ts tests/history.test.ts` | 21 passed, 0 failed/skipped |
| `node --import tsx --test tests/design-evaluation-index.test.ts tests/combat-evaluation-index.test.ts` | 2 passed, 0 failed/skipped; shared SQLite resolver/persistence/invalidation |
| `npm run test-ci` | 191 portable fixtures + 3 workflow guards passed; 0 failed/skipped |
| `npm run build` | TypeScript, Vite and all Node bundles passed |
| `npm run schemas` | 7 milestone manifests validated after adding this manifest |
| `npm run hygiene` and `git diff --check bdb8a488 HEAD` | Local heuristic and combined whitespace pass; final evidence-only delta checked again after staging |
| `node --import tsx scripts/release-gate.ts` | Expected exit 1, explicitly names NAV-01; no packaging/game/provider work dispatched |
| `node scripts/package-development.mjs M7.4.2i` | Passed; unsigned isolated Windows directory; no publish |
| `node scripts/package-acceptance.mjs <new build root>` | Passed; ZIP and fresh extraction, all 75 files byte-identical |
| `$env:HOI4_INTEGRATION_SMOKE='1'; node --import tsx scripts/ai-package-smoke.ts <extracted exe>` | 3 acceptance cases pass (startup/config, offline edit/save/comparison, full-process restart/reopen); additional check reproduces NAV-01, not an acceptance pass for the defect |
| `node .bridge-local/integration-2026-11-12/verify-bundles.mjs` | Four extracted ASAR API/demo bundles match built bytes; pinned-fixture resource demo works, three partial combat comparisons retain five null totals/deltas; support input inspection qualified, aggregation false |
| `node --import tsx scripts/design-evaluation-audit.ts <detected game root>` | Expected refusal, exit 1: actual 1.19.5.0 differs from required 1.19.4.2; current-source qualification blocked |
| `node --import tsx scripts/combat-input-audit.ts <detected game root>` | Expected refusal, exit 1 at same version mismatch; no deeper audit/rebaseline attempted |

Counts overlap between focused and portable runs; do not sum them as distinct cases. Tests ran against the same runtime/test source content before its clean commit; package QA records its full source identity. No runtime changes followed the validated build. Only affected preservation/index checks were added after the initial focused run.

Package: `M7.4.2i-e27e28f8ff5d-windows-x64.zip`, local-only under `Documents/HOI4 Companion Development Builds/M7.4.2i-e27e28f8ff5d/`. SHA256: `1086a172f6b70f1e03dae665edd016b329006809c66373ad81a3d8eece50194c`. Actual extracted runtime run: local-only `artifacts/qa/ai-package-2026-11-12T20-17-55-374Z-2d01e8a6/`. Builder inspected restart and navigation-blocker screenshots. The test storage is a newly created temporary profile; Electron storage is a new commit-labelled development profile. Source identity stayed unchanged; the first service was unreachable after app shutdown, saved proposals reopened after full restart, the temporary database was removed and all owned QA process IDs were absent afterward.

The packaged installed-source workflow indexed **1.19.5.0**. Historical #9/#12 source findings and #8/#11 qualification corpora remain **1.19.4.2** evidence. The latter audits refused immediately on version mismatch. No qualification file, source pin or golden vector was changed to conceal that mismatch. Passing compiled demos use retained fixtures; no current-installation resource/combat or full-mechanics qualification is claimed. Future knowledge work must begin by assessing this version change in its separately authorized scope.

No full historical milestone suite, paid request, HOI4 launch, invasive operation, protected merge or release is part of this run. Installed-source/native/paid historical evidence remains scoped to its original SHA and environment. Integration fixtures do not requalify gameplay, complete mechanics, user usefulness, invoices or desktop acceptance.

## Data preservation and rollback

The new compatibility test constructs synthetic pre-integration schema-3 campaign and AI records, closes their original database, copies it, then reopens only the copy twice. Old context fields, raw strategy/attempt payloads, notes/bookmarks/templates/queue, selected campaign and revisions survive unchanged. Unknown-usage reservations remain held; provider configuration remains absent. The original fixture database SHA-256 is unchanged. Existing schema-0/schema-2 migration, injected rollback, backup/restore, older-writer rejection, history and planner preservation fixtures also pass.

No real saved database is migrated, opened by the candidate, or published. The local-only before/after inventory verified **145 unchanged file hashes**: 21 historical ZIPs and 124 prior profile/database files. All 16 original worktree heads and clean statuses are unchanged, including PR #4/live-Q&A. Conventional Documents HOI4 configuration paths were absent in the initial inventory; neither standard Documents nor OneDrive HOI4 user root is detected afterward. This is absence evidence, not a hash comparison of unknown configuration paths. No game configuration was edited. No raw save, licensed game source, credential or account data belongs in this report or Git.

Use the [promotion and rollback reference](COMMON-PROMOTION-2026-11-12.md). Returning to the base does not mean resetting any existing branch or replacing any user database. Schema 3 is unchanged; export/copy new test data before any manual rollback. Restore older schema backups only with every relevant service closed and their matching historical runtime.

## Independent review

Separate reviewer `/root/review_common_candidate` reviewed full runtime SHA `e27e28f8ff5ddaa9d5820bceeba2073283868f0c`: no blocking code/integration findings. The reviewer independently checked all five ancestry links, both stacks, exact #11 API/type/fixture preservation, #12 shared contract preservation, unchanged store/migration/lockfile/workflow, fixture-only CI imports and whitespace. Narrow independent checks passed: one copied-data compatibility case; compiled combat demo with three partial comparisons, all totals/deltas null and source-only inspection; NAV-01 release refusal. Reviewer also independently byte-compared 75 extracted files, verified ZIP/four ASAR bundles, rehashed all 145 original files, checked all 16 original worktree heads/status and inspected smoke/cleanup receipts. The reviewer did not launch the app/game, make provider calls or repeat broad suites. Final evidence-SHA review is separate and must be consulted in the post-freeze local receipt; no self-hash is inserted into tracked evidence.

## Remaining gates

NAV-01; current 1.19.5.0 source requalification; blocked M7.4.2b formula qualification (#10); deeper source/campaign applicability (#7); owner desktop/strategy-usefulness acceptance and invoice reconciliation (#2); complete explanation coverage; any required hosted checks/explicit merge approval (#1), plus final evidence review if its local receipt is absent. No gate is closed by inference. Project HQ synchronization is pending; this task prepares a handoff and does not edit the Page. [Promotion PR drafts](COMMON-PROMOTION-PR-DRAFTS.md) are local preparation only.

After common-baseline verification and final exact-SHA review, prepare two clean worktrees at that reviewed SHA: `hoi4-knowledge-paths-next` / `knowledge/paths-next` for path/mechanics knowledge, and `hoi4-knowledge-combat-next` / `knowledge/combat-next` for source/rule qualification. Actual creation paths/SHAs are recorded in local-only `prepared-worktrees.json` and the final task handoff. They are preparation only: no Local Goal creation, start, implementation, external research or milestone suite is dispatched. This engineering baseline is verified for continued development with documented blockers; it is not release-ready or current-patch-qualified.
