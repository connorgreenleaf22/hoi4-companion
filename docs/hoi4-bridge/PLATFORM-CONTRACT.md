# Integration platform v1 — decision and contract

2026-11-06. Accepted for M7; native qualification remains field-specific.

## Decision

Extend the existing Node HTTP service. One application owns GameBridge, bridge.sqlite, CampaignHistory, session validation, ActionGateway and receipts. The React connection panel and dedicated MCP share `BridgePlatform` and the same tool dispatcher. The MCP process owns no game process, database, controller or observer state. Existing HOI4 Agent Tools remains the source-analysis service.

```text
Companion UI ── existing protected local HTTP ── BridgePlatform
MCP client ── stdio SDK ── authenticated loopback HTTP ──┘
                                              GameBridge / SQLite
                                    telemetry reader | plaintext save reader
                                              shared gateway (execution disabled)
```

Reuse the ordered Clausewitz parser for selected save subtrees; use a bounded shallow index instead of materializing a 62 MB save as an AST. Jomini was evaluated (MIT, Rust text/binary parser); binary tokens/flavors and a Rust/WASM packaging path are not qualified for this exact HOI4 build. No Jomini source was copied. Revisit for broader formats after evidence justifies it.

## Shared observations

`src/integration-types.ts` defines schemaVersion 1 GameObservation and IntegrationStatus. Original telemetry schema 1/2 recordings retain their validators. Every normalized observation has source kind/path/SHA256, game version/date/country, capture timestamp, nullable owned-session ID, classification, per-field status/value/qualification/reason and limitations. Save fields include structural paths and containing-block line references.

- `verified-live`: only the current owned telemetry snapshot with recent log evidence. A field can still be unqualified. File time alone never grants ownership.
- `historical`: unowned logs, disconnected observations and recordings. Original capture ownership is retained as evidence, not current authorization.
- `save-derived`: explicitly selected persisted plaintext state, no live session claim.
- Field qualifications: `native-verified` is a documented exact-version mechanism; `parsed-unqualified` is extracted data awaiting independent checks; `unsupported` has no usable value.
- Installed references and manual assumptions remain separate existing application models. Observations never overwrite plans.

`ObservationProvider` and reserved `native-readonly` source kind define the extension seam. A future adapter must provide the same fields, provenance and qualification through this platform and existing ownership rules. No native-memory provider or alternate action gateway exists in M7.

## Interfaces

- `GET /api/v1/bridge/platform/status`: UI status, capabilities, observations and credential-file path (never the token).
- `POST /api/v1/bridge/platform`: UI `{tool,args}` dispatcher behind existing local Host/Origin checks; LAN callers remain excluded.
- `POST /api/v1/bridge/mcp`: same dispatcher, additionally per-instance random 256-bit bearer authentication. Credential resides in application data `bridge-connection.json`, omitted from diagnostics/Git; Windows protection uses the existing user-profile ACL. Not a defense against another process running as the same user.
- `server/bridge-mcp.ts`, bundled `build/bridge-mcp.cjs`: official MCP SDK 2.4.0 stdio adapter. Reads the descriptor for each call, rejects non-loopback URLs and redirects, bounds requests to 15 seconds. App restart rotates token/port; MCP reads the new descriptor.

15 tools: `hoi4_bridge_` + `environment`, `connection`, `connect`, `disconnect`, `poll`, `observations`, `focus_research`, `history`, `compare`, `save_inspect`, `capabilities`, `diagnostics`, `action_validate`, `receipt`, `emergency_stop`. Strict Zod inputs; result `{schemaVersion:1,tool,data}`. Tool errors are errors, not empty success. Connect/poll/save inspection mutate only local observation storage. No execute/submit tool exists.

Dry-run validation uses the same gateway checks and creates no receipt or authorization. Existing submit routes still reject Observer/Telemetry commands. Existing receipt states and duplicate protections are unchanged. Emergency stop persists in the shared DB, halts polling and later dispatch, and invalidates an owned reader; it does not undo actions or terminate an unrelated game. No reset is exposed in M7. Reading historical/save data remains possible after stopping.

## Observation boundaries

Explicit connection starts five-second polling; closing the service stops it. No automatic attachment/reconnection or game launch. Owned manifest attachment accepts only read-only telemetry purpose and exact compatible version/executable. Arbitrary logs stay historical. Version change, identity mismatch, changed generation and date rollback fail closed. A complete batch gets two process checks and batch-level log reads, with prefix/readback validation and atomic publication. Same-date loaded-save detection remains unqualified; do not claim complete lifecycle coverage.

Plaintext inspection is read-only, player-country only, exact 1.19.4.2, maximum 128 MiB, valid UTF-8, depth <=128 and selected subtree <=2 MiB. Stat checks detect concurrent mutation, hashes identify original bytes. Binary/ZIP/unknown versions and ambiguous paths reject. Keep at most twenty derived save observations; originals are never copied into the DB or packaged artifact. Serialized research-slot order is not a qualified UI slot identity; research points are not percentages. Missing current-focus token cannot be recovered from progress.

## MCP setup

Start the matching companion build first; expand **Connect game observations > Capabilities and MCP diagnostics** to find the descriptor. A client configuration can use:

```toml
[mcp_servers.hoi4_bridge]
command = "C:/Program Files/nodejs/node.exe"
args = ["C:/path/to/M7-build/win-unpacked/HOI4-Bridge-MCP.cjs"]
[mcp_servers.hoi4_bridge.env]
HOI4_BRIDGE_CONNECTION = "C:/Users/YOU/AppData/Roaming/HOI4 Companion Development/M7-COMMIT/bridge-connection.json"
```

Use Node >=22 for this optional stdio process. The companion itself needs no external Node. Paths must match diagnostics; do not copy a descriptor between machines. Existing Agent Tools registration is unchanged. This example is provided for manual configuration; M7 tested real SDK stdio discovery/invocation, not a new global Codex registration.

Troubleshooting: open the correct build, verify its descriptor exists without printing its token, and call connection/diagnostics. Reconnect observations explicitly after source/version changes. A stopped latch is intentional; use a new isolated test data directory for another test instead of silently clearing safety state. Parser errors require a completed compatible text save, not a game restart. Broader app release gates remain in QA-LEDGER.md.
