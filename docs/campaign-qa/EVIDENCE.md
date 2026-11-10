# Pilot implementation evidence — 2026-11-10

Implementation commit: `2a11db9a8b42b5dd7fa1f3b2145662ffeee95400`, isolated `feature/hoi4-live-qa`, based on `49ccb29`. This report is a subsequent documentation checkpoint. No main/develop merge, release, personal save edit, game launch/input, injection, executable modification, public endpoint or provider inference occurred.

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

The user reports ChatGPT's Tunnel option exists, with no configured tunnel. We did not verify Platform permissions, workspace association, a runtime key, tunnel-client health or an actual ChatGPT tool invocation. No secret was requested or read. Official setup source: [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

General player-country scripting is source-backed **candidate** code. Trigger validation passed syntax/kind/scope; effect argument blocks remain unresolved (`valid: null`, `parametersChecked: false`). GER and POR were tested as parser fixtures only. Native country detection, numeric units/precision, actual daily-hook scope, startup marker timing, production/resources/supply/diplomatic detail, game CPU/FPS impact and compatibility outside the stated version remain unverified or unavailable.

The existing M7 bridge can retain its qualified observations, but the new pilot cannot prove process ownership or same-date save reload identity. New readings remain parsed-unqualified historical observations. There is no mechanism to silently promote them from user notes, fresh timestamps or a working tunnel.

**Definition of success remains unmet:** no 30–60 minute real user capture or paired three-to-five-question usefulness assessment has occurred. Follow SETUP.md and EVALUATION.md; retain an explicit user acceptance/rejection and publish only sanitized findings.
