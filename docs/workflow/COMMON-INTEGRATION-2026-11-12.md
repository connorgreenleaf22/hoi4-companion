# Common integration — 2026-11-12, CJ-Laptop

Manifest: [COMMON-2026.11.12.json](../milestones/COMMON-2026.11.12.json). Related source PRs: [#6](https://github.com/connorgreenleaf22/hoi4-companion/pull/6), [#9](https://github.com/connorgreenleaf22/hoi4-companion/pull/9), [#12](https://github.com/connorgreenleaf22/hoi4-companion/pull/12), [#8](https://github.com/connorgreenleaf22/hoi4-companion/pull/8), [#11](https://github.com/connorgreenleaf22/hoi4-companion/pull/11).

## Candidate and scope

This report will be finalized after isolated Windows packaging and independent review. Until then, package/review evidence is pending. No protected merge or release is authorized or performed.

Base and rollback source: `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. Branch: `integration/common-2026-11-12`. The runtime/package SHA will be recorded separately from subsequent evidence-only commits. The numeric helper label `M7.4.2i` denotes integration, not a new completed feature milestone.

| Order | PR | Verified head | Dependency |
|---|---|---|---|
| 1 | #6 | `dfb27ec6a3b19e3a4240e550d501441db522c499` | reviewed base |
| 2 | #9 | `895ef1cc16da27887d535165b8ea866476d148a4` | reviewed base |
| 3 | #12 | `2bf89a5eaadcd6d22302cd1935fec5513a18b730` | #9 is an ancestor |
| 4 | #8 | `1fdf0a9af79b0afcaf465ccad33ee2a048591db8` | reviewed base |
| 5 | #11 | `747969632907827e89d261b5b157d93f3cb9f88b` | #8 is an ancestor |

GitHub connector metadata and direct remote refs agreed before integration. All merges use these full immutable SHAs with `--no-ff`; stacked ancestry is retained. PRs #3/#5 and earlier application/native branches already included in the reviewed base are inherited, not re-merged. PR #4 (`fef4efec13e353d54e7b7afd291c6958e1107873`), live-Q&A readiness, UX audit/prototype branches and unrelated work are excluded.

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
| `npm run test-ci` | Portable fixture and workflow counts recorded in final receipt; exit 0 |
| `npm run build` | TypeScript, Vite and all Node bundles passed |
| `node --import tsx scripts/release-gate.ts` | Expected exit 1, explicitly names NAV-01; no packaging/game/provider work dispatched |

No full historical milestone suite, paid request, HOI4 launch, invasive operation, protected merge or release is part of this run. Installed-source/native/paid historical evidence remains scoped to its original SHA and environment. Integration fixtures do not requalify gameplay, complete mechanics, user usefulness, invoices or desktop acceptance.

## Data preservation and rollback

The new compatibility test constructs synthetic pre-integration schema-3 campaign and AI records, closes their original database, copies it, then reopens only the copy twice. Old context fields, raw strategy/attempt payloads, notes/bookmarks/templates/queue, selected campaign and revisions survive unchanged. Unknown-usage reservations remain held; provider configuration remains absent. The original fixture database SHA-256 is unchanged. Existing schema-0/schema-2 migration, injected rollback, backup/restore, older-writer rejection, history and planner preservation fixtures also pass.

No real saved database is migrated, opened by the candidate, or published. A local-only preservation inventory hashes existing profile/database files, game configuration and historical ZIPs, and records original worktree tips/status. Final comparison and package/service cleanup evidence will be added after the Windows run. No raw save, licensed game source, credential or account data belongs in this report or Git.

Use the [promotion and rollback reference](COMMON-PROMOTION-2026-11-12.md). Returning to the base does not mean resetting any existing branch or replacing any user database. Schema 3 is unchanged; export/copy new test data before any manual rollback. Restore older schema backups only with every relevant service closed and their matching historical runtime.

## Remaining gates

NAV-01; blocked M7.4.2b formula qualification (#10); deeper source/campaign applicability (#7); owner desktop/strategy-usefulness acceptance and invoice reconciliation (#2); complete explanation coverage; final independent review and any required hosted checks/approval (#1). No gate is closed by inference. Project HQ synchronization is pending; this task prepares a handoff and does not edit the Page.

After common-baseline verification, prepare two separate knowledge-development worktrees at the final reviewed SHA. They are preparation only: no Local Goal creation, start, implementation, external research or milestone suite is dispatched.
