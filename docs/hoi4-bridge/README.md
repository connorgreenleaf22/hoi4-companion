# Game bridge developer interface

The first bridge milestone is verified, including two native telemetry snapshots on Windows HOI4 1.19.4.1. No native command adapter is registered. Read STATUS.md and EVIDENCE.md for the tested scope and limitations. Node 24+ is required by the existing service.

From the repository root, use a disposable application data directory:

```powershell
$env:HOI4_DATA_DIR = Join-Path (Get-Location) '.bridge-local/reference-db'
npm run dev -- --bridge inspect
npm run index
npm run dev -- --bridge reference GER_prioritize_economic_growth focus
npm run dev -- --bridge status
```

The example identifier must resolve on the installed patch; unresolved/ambiguous is an explicit result. `HOI4_GAME_DIR` overrides installation discovery; `HOI4_USER_DIR` selects a directory to READ and does not redirect the game itself. Observer Mode is the default.

For an already safely isolated game with the prototype loaded:

```powershell
$env:HOI4_BRIDGE_MODE = 'telemetry'
$env:HOI4_BRIDGE_LOG = '<verified disposable game.log>'
npm run dev -- --bridge poll
npm run --silent dev -- --bridge export > .bridge-local/snapshots.jsonl
npm run dev -- --bridge replay .bridge-local/snapshots.jsonl
```

Poll reads only complete new log records and persists its cursor. Export emits up to 10,000 retained snapshots (optionally a session argument); replay validates/deduplicates without opening the live database or refreshing timestamps. Snapshots are local data, not Git fixtures. File modification time is only a freshness bound; it cannot prove a running game or age individual historical rows. The prototype observes GER only. Unsupported/missing fields stay unavailable.

The existing service (`npm run dev`) also exposes local-only endpoints below. Existing host and origin protection remains active; the phone/LAN listener rejects all bridge routes even after pairing.

| Method/path under `/api/v1/bridge/` | Result |
|---|---|
| GET `environment` | Installation, descriptor inventory, detected launcher configuration and diagnostics |
| GET `status` | Mode, capabilities, latest snapshot, qualified freshness and stop state |
| GET `reference?ref=ID&kind=focus` | Existing index resolution/provenance and potential mod overrides |
| POST `poll` | Explicit telemetry read; rejected in Observer Mode |
| GET `snapshots?session=ID` | Up to 1,000 recent persisted snapshots in insertion order |
| POST `actions` | Typed request gateway; no native adapter/grant is registered, so no gameplay dispatch |
| GET `receipt?id=ID` | Persisted action result |
| POST `stop` | Latch emergency stop; does not undo or necessarily cancel an in-flight action |

Types: `src/bridge-types.ts`. Bridge data is `bridge.sqlite` beside `companion.sqlite`, with no campaign schema change. Do not manually erase uncertain receipts to retry an action. Reusing an ID with different content is rejected; a crashed controller reservation requires reconciliation. There is deliberately no public arm/reset endpoint in this MVP.

Focused checks: `npm run test:bridge`, `npm run bridge:validate -- '<installed game root>'`, `npx tsc --noEmit`. Run the full existing test/build gates at an integration checkpoint. Syntax/documentation checks and fixtures are not native acceptance. For diagnostics, first inspect status, version, path, log terminators, schema version and error.log. An unsupported command needs a reviewed adapter, not retries. A missing installation needs a path fix, not game launches.
