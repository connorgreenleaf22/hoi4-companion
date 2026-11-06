# Milestone 7 — Game Integration Platform v1

2026-11-06. Implementation and offline qualification; packaged acceptance in progress. Native game qualification remains separate.

## Baseline and decision

Verified M6.5 `67d7d05c3ae5f88c0a0081edcf7675d669df6d75` already descends from M6.1 `f02b1c5a23ba4e8cf67fa89693b1261729eb15d3`. No merge was necessary. Created only `feature/hoi4-platform-m7` from M6.5. Existing feature branches, main/develop, Git history, installed app and M6.1/M6.5 ZIPs are preserved. The ZIPs identify their earlier validated runtime commits, not their later documentation commits.

Decision: [PLATFORM-CONTRACT.md](PLATFORM-CONTRACT.md). Extend one application-owned Node bridge/SQLite/gateway, reuse ordered script parsing and history, and expose a thin authenticated MCP adapter. No separate backend, new control engine or telemetry-mod rewrite. M7 improves ingestion/ownership and integration around the unchanged qualified M6.5 emitter.

## Implemented interfaces and files

- `src/integration-types.ts`: versioned observations with provenance, source classification and per-field qualification; future observation-provider seam.
- `server/bridge/platform.ts`, `tools.ts`, `mcp-connection.ts`, `server/bridge-mcp.ts`: shared UI/MCP dispatcher, explicit read-only connection and five-second monitoring, bounded history/comparison, save inspection, dry-run action validation, receipt retrieval, stop latch; fifteen MCP tools with no gameplay execute tool.
- `server/api.ts`: existing local Host/Origin/LAN protections plus authenticated loopback MCP endpoint; one shared platform/DB. `src/BridgeConnection.tsx`, CampaignIntelligence and styles: connection, source/confidence, save fields and diagnostics in the existing Command center.
- `server/bridge/save-reader.ts`: bounded read-only 1.19.4.2 plaintext player-country extraction, existing ordered parser for selected subtrees, repeat-key/ambiguity checks and explicit unsupported values. Original bytes are hashed and never modified.
- `server/bridge/owned-session.ts`, telemetry/service/actions: batch ownership checks and atomic publication, rollback quarantine/session split, read-only attachment and shared non-mutating validation. Existing M3 adapter remains isolated and unexecuted.
- `server/bridge/deadline.ts`, process-identity and native helpers: wall/monotonic deadline, corrupt/stop fail-closed behavior, exact Windows creation FILETIME and retained-handle termination, supervisor readiness acknowledgment, separate future M7 budget. No game-memory API reads/writes.
- Tests: bridge-deadline/platform/save and extended owned-session tests; synthetic save fixture. Existing packaged telemetry smoke extended for UI/save/MCP/restart. Build scripts include an external bundled stdio entry. Skill, inventory, roadmap, native proposal and feasibility brief updated.

## Qualification and evidence

| Capability | Evidence / limit |
|---|---|
| Installed content and references | Existing indexing/reference service preserved; exact installed manifest 1.19.4.2. Packaged installed-source indexing check is part of final acceptance. |
| Live numeric/selected research | Prior M6.5 independent evidence retained: war support .35, four slots, civilian factories including trade, military factories, dockyards and basic_machine_tools false → true. Country/date/PP/stability prior evidence retained. No new native field qualification in M7. |
| Telemetry reliability | Two identity probes per batch, one source read, before/after ownership and byte-prefix checks, atomic publication; deterministic rollback/partial/duplicate/restart/replay coverage. Same-date load semantics remain unqualified. |
| Real disposable save | Archived M6.5 autosave, 62,392,225 bytes, HOI4txt, GER 1936.4.1.1. Extracted GER_prioritize_economic_growth completion, 55 positive-level tech entries, four serialized slots (basic_machine_tools + three empty). About 2.14 seconds initial local extraction. SHA256 eeb9eb34019e17fdc147970b740bca3639a7339ce09fef791a4cc541c31b8efa. Original contains account metadata and is excluded from Git/build. |
| Focus/progress | Real save has progress=10 but no current token: both current focus and focus progress intentionally unavailable. Synthetic explicit-current case parses, but engine semantics/units are not independently qualified. |
| Save confidence | Every mapping remains parsed-unqualified. Serialized order is not verified UI slot identity; research points are not percent; saved positive level is not a completion event. Raw adjacent-date logs do not replace independent same-state UI validation. Binary/compressed/other-version saves reject. |
| MCP | Actual SDK stdio → authenticated HTTP → same UI-owned state; fifteen discovered tools, no execution, unauthorized bearer 401, foreign Origin 403, shared recordings/receipts/stop. Optional global client registration is documented, not changed. |
| Watchdog | Three deterministic/Windows synthetic-process tests pass, including independent child supervisor with no further parent input and wrong-lifetime refusal. This is not HOI4 native termination qualification. M6.5 timing failure remains failed. |

39 distinct focused tests passed across `.bridge-local/m7-focused-tests.txt` (34), `m7-deadline-final.txt` (3), `m7-api-tests.txt` (2). Eight affected tests were rerun after final qualification/helper refinements in `m7-affected-final.txt`; these overlap, not eight additional distinct tests. TypeScript and production build passed in `m7-build-final.txt`. Script syntax checks pass. Installed-script/identifier preflight and deterministic emitter generation checks pass (`m7-mod-preflight.json`, `m7-mod-generation.txt`). No broad release-gate recertification.

Skill YAML frontmatter validates with the installed js-yaml dependency. Bundled Python quick validator cannot run because PyYAML is absent; no dependency added solely for it. Repo-scoped discovery was previously verified; M7 keeps the same name/path and adds platform workflow/references. Fresh source MCP evidence: `.bridge-local/m7-agent-reference.txt`, `m7-agent-tools/startup-reference.json`. Existing pinned Agent Tools 4.7.0 inspected installed startup documentation; listing an on-action does not qualify load behavior. Unchanged M6.5 validator limits remain recorded.

## Reuse and security

Reused project parser, SQLite store/history, gateway, ownership rules, HTTP protections, indexing worker, Electron packaging and QA harness. Added official MCP SDK server/client 2.4.0 and Zod 4.6.7; server SDK is bundled, client is test-only. Reviewed SDK licensing includes Apache-2.0 with retained MIT contributions; bundled dependencies retain notices via packaging. Existing HOI4 Agent Tools registration/pin unchanged. Jomini and native community projects were evaluated, not executed or copied into the app.

Npm audit reports six moderate findings in the existing electron-builder packaging chain (including minimatch); no forced dependency upgrade was made, and no finding targets the added MCP packages. Full audit remains `.bridge-local/m7-npm-audit.json`. Existing broader QA/security/release obligations are preserved.

## Remaining gates and next task

No M7 HOI4 launch, gameplay input, memory inspection, DLL injection, hook or executable modification. No personal save/mod/playset changed. Current focus/progress, complete inventory semantics, same-date load lifecycle, new native shutdown and gameplay control remain unqualified/unsupported. This milestone delivers the coherent read-only platform; it does not close those native gates.

Next: review [M7-NATIVE-PLAN.md](M7-NATIVE-PLAN.md), then qualify a disposable campaign within one launch/eight ordinary actions/twenty minutes. Do not reset the old budget. [M7.5-FEASIBILITY.md](M7.5-FEASIBILITY.md) recommends a separately authorized constrained read-only experiment only after compatibility/ownership/field gates; no current native candidate qualifies out of the box.

Run/setup/troubleshooting: PLATFORM-CONTRACT.md and `../application/MILESTONE-7-ACCEPTANCE.md`. Packaged artifact and final repository receipts will be appended after actual acceptance; do not treat this checkpoint as a completed package pass.
