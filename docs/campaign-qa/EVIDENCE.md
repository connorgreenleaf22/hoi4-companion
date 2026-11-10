# Pilot implementation evidence — 2026-11-10

Implementation commit: `2a11db9a8b42b5dd7fa1f3b2145662ffeee95400`, isolated `feature/hoi4-live-qa`, based on `49ccb29`. This report includes a later user-authorized ChatGPT connection checkpoint. No main/develop merge, release, personal save edit, game launch/input, injection, executable modification or public game-data endpoint occurred.

## Actual ChatGPT connection — November 10, 2026, 15:57 EST

- Official tunnel-client v0.0.20 Windows AMD64 download verified against release SHA256 `99474aaa62ece303d7b661f2f46f932dcd560b489b540f817355da25be71bcf3`. Client and setup artifacts are local and ignored by Git.
- User approved the named tunnel/workspace association and personally entered a separate runtime key with only Tunnels Read/Use and one-day expiration. The key was entered through a hidden local prompt, passed in process environment, and never intentionally persisted or included in command arguments/chat. No admin key or model API permission was required.
- Managed runtime reported process running, healthy and ready; MCP health subsequently reported successful discovery with exactly the six `hoi4_qa_*` tools. The target is the dedicated stdio adapter, not the legacy bridge or the app's HTTP server. Local operator listeners remain loopback-only.
- Actual ChatGPT plugin discovery/connection succeeded. In one ChatGPT conversation, session and diagnostics calls returned successfully; the answer correctly reported idle recording, no observations, disconnected game bridge, unavailable gameplay execution and unverified live state. Diagnostics reported 14 requests and zero API failures, including preceding local smoke calls; this is not a count of 14 ChatGPT calls.
- Local evidence: `.bridge-local/qa-tunnel/{doctor.txt,connect.json,status.json,chatgpt-discovery.json,chatgpt-smoke-answer.txt,chatgpt-smoke-answer.png}` and official client logs under the user's local tunnel-client state directory. Account IDs, runtime credentials and raw diagnostics are excluded from this report.
- Recording remained idle. The user subsequently clarified that gameplay will occur on a different desktop, starting as Germany. The tunnel runtime on this computer was stopped and its stopped/unhealthy/not-ready status confirmed; the plugin and scoped remote tunnel remain configured for reuse. The initial implementation shutdown described below preceded this setup session.

This passes connectivity only. No native campaign data or practical gameplay usefulness has yet been established.

## Desktop transfer kit

The user will play Germany on a different desktop PC. Built an isolated transfer kit at source commit `c118d080f889`, with four bundled Node entry points, local Windows launch/key-entry helpers and the checksum-pinned official tunnel client. No runtime key, account ID, tunnel ID, observation, save or local connection descriptor is included. Node 24 is a prerequisite. The archive is `HOI4-QA-Desktop-Pilot-c118d080f889.zip`, 30,387,588 bytes, SHA256 `3a1c055e596ddb6556a81c1dfb0cbac4d1b67df99667bfac6be4e8c1d99d232b`.

Fresh extraction matched all 20 files in BUILD.json. The extracted preparation tool generated a new mod only inside its own ignored storage. The extracted service indexed installed references and the extracted MCP smoke called all six tools and rejected a control tool. This validates portability to a new local path, not execution on the user's other PC. Initial indexing took roughly a minute before publishing the panel URL. The first smoke attempt preceded descriptor publication and correctly refused; the test passed after the service became ready. PowerShell syntax and generated destination-specific tunnel paths were checked; desktop private-key entry and remote connectivity must still be repeated on that PC.

The builder's first archive extraction attempt failed because Windows PowerShell could not load its Archive module in the inherited environment. It now uses Windows tar with an argument array and a verified input ZIP. The incomplete package was retained separately and is not the delivered archive.

The original connection-test service and extracted verification service were stopped after testing. Terminal cancellation did not remove the verification descriptors, so only those owned credential descriptors were removed after confirming the listener was unavailable; evidence databases/raw records remain. The original tunnel runtime was already confirmed stopped. No regular companion or HOI4 process was stopped. Full local evidence is retained beside the kit under `verification-extract/desktop-pilot/.bridge-local/qa-smoke-2026-11-10T21-04-13.658Z`.

## Verified

- 15 distinct focused tests passed: eight new Q&A/pilot tests, two existing bridge-platform tests and five existing save-reader tests. The final eight-test rerun passed after UTF-8-safe chunk buffering, log-anchor validation, aggregate field metrics and exact game.log selection were added. These are deterministic fixtures and retained historical-record tests, not new native evidence.
- TypeScript and production build passed. The final service bundle was rebuilt after the last runtime change. No dependency or lockfile change.
- Real external stdio MCP handshakes/calls: six Q&A tools with strict input schemas and read-only annotations. Unknown bridge control name refused; Q&A token refused by legacy bridge; legacy token refused by Q&A; cross-origin request rejected. Local UI controls require same-origin JSON. Source-path args are not accepted by Q&A tools.
- Save copy hash unchanged after explicit local inspection; sanitization removes paths/raw values/arbitrary fields/free-form diagnostic text. Historical exports do not become live. Duration, identity mismatch, missing file, rollback, rotation, partial/Unicode log records, duplicate records and source-size refusal exercised.
- Installed-source smoke: `POR_estado_novo`, `common/national_focus/portugal.txt:4624`, version 1.19.4.2, SHA256 `f2ab08a2667a665a58c7c92f812045dc5406a4747bb2f54d702dc15f15088180`, current file hash matched. Mod override status remained unknown. This establishes source retrieval, not campaign eligibility.
- Browser fixture journey: visible Start entered recording, two fixture POR observations arrived, Stop became disabled after stopping, Start became available, and raw/report files were retained. This was an explicitly labeled disposable log, with no HOI4 process. Run `35ea568f-551d-49d9-9659-8ab9763ad244` lasted about 40 seconds, captured 306 raw bytes and two observations. Its pre-optimization sample maximum was 143.71 ms. It does not establish game performance; full environment rescans were subsequently removed from the sampler.
- The final built MCP smoke invoked all six tools against the isolated app and rejected a control tool. Local evidence: `.bridge-local/qa-smoke-2026-11-10T20-16-35.439Z`. Earlier fixture UI/changes evidence: `.bridge-local/qa-smoke-2026-11-10T20-14-10.410Z` and `.bridge-local/qa-app/qa-pilots/35ea568f-551d-49d9-9659-8ab9763ad244`.
- Fixture observation metadata was cleared from the reusable pilot app after the UI test; raw fixture evidence remains locally labeled. Final service shutdown removed both descriptors; no owned test service remains. No regular app process was stopped.

## Findings corrected during development

The first test pass found two fixture assertions (a forbidden-token regex matched a comment, and an invalid-number replacement modified the producer token), inconsistent trailing-newline hashing, and an expected unknown-tool exception treated as an error-result object. Corrected once with focused reruns. The initial source launcher used unsupported top-level await under this repository's CommonJS transform; wrapped it in async main and successfully launched/indexed. Review also corrected byte-versus-character partial-buffer slicing, stale prior-run fallback, truncate/regrow detection and expensive repeated discovery. The raw browser fixture remains available to audit the measured overhead before that optimization.

## Explicitly unverified

Platform/workspace access, restricted runtime credentials, tunnel health and actual ChatGPT calls were subsequently verified as recorded above. Official setup source: [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

General player-country scripting is source-backed **candidate** code. Trigger validation passed syntax/kind/scope; effect argument blocks remain unresolved (`valid: null`, `parametersChecked: false`). GER and POR were tested as parser fixtures only. Native country detection, numeric units/precision, actual daily-hook scope, startup marker timing, production/resources/supply/diplomatic detail, game CPU/FPS impact and compatibility outside the stated version remain unverified or unavailable.

The existing M7 bridge can retain its qualified observations, but the new pilot cannot prove process ownership or same-date save reload identity. New readings remain parsed-unqualified historical observations. There is no mechanism to silently promote them from user notes, fresh timestamps or a working tunnel.

**Definition of success remains unmet:** no 30–60 minute real user capture or paired three-to-five-question usefulness assessment has occurred. Follow SETUP.md and EVALUATION.md; retain an explicit user acceptance/rejection and publish only sanitized findings.
