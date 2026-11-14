# Milestone 6.5 read-only telemetry review

Keep HOI4 closed. This is a separate unsigned Windows x64 development build; M6.1 acceptance remains independent.

1. Extract the entire M6.5-<commit>-windows-x64.zip into a new folder. Run `win-unpacked/HOI4 Companion M6.5-<commit>.exe`. Keep supporting files together; do not overwrite an installed app or older build. No Node, Codex or separate server is needed.
2. Storage is isolated under `%APPDATA%/HOI4 Companion Development/M6.5-<commit>/`. Do not override HOI4_DATA_DIR with existing app storage. Source indexing only reads the installed game.
3. Check **Sources & settings** for the actual installation/version. Expanded live telemetry is qualified only for human GER on 1.19.4.2. Historical imports remain readable on a machine without that running campaign.
4. Open **Command center → Your observed campaign → Open snapshot recording** and choose the separately supplied `M6.5-native-recording.jsonl`. It is eight historical observations from the laptop disposable campaign, not your desktop save. A .hoi4 file is not JSONL. The app does not create live data merely by starting HOI4.
5. Expand **Expanded scripted observations**. Select Jan 1 noon and Jan 7 hour 24. Check war support .35, slots 4, military 28 and dockyards 10; civilian count changes 35 → 37 (includes trade). Under Technology currently researching, basic_machine_tools changes No → Yes. Focus at capture must remain unavailable. Listed IDs are a subset; positive completion and event feeds are not independently qualified.
6. Confirm the panel says imported/historical and no owned session connected. These records do not overwrite manual plans. Close/reopen and select the saved recording again; all eight snapshots should persist.
7. Report build/commit, game version, steps, expected/actual result and restart behavior. Startup diagnostics are under this build's data/diagnostics directory. Stop unchanged failed retries; keep older apps and all saves/mods/playsets untouched.

`npm run browser` uses a separately run Node loopback service and browser. This package embeds that service and runtime in Electron, includes static resources, and isolates data by build label. Neither method attaches automatically to a running campaign, polls without telemetry configuration, or supports gameplay commands here. No mod installation is necessary for this recorded review. See docs/hoi4-bridge/MILESTONE-6.5.md in the source checkout for qualified fields and developer-only installation procedures.
