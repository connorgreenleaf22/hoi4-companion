# Read-only campaign Q&A pilot

Implementation candidate. An actual ChatGPT connection and two read-only calls passed on November 10, 2026; see EVIDENCE.md. Gameplay usefulness and general country support are **not accepted yet**. No new HOI4 launch was performed during implementation or connection setup.

## Start locally

For a different gaming desktop, use [DESKTOP-SETUP.md](DESKTOP-SETUP.md) and the isolated transfer kit. The companion, log and tunnel runtime must be on that gaming PC. Stop the old PC's runtime before reusing the same tunnel. The source-based instructions below remain available for development checkouts.

Use Node 24 and this isolated checkout. Dependencies are unchanged from M7.3.1. On a fresh checkout run `npm ci`; then:

```powershell
npm run build
node --import tsx scripts/campaign-qa/prepare.ts
node --import tsx scripts/campaign-qa/start.ts --index
```

The last command reads installed references into a separate `.bridge-local/qa-app` database, prints the local monitor URL and stays running. Subsequent starts may omit `--index`. Open the printed URL. Nothing starts recording until **Start recording** is clicked. Keep that terminal open; Ctrl+C stops this service and preserves records. This is the development pilot, not a replacement for the installed companion or a release-qualified Windows build.

The preparation command creates a new ignored mod package and prints its producer token. It never edits the game installation, normal profile, launcher database, settings or saves. Keep the generated package in place. In the launcher, register its descriptor and select it only in a **new dedicated playset** named “Companion observation pilot”. Preserve the previous playset selection. Do not enable the old GER telemetry prototype alongside it. Use a new throwaway campaign and a distinct save name; never overwrite a personal save. Do not reuse earlier native test helpers: their user-directory isolation failed on some setups.

The monitor requires an existing dedicated-profile `game.log`, exact installed version 1.19.4.2, the generated producer token and selected three-character country tag. At the main menu, choose the 2-minute smoke test, confirm the dedicated single-player checkboxes, and start recording **before starting a new campaign**. The reader starts at EOF and waits for a new startup marker. If the engine does not emit that marker at the campaign boundary, stop and retain diagnostics; do not bypass the boundary or claim live state. A new package/producer should be used for each separately qualified country campaign.

## Secure ChatGPT connection

Account status: the user-approved **HOI4 Campaign Q&A** tunnel is associated with the intended workspace and connected as a personal ChatGPT plugin. Official tunnel-client v0.0.20 discovered exactly six read-only tools, and ChatGPT successfully called session/diagnostics. The initial runtime key is restricted to Tunnels Read/Use and expires after one day; renewal is user-controlled. Local ignored setup artifacts contain the machine-specific profile and helper. Do not publish them.

Use [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) with the official [latest tunnel-client](https://github.com/openai/tunnel-client/releases/latest). Create a tunnel in [Platform settings](https://platform.openai.com/settings/organization/tunnels), associate the intended ChatGPT workspace, and provision the restricted runtime key locally. Creation needs Read/Manage; use needs Read/Use. Do not paste credentials into chat or command arguments.

Set `HOI4_QA_CONNECTION` locally to the printed **campaign-qa-connection.json** path. Keep `CONTROL_PLANE_API_KEY` in the client process environment using secure local entry. Configure the client with its current `help quickstart`, using:

```text
tunnel-client init --sample sample_mcp_stdio_local --profile hoi4-qa --tunnel-id <your-tunnel-id> --mcp-command "node <absolute-path-to-build/campaign-qa-mcp.cjs>"
tunnel-client doctor --profile hoi4-qa --explain
tunnel-client run --profile hoi4-qa
```

Paths containing spaces need the quoting required by the installed client's help. The stdio child must inherit `HOI4_QA_CONNECTION`. In ChatGPT Plugins, add the custom MCP server using **Connection: Tunnel**. Keep the client running during discovery. Check the catalog contains exactly the six `hoi4_qa_*` tools documented below, then ask for session status. Save the result locally. This is setup evidence only.

Never tunnel `bridge-mcp.cjs`, the existing `/bridge/mcp` endpoint, an entire companion HTTP service, or a general HTTP/shell executor. No public URL, reverse proxy, firewall opening or LAN listener is needed. The Q&A adapter speaks stdio to the client; its separate random credential authorizes only the local Q&A query endpoint. The original credential and 15-tool catalog remain separate. Stop the tunnel client when the experiment ends; revoke its runtime access when no longer needed. The companion rotates its Q&A token on restart and removes its own descriptor on graceful shutdown.

Before tunneling, run `node --import tsx scripts/campaign-qa/smoke.ts <absolute-Q&A-descriptor-path>` to test the **built** stdio adapter locally. It invokes all six tools, checks the catalog and refuses a bridge-control name, then retains sanitized responses under `.bridge-local/qa-smoke-*`. This does not verify a ChatGPT connection or gameplay usefulness.

If setup is unavailable, use **Download sanitized observation snapshot** in the monitor and attach the reviewed JSON to ChatGPT. This carries the same `hoi4-campaign-qa/1` interface, but observations are explicitly historical. It excludes local paths, producer tokens, raw save/log contents, arbitrary diagnostic text and credentials. Keep the full archive locally.

## User-controlled recording

After the smoke test succeeds, start a separate 30, 45 or 60 minute recording and begin the intended new pilot campaign. Play normally. Do not automate actions or change saves to make the test pass. Keep the panel visible and use **Stop recording** any time.

The current capture deliberately refuses multiplayer, unexpected country/producer/schema, unsupported versions, date rollback, lost files and storage limits. A country switch requires a fresh recording. Same-date reloads remain unqualified; stop before loading another save and restart at an observed boundary. Paused/no-new-record intervals are reported as stale, not as proof of a broken connection. The game may emit daily records faster than wall-clock sampling; missing-day estimates are heuristic, not authoritative dropped-event counts.

Bounds: 5-second sampling; at most 256 KiB read per sample; 64 MiB source-log limit; 32 MiB raw capture limit; 4 MiB raw-file rotation; 60 MiB combined append storage, with room for a final report; 10,000 accepted observations; 200 observations in the query window. Duration is enforced with a monotonic clock. No background recording resumes after app restart. Raw files and reports live under the printed `qa-pilots/<run-id>` directory in the isolated companion data directory.

Stopping ends monitoring and request auditing. **It does not stop the game-side mod logger.** Exit the pilot campaign, deselect the pilot playset and restore the previous playset selection yourself. Do not delete or rotate the game's own log during capture. Raw records are retained; cleanup never removes personal files or kills HOI4. A crash may leave no final report; retain manifest/raw/JSONL as an interrupted run, not a completed session.

## Qualification and usefulness gates

Run short independent captures for **two different countries** (suggested GER and POR), comparing the displayed country/date, PP, stability, war support, factories and manpower with emitted values. Record screenshots or manual readings with timestamps locally. Fixture parsing of two tags is not native evidence. Mark each field verified only for the exact comparison/version; no automatic promotion is implemented.

Use a stable plaintext save **copy** for focus/research detail when available. Save inspection is explicit, local and read-only, reuses the existing 1.19.4.2 reader, and refuses binary/compressed saves. It cannot establish that this is the currently loaded save. Absence of a focus token is not proof of no focus; serialized research slot order is not a verified UI slot index.

Take baseline and during-recording readings using the same game speed/scene and hardware metrics: HOI4 CPU from Task Manager, frame rate/frame times from the user's existing method, and perceived stutter. Store them with **Save local note**. Automatic metrics cover the whole companion process CPU/RSS and sample duration; they cannot establish causal HOI4 performance impact. The report labels those missing measurements unavailable. Requests that never reach the local server need separate local tunnel-client diagnostics; do not infer zero tunnel failures from the server count.

Use [EVALUATION.md](EVALUATION.md) for the three-to-five-question paired comparison. The pilot is successful only after a real captured session supports a practically better answer and the user explicitly confirms the improvement.
