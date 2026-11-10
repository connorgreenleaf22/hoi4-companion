# Laptop integration readiness — November 10, 2026

**Result: offline integration passed; technically ready for code review. Desktop/native accuracy and user acceptance remain pending.** This is a bounded integration assessment, not product acceptance or permission to merge. Manifest: [LIVE-QA-READINESS.json](../milestones/LIVE-QA-READINESS.json). Target: [draft PR #4](https://github.com/connorgreenleaf22/hoi4-companion/pull/4).

## Candidate and integration

- Verified development baseline: `bdb8a4887522b38f5110f3900bbf1655cc5fd600`, incorporating merged [workflow PR #3](https://github.com/connorgreenleaf22/hoi4-companion/pull/3) and [correction PR #5](https://github.com/connorgreenleaf22/hoi4-companion/pull/5). Their reports and exact-head hosted receipts were inspected. Baseline hosted run: [42921391581](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/42921391581).
- PR #4 source: `fef4efec13e353d54e7b7afd291c6958e1107873`. Original live-Q&A branch remains unchanged, draft and unmerged. Local M7.3.1 checkout still has its older checked-out commit; the fetched remote baseline, not that checkout, was used.
- Disposable isolated worktree: `hoi4-live-qa-readiness`; validation branch: `workflow/live-qa-readiness-20261110`. Merge candidate `b0e9f15ed9027b5f15aaa67f95d80739c2021ec8` preserves both parents. Only conflict was adjacent STATUS documentation; both entries were retained. No runtime integration fix was needed.
- Final reviewed/tested code and test candidate: **`72c2a27cbc03986b7b237dc08dcb8265374e9c67`**. One narrowly reviewed CI allowlist entry and one shared-query historical regression were added. Report commits do not replace this tested SHA.
- Runtime `server/`, `src/`, mod, build wiring and desktop helper sources are identical to PR #4 and kit source `c118d080f889a3bd5b833625f30b00abc2222e2a`. Package metadata adds only the previously merged QA scripts and Ajv development dependency. Shared `hoi4-campaign-qa/1`, six MCP tools, credentials and recording bounds are unchanged.

## Focused validation

Node 24.21.0 on the development laptop; fresh `npm ci --ignore-scripts --no-audit --no-fund`. No broad `npm test` loop.

| Check | Result and scope |
|---|---|
| `npm run typecheck`; `npm run build` | Passed TypeScript and production service/adapter/renderer bundling. No Electron or HOI4 launch. |
| `npm run test-ci` | Initially 123 allowlisted fixtures + 3 workflow guards passed. Final candidate: **132 fixtures + 3 guards**, including all 9 campaign-Q&A tests. |
| `npm run schemas` | Passed the existing milestone contracts; the new readiness manifest is validated on the reporting commit. |
| `CI_DIFF_BASE=bdb8a488... npm run hygiene`; `git diff --check bdb8a488 HEAD` | Passed whole tracked-file heuristic scan and integration delta whitespace. Final public diff manually screened; raw evidence remains ignored. |
| Focused Node tests | **30/30** passed: `campaign-qa`, `bridge-platform`, `bridge-save`, `bridge-recorded`, `telemetry-m65`, `bridge`. The new shared-query case then passed in all 9 Q&A cases and the final CI allowlist. Counts overlap; they are not additive unique coverage. Native deadline helper test uses injected identities/callbacks only. |
| Built adapter smoke | All 6 tools called over actual local stdio against an isolated fake-install fixture service; control tool refused. No tunnel or installed-game indexing. Reference response is allowed to be unavailable in this fixture; this run does not establish installed-source correctness. |
| Hosted QA on exact candidate | All four jobs passed: `qa-typecheck`, `qa-test-ci`, `qa-schemas`, `qa-hygiene` in [run 42924450500](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/42924450500). Ubuntu/Node 24 validates the newly allowlisted Q&A test's portability and initial-branch hygiene behavior. |
| Independent review | Passed exact `72c2a27...`, no actionable findings. See [review scope and probes](READINESS-REVIEW-2026-11-10.md). This is agent review, not human approval. |

Reproduce focused checks:

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run test-ci
npm run schemas
npm run hygiene
node --import tsx --test tests/campaign-qa.test.ts tests/bridge-platform.test.ts tests/bridge-save.test.ts tests/bridge-recorded.test.ts tests/telemetry-m65.test.ts tests/bridge.test.ts
npm run build
```

For committed whitespace set `CI_DIFF_BASE` to the full baseline SHA above using the shell's environment syntax. Raw local output: `.bridge-local/readiness/`; built adapter evidence: `.bridge-local/qa-smoke-2026-11-10T23-34-58.486Z`. These local-only files are not public artifact uploads.

## Historical interface rehearsal

The new test seeds only sanitized retained M6.5 fixture records into disposable SQLite, then calls the actual authenticated `CampaignQa.query` HTTP route used by MCP. Observations, same-session/country changes, provenance and sanitized export agree. GER dates are `1936.01.01.12` and `1936.01.07.24`, with original fixture capture dates in November 2026. Both remain historical/stale, never current live-game evidence. Unknown country/session filters yield no comparable changes.

Supported retained values: political power `2.324 → 16.268` (difference `13.944`), civilian factories `35 → 37`, research slots `4`, fixed-ID Basic Machine Tools researching check `false → true`. The last is a subset flag, not a completion event or full assignment inventory. Current focus, complete focus/research inventories, manpower, resource, supply, production and diplomatic detail are unavailable in these retained records. The new player telemetry's candidate manpower field does not retroactively add manpower to an old recording.

The [five-question scorecard and exact desktop checklist](DESKTOP-ACCEPTANCE-SCORECARD.md) separate this rehearsal from actual comparative user acceptance. No model prose, paid call, live observation or usefulness score was generated here.

## Existing desktop kit

Read-only verification of the already staged SMB archive and adjacent manifest passed:

- `HOI4-QA-Desktop-Pilot-c118d080f889.zip`, **30,387,588 bytes**.
- SHA-256: `3a1c055e596ddb6556a81c1dfb0cbac4d1b67df99667bfac6be4e8c1d99d232b`.
- Manifest and embedded BUILD.json identify full source `c118d080f889a3bd5b833625f30b00abc2222e2a`; all **20 inventory files** match length/hash, with no unexpected files beyond BUILD.json. Credential/game-data exclusion flags agree with the inspected contents.
- Bundled READ-ME and EVALUATION text match the reviewed repository instructions. Pinned tunnel archive hash remains `99474aaa62ece303d7b661f2f46f932dcd560b489b540f817355da25be71bcf3` in BUILD.json; its bundled executable is covered by the inventory hash.
- Setup covers Node 24, destination-generated paths, separate data directory/playset, local hidden key entry, matching six-tool smoke, startup-marker boundary, user-controlled Start/Stop and cleanup. No critical package defect found. **Archive, manifest and existing evidence were not modified; no replacement package produced.**

The kit contains the same application runtime as this integration candidate, but not the new source-repository QA scripts or readiness reports. Green source CI does not establish deployment on the gaming desktop.

## Review readiness, open gates and next task

No source-level blocker was found. PR #4's implementation is technically ready for independent/human review against this documented candidate. Its original GitHub branch still has the STATUS conflict against the new base and lacks this allowlist/test/report commit: adopt the reviewed resolution/tests through a normal update when authorized before claiming the original PR merge-ready. Do not substitute validation-branch CI for checks on a later PR head. No PR ready-state transition or merge was performed; `main`/`develop` are unchanged.

Still pending on the gaming desktop: local transfer/extraction/hash; destination service/credential paths; restricted tunnel transport; actual startup marker/daily human-country hook; independent values/units against game UI; two-country qualification; recovery behavior in the real environment; a separate 30–60 minute capture; comparable HOI4 CPU/FPS measurements; 3–5 paired questions and explicit user acceptance. New pilot data remains parsed-unqualified historical evidence even if recently captured. Same-date save reload identity remains unsupported.

**Smallest task after the desktop two-minute smoke:** inspect its sanitized run summary and independent UI readings once, confirm country/date/boundary and exact failure or passing fields, then authorize one separate 30-minute new-campaign capture only if the smoke is adequate. Stop on a failure and diagnose that specific evidence; do not repeat launches or start broader QA. Provider acceptance and default-branch workflow rollout remain separate.

No HOI4 launch, native game test, memory/DLL work, personal save modification, paid inference, tunnel reconnection, new public endpoint, PR merge or baseline mutation occurred. The temporary fixture services and MCP children exited. Keep this worktree/branch as a disposable review reference; it can be removed after the handoff is consumed.
