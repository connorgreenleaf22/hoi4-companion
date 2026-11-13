# M7.2 — qualification attempt and reliability checkpoint

2026-11-07. Branch `feature/hoi4-native-m72`, isolated from exact M7 `0620369ef7544857992692c8ba448ab475a80407`. M7.1 remains on its original worktree/branch; no merge, explanation-engine changes or planning-risk implementation imported.

**Partial milestone: no new field was independently native-qualified.** The one authorized game launch ended early on a watchdog I/O failure. A meaningful focus/research transition and timed native deadline enforcement remain blocked. Offline work and the runnable development build are separate deliverables, not substitutes for those gates.

## Native plan and actual evidence

Read `M72-NATIVE-PLAN.md` for the pre-session plan and `M72-FIELD-QUALIFICATION.md` for each required comparison. Exact installed version: 1.19.4.2 (`Operation Postern v1.19.4.2.2da5 (0bdb)`), executable SHA256 `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037`. The older retained save has the same supported raw version, not a new M7.2 capture.

Limits: one launch, eight ordinary gameplay actions, twenty minutes; planned supervised shutdown after ten minutes. Actual: **one launch, zero gameplay actions, zero UI inputs, about 7.3 seconds from launch reservation to confirmed termination**. No budget overrun or reset. Previous M6.5 overrun remains in STATUS and its original evidence.

- Launch reservation: `2026-11-07T07:29:35.030Z`; session `f91df337-510a-4586-8f42-a0fb91fbe493`.
- Exact owned game PID 35756, Windows creation FILETIME `134385101750365988`. Primary and backup supervisors acknowledged the matching identity/session and `07:39:35.030Z` deadline.
- Backup receipt at `07:29:42.323Z`: `invalid-budget`, `terminated`. Primary receipt at `07:29:43.308Z`: emergency stop, refusal because that process was already gone.
- No usable game window appeared; game system.log reached initialization. No campaign, matching screenshot, new save, telemetry snapshot or save-to-UI comparison was captured. Session/reload targets were not exercised.
- This independently demonstrates failure-triggered termination of the exact owned game; **it does not demonstrate deadline-triggered termination**. The repaired supervisor remains native-unqualified.

Raw evidence stays ignored in `.bridge-local/native-6Ne9oj/`: plan, launch receipt, both readiness/heartbeat/termination receipts, lease and archived `owned-game-profile`. The originally absent laptop HOI4 profile was restored to absence using the lease archival helper. Game and supervisor PIDs were confirmed absent. No personal saves, regular playset or installed game files were modified. `.bridge-local/m72-native-budget.json` remains stopped with one launch used.

## Diagnosis and repair

Category: integration defect involving Windows file sharing. The original catch did not retain its trigger exception, so the exact native exception cannot be asserted. One bounded two-process reproduction of heartbeat temp-file replacement produced `EPERM` on rename at sequence 6; an incomplete heartbeat temp file also remained in the native evidence. This supports rename contention as the likely cause, not a proven reconstruction.

Repair: independently written append-only heartbeat JSONL; bounded tail reads ignore partial final records; monotonic session/sequence health remains fail-closed. Shared budget writes retain atomic replacement with bounded sharing-violation retries. Receipts now retain the triggering exception. Both independent supervisors can terminate only the exact owned process. Emergency stop does not undo prior actions or close a regular game.

The repair passed real concurrent-process heartbeat tests and synthetic Windows deadline/stop/peer-loss/foreign-identity checks. **No second HOI4 launch was attempted.** Next native attempt requires a separately reviewed session after the documented offline fix, preserving this exhausted budget and evidence.

## Observation and release interfaces

- Save reader preserves source bytes/hash, precise focus leaf paths/lines, valid date, raw stored focus progress and separate player/date fields. Explicit current token is still required; stored progress alone never means selected focus. Research points remain raw, positions are serialized positions, positive levels are not completion events.
- Optional schema-1 `provenance` distinguishes read time, file modification time, persisted-state freshness and unverified session binding. Optional field `raw` and reserved `qualificationEvidence` allow future evidence without changing old recording validators. Current save IDs use parser revision `save-v2`; reinspection can coexist with older cached save-v1 entries. Historical records remain readable.
- UI and existing 15-tool MCP expose this same observation. Every save field remains parsed-unqualified or unavailable; sessionId remains null. Existing M6.5 field-specific telemetry qualifications are unchanged, not expanded. No new control capability or global client registration.
- Final-release contract: `../application/EXPLANATION-COVERAGE-CONTRACT.md`. Source obligation census and reviewed-evidence ledger block final packaging with unresolved mechanics, unapproved content configuration or stale evidence. Isolated development packaging remains available. No claim of 100% current semantic coverage.

## M7.1 / future integration reconciliation

Reconcile additive `src/integration-types.ts` fields, save-v2 identity, the connection-panel provenance display, capability wording, tests and package lifecycle hook when combining baselines. M7.1's `src/planning-coverage-types.ts` and `server/planner/coverage.ts` remain authoritative for plan-level risk. The separate release ledger measures the declared content denominator, not strategy risk or optimality.

Each future qualified field needs an immutable source hash, exact game/executable version, independently matched capture/session/world ID, comparison evidence and an explicit freshness rule. Only then may an adapter offer it for user-reviewed resolution of a named planning condition. Positive completed-focus/technology evidence cannot prove absence or inventory completeness. Manual assertions remain separate. No observations automatically elevate confidence or numerical ranking eligibility.

M7.5 remains a separate read-only native feasibility review. Save inspection could reduce pressure for memory access if independently qualified; this failed session establishes no new replacement capability. No memory reads, patching, DLLs, hooks or native command adapters were used.

## Validation and delivery

Evidence and package results are recorded below. Prior QA-LEDGER obligations and user desktop acceptance remain open. No merge, release or push is implied; M7.2 requires verified private origin before any push.

### Offline evidence checkpoint

- Eight deadline/heartbeat tests passed (`.bridge-local/m72-watchdog-repair-tests.txt`); trigger exception assertion also passed (`m72-trigger-detail-test.txt`).
- Ten save, real stdio MCP/HTTP and release-census tests passed (`m72-save-platform-coverage-tests.txt`). The four-test final census suite additionally exercised the actual CLI on a synthetic installation and confirmed a nonzero final-release result (`m72-release-final-tests.txt`).
- 118 focused existing ownership/history/planner compatibility cases passed (`m72-compatibility-tests.txt`). TypeScript and `npm run build` passed (`m72-build.txt`). These are offline checks, not native field qualification.
- Actual installed candidate census: 4,101,663 conservative source/node/text/opaque obligations, zero reviews in the new ledger. Profile digest `b04936186406fc532955073903a4d386bd965581b115f7b6b6b52dd079e16390`. Ignored evidence `.bridge-local/m72-content-census/{profile.json,obligations.jsonl,report.json}`. This is not a count of distinct mechanics or the existing interpreter's semantic coverage. The initial implementation attestation is intentionally stale after final test/CLI refinements; no approval exists to carry forward.
- `npm run prepackage` refused the unapproved final release as intended (`m72-release-block-test.txt`). Development packaging is separate.
- GitHub connector metadata on 2026-11-07 reports `visibility: public` for connorgreenleaf22/hoi4-companion. Per the explicit M7.2 instruction, all M7.2 commits stay local; no push attempted despite older M7.1 public-push authorization.

The retained M6.5 save used for packaged compatibility is raw version 1.19.4.2, full save label `Operation Postern v1.19.4.2.2da5 (24df)`. The parser does not independently qualify checksum/DLC equivalence; source version matching is not evidence of the current campaign.

### Windows acceptance delivered

Runtime source commit **5b3dce131821**; later checkpoint changes are documentation only. Build:

`C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.2-5b3dce131821/M7.2-5b3dce131821-windows-x64.zip`

ZIP SHA256 `f6c05073b6063903a56ac5c70ee517bf4d3dd9b44ac0f6fafef8903cfd827089`. All **76** extracted files match. Locally runnable verified executable:

`C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.2-5b3dce131821/acceptance-extracted/win-unpacked/HOI4 Companion M7.2-5b3dce131821.exe`

Extract the whole ZIP into a new folder on the desktop and run its similarly named executable. Do not replace an older installation. Follow bundled START-HERE.md (source: ../application/MILESTONE-7.2-ACCEPTANCE.md). The bundled M65-HISTORICAL-OBSERVATIONS.jsonl provides eight historical snapshots without launching the game or creating JSON manually. App storage uses the commit-specific development profile; smoke tests used a separate temporary profile, leaving the normal build profile fresh. Optional external MCP needs compatible Node; the packaged app embeds its own Node service and resources. `npm run browser` uses the same service in a browser with development configuration/storage.

All three actual packaged checks passed on the first M7.2 attempt: historical import/display, connection + retained save inspection + external 15-tool MCP/shared stop, and service shutdown/restart/persistence. The new raw/persisted/unverified provenance labels were asserted. Evidence: `artifacts/qa/platform-package-2026-11-07T07-46-43-039Z-52f0e672/`. Runtime/source archive hashes matched; sourceUnchangedDuringRun=true; save/diagnostics screenshot reviewed. Owned app processes and services were closed. No new HOI4 launch occurred during packaging. The retained M6.5 autosave SHA256 remains `eeb9eb34019e17fdc147970b740bca3639a7339ce09fef791a4cc541c31b8efa`.

Across the distinct focused suites, **137 cases passed**, plus the three packaged checks, TypeScript/build, and expected final-release refusal. This is developer acceptance, not user desktop acceptance or a broad final-release QA pass. Reused the existing Node/SQLite/parser, telemetry mod, Electron packaging, MCP SDK and test infrastructure; no new community/native component was introduced.

### Exact next step

Stop M7.2 development at this local checkpoint. User can review the isolated build now. The next engineering session should review the retained watchdog I/O failure and passing repair tests, then approve a **new separately identified bounded native session** to qualify one research assignment with matching paused UI/save/log evidence and actual timed shutdown. Never reset/reuse the exhausted M72 budget or relabel its early termination as deadline qualification. Reload/world identity remains a subsequent target if that session's budget permits. M7.1 integration requires an explicit common-baseline decision; no planning confidence is changed by this checkpoint.
