# Milestone 6.5 — expanded read-only observation

Branch: `feature/hoi4-telemetry-m65`, from validated `f02b1c5`. The M6.1 branch and acceptance ZIP remain separate. This milestone delivers useful native observations, not complete focus/research state or gameplay control.

## Implementation and compatibility

The existing mod, Node bridge, SQLite history, typed contracts and Campaign Intelligence panel are extended; no dependencies or second service were added. `src/telemetry-manifest.ts` defines manifest `ger-m65-1`, strictly pinned to **HOI4 1.19.4.2**, human GER. `scripts/bridge-generate-telemetry.ts` generates the additive scripted effect. `on_startup` emits a session marker and snapshot; `on_daily_GER` emits one snapshot when GER is not AI. There is no all-country/per-tick scan, vanilla replacement, persistent gameplay variable or reward modification.

Wire v2 is one terminated atomic record containing seven numbers and eight Boolean checks. Its quoted string is 238 characters after UUID substitution, below the installed validator's 255-character limit. Unknown manifest/version/country, conflicting keys or wrong vector lengths reject the record. Missing/unexpanded/invalid individual values stay unavailable; absence never becomes false. Version 1 recordings remain supported. Session/producer/source hash/byte offset, partial reads, duplicate protection, rotation and staleness retain the existing bridge semantics. The engine's hour 24 is preserved as text. Version metadata comes from installed launcher settings, not a script-generated claim.

New interfaces: schema-2 `BridgeSnapshot.values` and `campaign`, observation capabilities on `/api/v1/bridge/status` and `/api/v1/bridge/intelligence`, and the existing poll/export/replay/history interfaces. Imported history remains historical even if it carries old ownership metadata. The capability registry qualifies individual fields; fixtures, disconnected records and stale values cannot become live observations. The panel adds one expandable diagnostic section. It does not fill or overwrite manual plan assumptions/completions.

## Verified inventory and mechanism assessment

| Desired state | Implemented source and freshness | Independent result / limits |
|---|---|---|
| Country/date, PP/stability | GER scope, engine prefix, dynamic country values; startup/daily snapshot | GER / Jan 1 noon, PP 2.324 vs rounded UI 2, stability .81 vs 81%; repeated on 1.19.4.2. Fractional PP precision is log-only |
| War support | `has_war_support`, fraction, startup/daily | .35 matched UI 35%; qualified |
| Research slots | `amount_research_slots`, total count, startup/daily | 4 matched four research rows; total, not unused slots; qualified |
| Civilian factories | `num_of_civilian_factories`, startup/daily | 35 initially, 37 after trade; tooltip independently showed owned 35 plus trade 2. Includes trade, not owned/free count; qualified at these states |
| Military factories / dockyards | `num_of_military_factories` / `num_of_naval_factories`, startup/daily | 28 / 10 matched UI denominators; qualified, not allocations or output |
| Active research | `is_researching_technology` for three manifest IDs, daily snapshot | **basic_machine_tools false → true** matched empty rows then assigned Basic Machine Tools. This one ID qualified; whole three-ID group remains unqualified |
| Known technology | `has_tech`: infantry_weapons, basic_machine_tools, construction1 | Real values true/false/false; green infantry tree and Basic Machine Tools research button corroborate some states. No completion transition independently tested; whole group unqualified |
| Completed focus | `has_completed_focus`: GER_prioritize_economic_growth, GER_the_four_year_plan | Initial negatives corroborated by selectable tree; first ID became true at Mar 16 in archived log. Positive result **not independently verified**, so group unqualified |
| Selected focus / focus progress / availability | No qualified exporter | Named focus_progress can persist after cancellation and is not selection proof. Installed docs do not document has_active_focus. Remain unavailable |
| Research progress, complete research/focus inventories | No qualified exporter | Fixed-ID checks are not enumeration, slot identity, scheduling or elapsed progress |
| Completion events | Not implemented | Installed on-action documentation has no general focus/research completion hook. MIO hooks are not universal. Daily differences are snapshots, not emitted completion events |
| Production lines, construction queue, diplomacy, military, pause/speed | Not implemented | Factory counts do not fill these gaps |

Supported scripting is the preferred current mechanism: cheap bounded checks, explicit coverage, patch-specific validation. Existing bridge event logs provide startup/dated snapshots, not a reliable general event feed. Read-only **disposable text-save inspection** is the next candidate for current focus, progress and complete inventories; no save schema was qualified here and compressed/binary saves are not JSONL. The already reviewed Live Tools save-tree facilities and Jomini evaluation remain references, not newly executed/imported components. Agent Tools provides static source/documentation analysis, never live state. Memory/native observation adapters remain separately reviewed and approved future work; no DLL, patch, injection or achievement claim.

## Static and deterministic evidence

28 focused tests pass: `telemetry-m65`, `bridge-owned`, `bridge-recorded`, `bridge`, `history`, `intelligence`. TypeScript passes. Coverage includes missing/invalid vectors, partial lines, duplicates, restart/rotation, schema-1 compatibility, history reopen, unsupported commands, telemetry-only adapter rejection, freshness, fixtures versus current ownership, and retained-real-recording replay. Two sanitized native lines are in `tests/fixtures/bridge-native-1.19.4.2.txt`; these are regression fixtures, not new native tests. Raw evidence stays ignored.

Installed docs/ID preflight and generator consistency passed before launch. Agent Tools **4.7.0**, reviewed revision `3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8` (Apache-2.0), was reused through its installed SDK/stdio server. A stale connected transport failed once; fresh stdio succeeded without installation, permission or registration changes. Trigger validation returned valid=true. Emitter/custom-helper validation returned valid=null / parametersChecked=false for unresolved argument blocks; this is not a full semantic pass. The original overlong wire string was caught and corrected before launch. Native interpolation provided the missing execution evidence for emitted values. Local evidence: `.bridge-local/m65-agent-validation-short-wire.txt`, `m65-static-validation.json`, `m65-tests-final.txt`.

## Native evidence and failed budget gate

One HOI4 launch, version 1.19.4.2, new non-Ironman 1936 GER campaign, exclusively owned previously absent laptop profile. No personal saves loaded. Four ordinary campaign operations: assign Basic Machine Tools, increase ordinary speed (two clicks), unpause, and select Prioritize Economic Growth. UI evidence records six setup and ten inspection operations separately: 21 total input primitives, of which five implement the four campaign operations. No command gateway, M3 focus adapter, OCR or console command was used.

Eight owned snapshots were captured while connected: Jan 1 noon through Jan 7 hour 24. PID/creation time, executable hash, profile lease, launch token, log generation and source bytes correlated them to that session. All eight replay exactly after shutdown and all source hashes match the archived log. The full archived log contains 110 snapshots through Apr 19; later offline-parsed records remain unowned historical data. A focus-positive record is not promoted to independent success. Empty error.log is evidence of no reported script error, not proof of all semantics.

**Timing gate failed:** the predeclared hard deadline was 09:27:19 UTC (25 minutes after 09:02:19 launch). Context recovery returned after that deadline; the owned process was terminated at approximately 09:28:35, with last log write 09:28:30.800. This was about 26 minutes, not an in-budget native pass. No further native action or relaunch occurred. The profile was archived and its original absence restored. The new independent watchdog reserves 30 seconds before future deadlines and only terminates the exact PID/creation-time/executable identity; identity/kill rejection tests passed offline. **Its real-game shutdown behavior remains untested.** The stopped M6.5 budget must not be reset to conceal this overrun.

Other limits: new campaign only; load/save reconnect, other countries/mods/patches, completion events and positive focus/research completion readback are unqualified. Per-record owned binding currently repeats OS/executable checks and is slow for backlogs; batch validation is a future read-only optimization, not a reason for another game launch. No FPS or long-campaign performance benchmark is claimed. Current fixed emitter uses eight checks and one line per GER day.

Evidence root: `.bridge-local/native-dR04YQ/`. `offline-review.json` inventories hashes, dates and actions. Key captures: `ui-evidence/initial-campaign.png`, `research-slots-actual.png`, `research-assigned.png`, `factory-counts.png`, `focus-before.png`. `research-slots.png` was an incidental decisions-panel inspection, not research proof. `focus-progress-check.png` has a news popup obscuring the focus; it does not prove completion.

- Owned JSONL SHA256: `d80698acfe11c856e7ffd9115c81a5bb041f4d67b54a442cc6a512c959876b59`.
- Archived game.log SHA256: `b32cd41972f7d94a0eefac733465f988421231c52ad1bfd8125ee785bc725fcf`.
- Executable SHA256: `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037`.

## Run, install and diagnose

Use the repository skill `.agents/skills/hoi4-game-bridge/SKILL.md`. No further M6.5 game launch is authorized by this report; its budget is stopped. To review the existing recording without HOI4:

```powershell
node --import tsx server/cli.ts --bridge inspect
node --import tsx server/cli.ts --bridge replay .bridge-local/native-dR04YQ/observations.jsonl
node --import tsx --test tests/telemetry-m65.test.ts
node --import tsx scripts/bridge-generate-telemetry.ts --check
npm run bridge:validate -- "C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV"
```

In the companion, Command center → Your observed campaign → Open snapshot recording accepts the JSONL; expand **Expanded scripted observations** and select different snapshots. A `.hoi4` save cannot be renamed into a recording. The compiled/browser service still defaults to Observer. For a separately configured telemetry reader, set unique `HOI4_DATA_DIR`, exact `HOI4_GAME_DIR`, `HOI4_BRIDGE_MODE=telemetry` and `HOI4_BRIDGE_LOG`, then use existing `--bridge poll`, `--bridge export` or HTTP equivalents. An ordinary reader's recent log is not owned live proof. There is no automatic game attachment or background exporter in the packaged UI.

Mod source is `mods/hoi4-companion-telemetry/`: descriptor, `common/on_actions/hoi4_companion_telemetry.txt`, and `common/scripted_effects/hoi4_companion_telemetry.txt`. Descriptor 0.2.0 says 1.19.*, but this manifest is accepted **only on 1.19.4.2**. For a future authorized disposable test, `scripts/bridge-prepare-native.ts --empty-user-root <recognized-ABSENT-default-profile> --telemetry-m65` copies both scripts, substitutes a unique producer, writes a local `.mod` descriptor and selects only it in the exclusively owned profile. Review its plan, then use `bridge-observe-native.ts launch|poll|status|count|stop RUN`; no input adapter is registered. Stop latches commands; explicitly close the owned game before `bridge-prepare-native.ts --restore RUN/profile-lease.json`. The helper refuses existing profiles and existing games. Do not remove a regular profile to make it work.

For a user-managed installation with an existing profile, create a separate launcher test mod/playset and disposable campaign, copy only the mod source into that dedicated mod, and enable it only there; never replace regular dlc_load/settings files. That manual-playset/load workflow is not native-qualified here. No current laptop playset remains enabled after cleanup. Archived installed copy: `.bridge-local/native-dR04YQ/owned-game-profile/mod/companion_telemetry/`.

Troubleshooting: version mismatch → inspect installed patch and stop; do not relax manifest validation. Missing records → verify human GER, dedicated mod and actual game.log, then inspect error.log. Unexpanded fields → retain source/line and debug against installed docs before native retry. Stale/disconnected → retain historical status; do not rewrite capture times. Closed MCP transport → one documented stdio fallback. Preserve diagnostics at limits rather than repeating launches.

## Application build and next milestone

Source/artifact **d07ff2502542**: `C:/Users/conno/Documents/HOI4 Companion Development Builds/M6.5-d07ff2502542/M6.5-d07ff2502542-windows-x64.zip`.

- ZIP SHA256: `fef12ed0b6a8adb2781b8a2658edb257bc90f97462d2cd6ba695fe33689d02c7`.
- Extract all into a new folder; run `win-unpacked/HOI4 Companion M6.5-d07ff2502542.exe`. Keep every supporting file together. The folder contains START-HERE.md and M6.5-native-recording.jsonl (eight real historical snapshots, local paths reduced to basenames). No Node/Git/MCP/server setup is needed for review.
- Dedicated storage: `%APPDATA%/HOI4 Companion Development/M6.5-d07ff2502542/`. No older app data migration/overwrite. No update or release published.
- Build passes (TypeScript/Vite/service/Electron). All **74 files** match fresh extraction; packaged ASAR runtime bytes match compiled source resources. **Two actual packaged workflow checks passed**: installed references plus v2 import/numeric display/false-to-true research transition, then service shutdown and persisted history after restart. Tests used a temporary data directory, removed developer PATH/Node overrides, retained Electron sandbox/context isolation, and launched from outside the checkout. Screens reviewed; owned app processes closed.
- Evidence: `artifacts/qa/telemetry-package-2026-11-06T09-43-03-204Z-4525df07/`; harness `scripts/telemetry-package-smoke.ts`. This is laptop engineering validation, not user desktop acceptance or a native game launch.
- `npm run browser` runs the same compiled service/UI in an external browser with Node. The package embeds the service/runtime, includes resources and isolates data by build label. Neither automatically attaches to a game or enables commands. Recorded review needs no telemetry mod.

M6.1 ZIP SHA256 still `90a83c1946811cb08a2a28c0d8e533f91460b2e30671da91d8542b25ce99eb18`. No M6.1 runtime, branch or user data was overwritten. Broad QA-LEDGER gates, main-desktop compatibility and M6.1 user acceptance remain open.

Git audit of reachable source history found no credential-pattern findings, suspicious paths or large blobs; only the two pre-existing app icons are binary. Private repository verified via the existing authenticated Git credential after the GitHub connector returned 404. Final documentation checkpoint is followed by a normal push of only feature/hoi4-telemetry-m65; exact remote equality receipt stays ignored locally. No merge, force push or release.

Next: qualify read-only text-save focus/current-progress and complete research coverage, plus new-game/load/restart behavior; first optimize owned backlog checks and exercise the deadline watchdog without a native game. Review a separate bounded native plan only after deterministic checks. Active Basic Machine Tools now offers useful independent state for a future research-assignment adapter, but no slot identity or control adapter is qualified. Focus selection is still blocked on current-focus observation and the separately unresolved M3 input-recognition gate. Do not infer selection success from completed-focus flags.
