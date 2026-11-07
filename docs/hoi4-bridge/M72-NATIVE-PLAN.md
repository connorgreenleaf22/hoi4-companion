# M7.2 first native qualification plan

User-authorized 2026-11-07. One launch, at most eight ordinary gameplay operations, hard maximum twenty minutes. This run deliberately uses an earlier **ten-minute enforced deadline** so shutdown can be independently verified without approaching the hard limit. No old budget is reset. M6.5's recorded overrun remains failed. Exact installed executable SHA256: `bccc62909b6a1ec2c1d5a46ef18608e4d0c7cdc89ad341b7402a23c40f7a8037`; launcher version 1.19.4.2, Operation Postern 2da5 (base checksum 0bdb). Launch preflight rechecks the hash.

Separate worktree/branch from 0620369; the M7.1 checkout remains untouched. Existing default laptop profile was absent and no HOI4 process was running. Reserve it exclusively with the existing lease helper; copy only the repository telemetry mod, write only disposable profile settings, never installed files or a regular playset. Archive the leased profile after confirmed game exit. Raw saves/screenshots/telemetry stay ignored locally.

## Before launch

- Save-fixture tests cover explicit/no focus tokens, stored progress, declared completion, assigned/empty research slots, repeat reads and malformed fields. Fixtures prove parsing only.
- Deadline preflight tests exact process creation identity, independent deadline shutdown, stop/failure behavior, stale/frozen/foreign peer heartbeats and protection of an unrelated process. Two independent native supervisors monitor one another and the immutable deadline; either peer disappearing/stalling causes the survivor to stop only the exact owned game process.
- Windows computer-use window discovery succeeds. No security/authentication dialog is operated.
- Prepare `--telemetry-m72`; keep `m72-native-budget.json` separate. Both supervisor readiness receipts must match the owned session before input. A new native launch is prohibited after a failed/exhausted attempt.

## Prioritized operations

1. Start a disposable non-Ironman 1936 Germany campaign; capture country/date and empty research/focus UI.
2. Create a plaintext baseline save, if feasible.
3. Assign Basic Machine Tools manually; capture independent research UI.
4. Unpause briefly.
5. Pause; capture changed date/research state and telemetry.
6. Create a second plaintext save; compare byte-hashed save paths/values against the paused UI.
7. Reload that owned save if time remains; record UI/date/ownership/log behavior. Do not infer a distinct world epoch merely from process continuity or matching date.
8. Reserve for a necessary pause after load. Focus selection/completion is deferred if it would exceed the eight-operation budget.

Counting follows the user's limit on ordinary **gameplay operations**: new campaign, assignment, each pause/unpause, save and load each reserve one operation. Menu navigation, opening panels and entering a disposable save name are recorded individually as UI navigation; they do not change campaign mechanics. This explicit operation-based count replaces the overly restrictive per-input proposal in M7-NATIVE-PLAN, and does not hide failed/repeated gameplay operations. Two attempts maximum per unchanged failing operation; stop that target after two. No console, control adapter, cheats, memory, injection or UI action unrelated to this owned test.

Prioritize assignment + independently compared save over breadth. If startup consumes time, omit later operations and report blockers. Stop ordinary work at minute nine; let the independent ten-minute deadline terminate the exact owned HOI4 process. On earlier danger/error, latch stop immediately. Inspect both receipts and OS process identity after exit. No need to spend twenty minutes or restart to qualify another field.

## Qualification rules

Match same paused state using source path/hash, exact game/executable version, screenshot and wall-clock capture time, game date, owned session ID and producer identity. Distinguish sample-specific verification from a general parser mapping. Empty/missing focus token is not proof of no selection. Serialized research positions are not UI slot identities; raw points/progress are not percentages. Positive technology levels do not prove a completion event or a complete inventory. Replaying a save/recording never makes it live.

Never write or import M7.1 planning coverage code. Record how future consumers could use each independently qualified field as a candidate fact, subject to matching country/version/world/freshness and explicit reconciliation. Neither a native-verified label nor fresh telemetry changes a manual assumption, plan confidence or ranking eligibility. Same-date load remains unqualified unless this session establishes a reliable independent marker; conservatively disconnect/quarantine after a known load.
