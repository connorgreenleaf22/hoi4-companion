# Milestone 3: owned observation; control qualification blocked

2026-11-04 EST. The native focus-selection acceptance gate did **not** pass. The existing bridge, SQLite storage, gateway, reference index and restricted Agent Tools MCP remain in place. No dependency package, installer, injection, memory transfer or executable change was introduced.

## Implemented interfaces and ownership

`GameBridge` accepts an optional `ownedSession` manifest. Ordinary HTTP/application startup has no manifest or control grant and retains its previous behavior. `scripts/bridge-owned.ts` explicitly constructs the same service and gateway for a disposable test. `observeFocus()` returns the typed v1 snapshot with optional ownership/focus extensions; status reports no live snapshot when ownership fails. Historical snapshots remain available for replay.

An owned launch records a UUID, PID, creation FILETIME as a string, executable path/hash/version, launch timestamp, lease and random producer token. The helper refuses another HOI4 process, an existing profile, an existing log, a reused launch manifest or a different executable. The profile lease binds directory identity and marker; the copied mod emits the unique producer token. The first complete launch marker must occur in a newly created log belonging to that profile. Binding verifies source path, offset, record hash, producer, version and GER country. Subsequent checks compare process identity, log inode/birth time, marker count/position and size. Rotation, truncation, exit/PID reuse, contradictory metadata or stop disconnects the session; established sessions latch quarantine. There is no automatic adoption of a restarted process.

This correlation relies on exclusive ownership of the previously absent profile and a controlled single-player campaign. It is not a cryptographic process-to-log attestation: an external writer with local filesystem access can tamper with files, and outside UI/console input can invalidate campaign assumptions. No multiplayer, country switching, save reload within one session, regular-profile use or arbitrary concurrent controller is qualified. Base log age and focus-capture age remain separate. UI capture never refreshes the PP/date timestamp.

Snapshots retain original game-log provenance, process/log identity, sequence, focus source image/hash/raw OCR, independent capture timestamp and recognition status. `null` with observed status means a recognized idle focus; unavailable means it was not recognized. Recognized UI labels are a narrow UI observation, not a memory-level state API. Replay validates optional metadata and never imports it into live ownership or grants.

## Observation and adapter decision

Installed scripting documentation did not establish a current-active-focus getter. `focus_progress` is insufficient: reviewed Live Tools `telemetry/focus.py` explicitly warns that saved/cancelled progress is not proof of an active focus. The source index supplies declarations/prerequisites only. Text saves are a possible later semantic source but require explicit saving and qualified parsing. For this bounded action, use actual UI capture/OCR, then manually compare its evidence. Research readback is deferred.

Reused Apache-2.0 Live Tools Windows Python modules at `5b9ec1ec7578c37ecf77a4e8a8c96c3a24317dc6`: process metadata, window binding, PrintWindow, Windows.Media.Ocr and ordinary mouse input. The pin is `integrations/hoi4-live-tools.json`; the checkout stays ignored. No upstream installer or entire automation framework was adopted. Existing Python 3.13.14, NumPy and Pillow were used; no new dependency installation. Identity uses query-only process rights; imported native helper code is not used for remote memory reads/writes. OCR hosts close after each operation. Upstream window discovery is wrapped with exact process checks before/after operations to prevent restart adoption.

The opt-in `FocusSelectionAdapter` supports only `focus.select` for `GER_prioritize_economic_growth`, from an independently observed idle state younger than 30 seconds. Reference resolution must be unique, patch-matched, without detected overrides, and match the installed source hash. The gateway checks mode, session, authorization, expected snapshot, capability, shared controller lock and durable request identity. The helper requires the target's open detail and a unique OCR Start button before its one click. A new capture must observe the active target on the Political panel to confirm success. Dispatch alone, an upstream focus timer and progress estimates never count as success. Missing readback is uncertain. Native qualification remains unverified even though the constrained version allowlist is populated for testing.

Constraints: English, GER, 1.19.4.1, executable SHA256 `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`, logical 1280x720 at 125% Windows DPI (physical client 1600x900). On this machine PrintWindow returned a logical render within a larger padded bitmap. Crops use that observed layout; the input scaling path has **not** been exercised. Other DPI/capture arrangements must fail qualification rather than inherit these coordinates.

## Native evidence and blocker

Run `.bridge-local/native-HN3JuU`, 02:59:11–03:05:16 UTC Nov 5 (21:59:11–22:05:16 EST Nov 4), owned PID 32788, session `29963b91-2a19-4481-856e-07952fbecca4`. One launch; 20 input reservations: 19 setup/exit UI inputs and one reserved adapter input that failed before dispatch. Approximately 6m05s. No second launch. Budget exhausted; do not continue this milestone's native testing.

Startup telemetry: GER, 1936.01.01.12, PP 2.324, stability .81; screen matched date/country, PP 2 and 81% stability. Startup mod emission was actually verified. Fresh idle-focus OCR at 03:04:09 UTC matched the visible Political panel and Select a National Focus button. OCR rendered its article as `Select* National Focus`; that specific variant was manually checked against the image and explicitly mapped. Unrecognized variants remain unavailable.

Target definition: `common/national_focus/germany.txt:124`, hash `ac730be5ccc9095fb400e58b2f7d44501288a94186beb148dbbb0b32cf8ea03c`. Its actual tooltip confirmed no focus prerequisites, no Economy of Conquest modifier, mutual exclusion with The Four-Year Plan and 35 days. The detail displayed Start.

Gateway request `m3-first-focus` passed the state checks and reserved execution, then the helper refused input because OCR did not recover the detail title. Saved OCR lines were interleaved (`PRIORITIZE`, unrelated search text, `EcoNomrc`, `35 days`, `GROWTH`, `Start`). Receipt: **uncertain**, adapter error before input. There is no post-selection state and no native action success. Identical retry returned the exact durable receipt without another reservation. The emergency stop then latched; status returned `latest: null`. The game exited through UI and the lease helper archived only its owned profile, restoring the normal path to absent.

Failures were integration/layout defects, not unsupported scripting or a game restart requirement: tooltip occlusion, incorrect initial panel title, DPI padding, idle-label OCR variation, then detail-title OCR ordering/substitution. Each diagnosis used new capture evidence. No unchanged command was dispatched twice.

Ignored evidence: `plan.json`, `native-budget.json`, `owned-session.json`, `poll-startup.json`, `before-focus.json`, `focus-request.json`, `focus-receipt.json`, `retry-receipt.json`, `disconnected.json`, `owned-snapshots.jsonl`, `replay.json`, `focus-evidence/`, `owned-game-profile/`.

| Artifact | SHA256 |
|---|---|
| owned-snapshots.jsonl | `689a4173f5675a7a89fed9344fe59498bd6a233b74dd7284e2b4142e73622652` |
| focus-receipt.json | `a3522c32ff93ce232689f81e9292a50059c1311f37449e8466acd0314da29bb8` |
| Idle capture 1793847848518506500.png | `09146464772ca7af1eff5253f914dc07f0af810c9767ae1ef39b79eb8cf3882e` |
| Detail crop 1793847876982934500-detail.png | `626981349dd9ab6faa288825b6518942dd4eb1fe38c90fd5282b407782f4a8c6` |

## Validation and operation

- Fresh actual Codex app-server connection rediscovered ten allowed Agent Tools tools and executed real lookup/docs/validation and disabled-mutation rejection. See `.bridge-local/agent-tools/m3-fresh-connection.txt`. No MCP permission changes.
- `npm run test:bridge`: 15 passed. Covers existing parser/API/gateway tests plus identity reuse, contradictory/truncated logs, stale/foreign/missing observation, unsupported IDs, Observer rejection, uncertain readback, durable retry, stop and metadata replay. Simulated adapter tests remain explicitly simulated.
- `node node_modules/typescript/bin/tsc --noEmit` and `npm run bridge:validate -- <game-root>` passed. No full application QA/build cycle was repeated.
- `npm run dev -- --bridge replay .bridge-local/native-HN3JuU/owned-snapshots.jsonl` reproduced two snapshots exactly with no HOI4 running. These are the startup anchor and later idle-focus capture at the same game date, not two post-action snapshots.

Run commands from the repository root. Existing Observer `inspect`, `reference`, `status` and replay commands remain available. The experimental runner uses `node --import tsx scripts/bridge-owned.ts <launch|poll|observe|select|status|stop|count> <run-directory>`. `select` persists one exact request and retries only that request; never delete a receipt to retry an uncertain action. `stop` prevents later dispatch, not undo. Native preparation remains the absent-profile-only `bridge-prepare-native.ts` workflow. A future session must first have a separate written budget, plan, lease, `native-budget.json`, and disposable reference DB. `HOI4_BRIDGE_PYTHON` can explicitly select the reviewed Python runtime. Do not run launch against archived/stopped evidence.

Troubleshoot read-only first: inspect ownershipError and capture/OCR JSON. An invalid owner requires a new explicitly owned session, never a relaxed PID check. A recognition failure requires fixing/testing saved crops offline, not another game launch. Next: spatially isolate and assemble the target title and Start button, add wrong-title/occlusion fixtures, and qualify input mapping and actual active-focus readback in a future bounded session. Broader focus navigation, pause/resume, research, general gameplay and native memory access remain unsupported.
