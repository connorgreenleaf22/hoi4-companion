# Germany desktop pilot — read-only development kit

This kit contains the built observation service, six-tool MCP adapter and official Secure MCP Tunnel client. It does not include Node, credentials, game files, observations or saves. It does not install a mod, modify a playset, launch HOI4 or start recording automatically. This is a development pilot, not a replacement for your installed companion.

## 1. Prepare this desktop

1. Install **Node.js 24 LTS, Windows x64** from https://nodejs.org/en/download (select 24 in the version menu). The kit was built with Node 24.21.0. Open a new terminal after installation.
2. Extract the entire kit to a stable local folder, such as `Documents\HOI4 Q&A Pilot`. Do not run it from inside the ZIP. Keep the original ZIP for verification and never overwrite an earlier pilot folder.
3. Double-click **Prepare Pilot Mod.cmd**. It creates a new package under `.bridge-local\qa-mod-<producer>` and prints its descriptor path and producer token. Keep that output. Paths are generated on this PC.
4. Double-click **Start Observation Service.cmd**. Keep its window open. It indexes installed references into this kit's separate `.bridge-local\qa-app` folder. Open the printed `Local pilot panel` URL. Recording must say **idle**.

If HOI4 is installed in a nonstandard location and discovery fails, stop here and provide the installed game folder for diagnosis. Do not set HOI4_USER_DIR expecting it to redirect the game: it only configures the reader. Previously tested userdir launch flags failed to isolate the game's profile.

## 2. Connect the desktop to the existing ChatGPT plugin

1. Stop the tunnel on the previous computer. Run only one runtime for this tunnel during the pilot.
2. In OpenAI Platform Tunnels, copy the existing **HOI4 Campaign Q&A** tunnel ID. Do not create a duplicate plugin or a public URL.
3. Obtain a runtime API key limited to **Tunnels Read + Use**, with a short expiration. The initial setup key expires after one day. Enter it only locally; never put it in chat, a file, a command argument or a screenshot. No admin key is required.
4. Double-click **Connect Secure Tunnel.cmd**. It first tests all six local tools and verifies a control tool is rejected. Enter the tunnel ID, then enter the key at the hidden prompt. Keep this window open; Ctrl+C stops the tunnel. Logs remain under `.bridge-local\qa-tunnel`.
5. If Windows blocks the reviewed PowerShell script, report the exact error. Do not disable system-wide execution policy, antivirus or firewall protections to make the pilot work.
6. In ChatGPT select **HOI4 Campaign Q&A**, then ask: “Call session and diagnostics. Is recording active, are campaign observations available, and is gameplay execution available?” Expect idle/no observations/no execution before recording. Repeat this on the desktop even if the connection passed on another PC.

The adapter's “No authentication” option means no additional MCP OAuth flow; Secure MCP Tunnel still authenticates runtime access and the selected ChatGPT workspace. Only the dedicated Q&A stdio adapter is exposed. No public game-data endpoint or inbound port is needed.

## 3. Add the mod to a dedicated playset

Keep HOI4 closed while preparing the launcher. Record the name of the currently selected playset. Create a new playset named **Companion observation pilot** and enable only the generated **HOI4 Companion Player Observation Pilot** mod (plus explicitly recorded dependencies, if needed). Do not enable the old GER telemetry prototype.

The generated `companion_player_telemetry.mod` descriptor points to the generated mod folder. To register it, close the launcher and copy **only that descriptor** into the active HOI4 user profile's `mod` folder, using a new filename such as `companion_player_telemetry_<producer>.mod`. Never overwrite an existing file. The usual location is your Windows Documents folder under `Paradox Interactive\Hearts of Iron IV\mod`; Documents may be redirected to OneDrive. Keep the generated mod directory in place. Reopen the launcher and find **HOI4 Companion Player Observation Pilot** under installed mods, then add it only to the new playset. If the active profile is unclear or the mod does not appear, stop and ask for help; do not replace an existing mod or edit the launcher database. The preparation script intentionally does not register the mod or change playset selections for you.

A separate playset does **not** isolate saves or settings. Preserve your normal configuration and saves before launching a campaign. Use a new non-Ironman 1936 Germany campaign and a unique pilot save name. Confirm the autosave location/behavior before progressing time so the pilot cannot overwrite an existing autosave. If a separate verified profile is unavailable, keep personal saves backed up and use a reviewed user-controlled autosave setup; do not assume userdir flags work. Do not load a personal save for this smoke test.

## 4. Two-minute smoke test — user controls the game

1. Launch the game yourself using the dedicated playset. Stop at the main menu. Verify game version **1.19.4.2**, note checksum/DLC/playset, and locate the actual active `logs\game.log`. Do not create a substitute log or select an old recording.
2. In the monitor enter that log path, the generated producer token and **GER**. Select **2-minute connection smoke test**. Only check the dedicated-playset/single-player attestations after confirming them.
3. Click **Start recording**, then start a **new** 1936 Germany campaign. The monitor starts at EOF and must see a new startup marker from this producer before it accepts observations. If it waits indefinitely or stops with an error, retain the diagnostics and stop; do not bypass the marker.
4. Allow a few in-game days at a comfortable speed, then pause. Compare recorded country/date, political power, stability, war support, factories and manpower against the UI; note rounding and unavailable fields. No missing field is assumed zero. Use **Save local note** for comparisons and the displayed game date.
5. Let the two-minute limit expire or click **Stop recording**. Confirm a local report exists and observations are retrievable in ChatGPT. New pilot observations remain parsed/unqualified historical evidence until independently checked; fresh timestamps alone do not establish owned live state.

## 5. Start the longer recording only after review

After the smoke test is inspected, choose 30, 45 or 60 minutes. Start recording before starting a new campaign so a fresh startup marker is captured. Do not continue the smoke campaign into a new recording without a qualified boundary. Keep monitor Start/Stop visible. Record baseline and during-game CPU/FPS observations yourself; automatic metrics cover the companion, not HOI4 performance.

Pick 3–5 practical questions before collecting answers. Use EVALUATION.md to compare ordinary ChatGPT advice with answers based on the same captured game state. Working transport is not the acceptance criterion. Germany alone cannot establish general country support; a separate country verification remains necessary.

Stop in this order: **Stop recording**, exit the pilot game, restore the previous launcher playset/configuration, Ctrl+C in the tunnel window, then Ctrl+C in the service window. Stopping the monitor does not disable game-side logging. Keep the entire `.bridge-local` folder locally; it contains raw evidence and diagnostic paths and must not be publicly uploaded. Use the panel's sanitized snapshot download for a reviewed fallback attachment.
