# M7.2.1 — native verification recovery

2026-11-08. **Recovery succeeded within its defined scope:** repaired paired supervision ran against HOI4, Basic Machine Tools was independently observed going from unassigned to researching, the captured save agreed on that assignment, and deadline-triggered shutdown was confirmed. This is one GER/technology capture, not complete research/save/lifecycle qualification.

Existing branch `feature/hoi4-native-m72`, recovery baseline `e5e02d8`; preflight implementation committed as `df988c1`. M7.1, the AI planning coverage gate, final-release explanation contract, previous builds and all older native budgets remain separate and unchanged. No new control adapter, executable modification, memory access, injection or game-script expansion.

## Watchdog preflight

The original M7.2 failure and stopped budget remain in `.bridge-local/native-6Ne9oj` and `m72-native-budget.json`. Its retained two-process experiment produced EPERM replacing a heartbeat file. The recovery tests exercise the repaired append/read pattern and atomic shared-budget replacement, rather than repeatedly reproducing the already diagnosed obsolete implementation.

Extracted the existing production I/O lifecycle into `server/bridge/native-supervisor.ts`, called by the native watchdog and disposable-process tests. The native CLI still requires its owned HOI4 identity/profile/plan; there is no production synthetic-process option. Readiness receipts now use the existing atomic JSON writer. `--telemetry-m721` selects a separate 1-launch/4-action/12-minute plan and 540-second paired deadline.

All **13** preflight tests passed, including real independently spawned Windows supervisor pairs and:

- startup/readiness session, PID and deadline matching;
- concurrent heartbeat append/tail reads and repeated shared budget writes;
- exact Windows creation-time and executable identity;
- deadline termination, emergency stop and peer disappearance;
- refusal of a wrong process lifetime while unrelated processes survive;
- corrupt-budget failure with retained meaningful trigger details;
- partial heartbeat records and monotonic stale/frozen/foreign peer checks.

Evidence: `.bridge-local/m721-supervisor-preflight.txt`; production-lifecycle receipts in `supervisor-e2e-i1uT2P` (deadline), `TcJqco` (stop), `GLBv0i` (peer loss), `tTCEvU` (wrong identity), `qLUsS6` (corruption), each under `.bridge-local/` with the full `supervisor-e2e-` prefix. TypeScript passed before launch. All disposable preflight children were cleaned up. Synthetic tests did not grant native qualification.

## Native identity and budget

Raw evidence: `.bridge-local/native-lCPDJC/`. Plan: `M721-NATIVE-PLAN.md`; `plan.json` and `observation-session.json` retain exact configuration.

| Item | Observed value |
|---|---|
| Installed version | HOI4 1.19.4.2, launcher `Operation Postern v1.19.4.2.2da5 (0bdb)` |
| Disposable game/save version | `Operation Postern v1.19.4.2.2da5 (4315)`; dedicated telemetry mod active |
| Executable SHA256 | `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037` |
| Owned session | `b6658acf-cad8-4c3a-a9c3-251a96f9cb0a` |
| Producer | `149be6c8-6935-422f-bca6-ca9f6fc9a62c` |
| Game PID / creation FILETIME | `31900` / `134385967966839006` |
| Supervisors | Primary PID 12660; backup PID 32444 |
| Launch reservation | 2026-11-08 **07:33:16.677 UTC** |
| Configured deadline | **07:42:16.677 UTC** |
| Termination confirmation | **07:42:20.295 UTC** |
| Wall-clock consumption | **543.618 seconds (9m 3.618s)**, below 12-minute hard limit |
| Inputs | **4 gameplay actions; 18 total UI inputs**, including 14 setup/inspection inputs; 25 captures |

Four gameplay reservations, recorded before dispatch: assign Basic Machine Tools (07:36:48.095), unpause (07:36:57.389), pause (07:37:39.119), save (07:38:10.776), all UTC. Campaign/menu selection and panel inspection were bounded setup inputs per the reviewed plan. One inspection opened International Market; it was recorded and corrected by selecting the visibly identified research notification. No gameplay consequence and no unchanged failed-operation retry. Inputs finished before minute six; the game remained paused until supervision expired. No extra launch, reload or budget reset.

## Independent research comparison

`M721-RESEARCH-EVIDENCE.json` is a compact version-controlled evidence manifest; original screenshots, logs, save and comparison receipts remain ignored locally. Screenshots were read directly from the running game's research UI, independently of the parser and telemetry.

| Evidence | Result and scope |
|---|---|
| `ui/012-open-research-notification.png` | 12:00, 1 January 1936; four empty research slots |
| `ui/016-assign-basic-machine-tools.png` | Basic Machine Tools displayed as active research, three empty slots |
| `ui/020-pause-research-state.png` | Paused at 08:00, 2 January 1936; assignment still displayed |
| `ui/024-saved-state-research-readback.png` | Same paused date after save; Basic Machine Tools with three empty slots |
| Owned telemetry | `technologyResearching.basic_machine_tools`: **false → true**, two source-hashed records with matching owned session/producer |
| Plaintext save | `countries/GER/technology/slots/basic_machine_tools` present; saved date `1936.1.2.8`, player GER |
| Raw research points | `2.02`; retained without percentage or time conversion |

The save is `owned-game-profile/save games/GER_1936_01_02_08.hoi4`, SHA256 **`3a69b4bd645a8299905503b39492c211504dfba92b26c56c77e34944ed627c8c`**. Installed `common/technologies/industry.txt:3` and `localisation/english/research_l_english.yml:345` independently connect the identifier to the displayed English name; their file hashes are retained in `research-qualification.json`.

The first telemetry record is `1936.01.01.12`; the second is `1936.01.01.24`. The latter predates the paused save/UI by **eight game hours**. This is daily observation cadence, not a synchronous full-world snapshot. The unchanged assignment is independently visible before and after; no claim that every telemetry value equals the later save/UI is made. After remaining paused, telemetry correctly ages to stale. The entire recording is historical after process exit.

**Qualified:** this captured save's positive Basic Machine Tools research membership, plus reconfirmation of the previously qualified GER telemetry flag transition on this executable. **Not qualified:** serialized position as UI slot identity, progress units, numerical optimization, technology completion, entire research inventories, absence-based completeness, focus state or save/reload world identity. The raw total `4` also matches the UI, but no general total-count mapping is newly promoted here.

Generic `researchAssignments` contains mixed dimensions (technology, serialized position and raw points), so the unchanged shared save reader correctly keeps that aggregate **parsed-unqualified**. The scoped verified membership lives in the explicit evidence receipt; arbitrary future saves are not automatically blessed. UI/MCP schemas and capability declarations are unchanged. This avoids qualifying untested subfields or adding a release/runtime interface solely for one capture.

## Native deadline and cleanup

Both supervisors entered their deadline path. Backup receipt: `reason=deadline`, `outcome=terminated`, matching exact session/PID/creation-time/executable; termination confirmed 3.618 seconds after the configured deadline. Independent OS inspection found the game and both supervisors absent; desktop window enumeration found no HOI4 window.

Primary receipt: `reason=deadline`, `outcome=refused`, `Owned handle termination failed`. This is consistent with two simultaneous termination attempts, but the exact competing-call failure was not independently diagnosed. **Only the backup's successful termination is claimed.** Both complete receipts and hashes are retained. No retry or additional native session was needed to establish deadline enforcement.

The default laptop profile had been absent. After confirming no game process, the existing lease helper archived only the owned profile and restored that absence; `cleanup-receipt.json` records it. Saves, mod copy and logs remain in the archive. No personal profile, save, normal playset, installed game files or unrelated app was modified. `m721-native-budget.json` is stopped at one launch/four actions. Earlier M72/M6.5 budgets and failure records remain intact. `error.log` is empty; an engine Conflict Risk message in `game.log` is retained without attributing unrelated semantics to it.

## Offline checks and integration handoff

With HOI4 closed, both recorded snapshots replayed exactly. Original log-line hashes, all 25 screenshot hashes and archived save hash/parsed values matched. Evidence: `offline-review.json`, `.bridge-local/m721-offline-review.txt`. The first review-script invocation supplied a relative save path and was rejected by the existing absolute-path requirement; correcting the test invocation resolved it without product changes or a native retry.

All **seven** focused save/real-stdio-MCP/HTTP compatibility tests passed (`.bridge-local/m721-compatibility.txt`), in addition to the 13 safety tests and TypeScript. No broad regression loop, explanation census rerun or Windows package was needed: application-facing behavior/resources are unchanged, and the prior M7.2 build remains the user-testable artifact.

For M7.3, offer the captured positive research fact as source-backed **historical context**, with exact source hash, game version, capture time, session ID and scope. A future explicitly reviewed adapter may use suitably fresh/world-matched observations to resolve a named “already researching Basic Machine Tools” planning condition. It must preserve manual assertions, unknowns and M7.1's risk-weighted planning gate; no automatic confidence or ranking eligibility promotion. No M7.1 code was imported. Full supported-content mechanics explanation remains a separate final-release gate; M7.5 memory research remains separate.

Recommended next major task: integrate the existing M7.1 planning interfaces and these scoped observation-evidence contracts into an explicitly chosen common baseline for **M7.3 AI-assisted strategic planning**. No further native testing is authorized by this report. More save mappings or reload/world identity need a new bounded plan when justified by a concrete planner requirement.

GitHub connector recheck on 2026-11-08 reports `visibility: public`. Recovery commits remain local per the user's private-only push requirement; no push, visibility change, merge or release. This checkpoint concludes M7.2.1 work.
