# Native smoke procedure

Verified on Windows HOI4 1.19.4.1 in the bounded session recorded in EVIDENCE.md. This is a telemetry test, not native action-gateway acceptance.

## Profile protection

The tested strategy exclusively reserves the default HOI4 Documents profile ONLY WHEN IT DOES NOT EXIST. It refuses any existing folder (even empty), and refuses preparation/restoration while any HOI4 process runs. Never remove, rename or empty a personal profile to make this helper work. Machines with an existing profile need a different reviewed isolation method.

`HOI4_USER_DIR` configures the bridge reader only; it does not redirect HOI4. Both tested userdir command-line variants failed and must not be reused blindly. Do not create userdir.txt in the installed game.

## Bounded procedure

1. Verify branch, STATUS, game version and no running game. Record a budget of two launches, twenty inputs, twenty active minutes and two attempts per unchanged failure.
2. Prepare with `npm run bridge:prepare-native -- --empty-user-root '<ABSENT default Documents/Paradox Interactive/Hearts of Iron IV>'`. This creates a unique `.bridge-local/native-*` run, an ownership marker/lease, a dedicated mod selection and generated producer identity. It never launches the game. If preparation fails after reservation, retain the run and restore using its lease after inspection.
3. Review its `plan.json`. Launch the installed executable from its game directory with the recorded `-debug_mode -gdpr-compliant` arguments. Record the returned PID and start time. Check that only the owned profile is used and the unique producer marker appears in game.log. Do not attach to another process.
4. Create a 1936 GER non-Ironman campaign. Allow two daily ticks and pause using the visible time control. Record screenshots and complete raw telemetry lines. The tested engine emitted dates with hour 24; compare UI PP with display rounding and stability as a percentage. Do not rely on dispatched keyboard shortcuts without readback.
5. Set `HOI4_DATA_DIR` to `<run>/bridge-db`, `HOI4_BRIDGE_MODE=telemetry`, and `HOI4_BRIDGE_LOG` to the owned profile's `logs/game.log`. Run `npm run dev -- --bridge poll` after each emission. Use `npm run --silent dev -- --bridge export > <run>/snapshots.jsonl` for clean JSONL without npm's script banner.
6. Exit the owned campaign through the UI, verify its process has exited, then run `npm run dev -- --bridge replay <run>/snapshots.jsonl`. Compare snapshot identities, values and timestamps with the export. Replay never authorizes control.
7. Archive the owned profile with `npm run bridge:prepare-native -- --restore <run>/profile-lease.json`. The helper verifies the marker/directory identity and refuses an occupied evidence destination. It moves artifacts, deletes nothing, and returns the normal profile to its prior absent state. Check that no game remains and record counts/outcomes.

The successful session used one launch, sixteen inputs and 5m21s. The earlier failed isolation session is separate retained evidence. No control adapter is registered; do not add command tests to this procedure without a separately qualified adapter and authorization.
