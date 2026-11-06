# Proposed M7 native qualification — not executed

This is the next game-dependent gate, after offline platform and packaged checks. No M7 HOI4 launch is included in current evidence. Review the plan before execution; it does not authorize memory experiments. M6.5's 25-minute overrun remains failed and its stopped budget must never be reset.

## Limits and protection

One launch, at most eight ordinary gameplay operations, twenty minutes from launch reservation, two attempts at the same unchanged failure. Stop ordinary interaction by minute 17; supervisor targets termination at 19:30, reserving 30 seconds for OS shutdown. One disposable 1936 GER campaign on exact 1.19.4.2 and recorded executable hash. No control adapter, console cheats, memory reads/writes, hooks or DLLs. No regular playset, installed game files or personal saves touched.

The existing helper only supports a previously absent recognized default laptop profile. If a profile or unrelated HOI4 process exists, refuse preparation; do not move it aside. Inspect installation/hash first. `--telemetry-m7` produces a separate `.bridge-local/m7-native-budget.json` path; M6.5 budget stays stopped. Do not recreate an exhausted M7 budget for a retry.

## Preconditions and sequence

1. Inspect STATUS, current branch, budget and game process inventory. Run the three deadline tests once if watchdog code/environment changed. Retain their output. Confirm no previous owned session remains.
2. Prepare the absent profile with `npm run bridge:prepare-native -- --empty-user-root "ABSENT_DEFAULT_PROFILE" --telemetry-m7`. Review generated plan, source hash, producer token, lease and exact executable hash before launch. This step itself changes only the new disposable profile.
3. Launch with `node --import tsx scripts/bridge-observe-native.ts launch "RUN"`. The helper must receive matching `watchdog-ready.json` within ten seconds; startup failure latches stop and stops its owned child. Confirm receipt deadline before any game interaction. The independent supervisor watches stop/corruption and wall/monotonic time, and verifies exact creation FILETIME/executable using a retained OS handle before termination.
4. Reserve each ordinary operation with `... bridge-observe-native.ts count "RUN" "label"` before acting. Proposed eight operations: start disposable GER campaign; open focus view; assign one focus manually; open research view; assign Basic Machine Tools manually; advance and pause; create plaintext save; load that save. Do not exceed eight to complete a UI journey; count every actual input required by the interaction tool and omit lower-priority steps if its input granularity uses the budget sooner. Save/load qualification is optional if startup consumes the budget. No automatic focus/research command adapter is enabled.
5. Poll through the app or `... bridge-observe-native.ts poll "RUN"`. Capture at least two distinct game dates. Compare displayed country/date/PP/stability/war support/slot count and the supported research flag. Record exact screenshots, dates, source hashes and unavailable fields. Inspect the disposable text save and independently compare focus identifier, raw progress units, completed focus and research slots/known tech only where the UI provides evidence. Never promote an entire inventory based on one matching item.
6. If a load fits, inspect startup markers and same-date lifecycle. A rollback must quarantine the existing ownership; a same-date load must remain unqualified unless an independently observed marker distinguishes it. Do not suppress quarantine to finish a demonstration.
7. At a failure, deadline or minute 17, run `... bridge-observe-native.ts stop "RUN"`. This sets the shared native budget stop for the independent supervisor. Verify only the owned process exited and preserve deadline receipt. If supervisor refuses identity, inspect OS metadata and report; never kill an unrelated PID by name.
8. After process exit, replay captured JSONL and compare hashes/values with HOI4 closed. Archive only the leased profile with `npm run bridge:prepare-native -- --restore "RUN/profile-lease.json"`; verify the original absence is restored. Record launch/action/time counts and all skipped/unqualified fields.

## Pass conditions

Actual watchdog acknowledgment and bounded shutdown; two distinct real snapshots; matching independent values; unchanged original save hashes; deterministic replay; no personal-data changes. Each field and lifecycle transition receives its own qualification. A timeout or unavailable interface is a blocker, not a reason to relaunch. Synthetic watchdog tests prove scheduling/ownership on test processes, not the actual HOI4 termination path.
