---
name: hoi4-game-bridge
description: Discover HOI4 installations, query installed definitions with provenance, develop the companion bridge and telemetry mod, and run bounded offline or native game integration tests. Use for HOI4 scripting, game-state access and bridge diagnostics.
---

# HOI4 game bridge

Read the repository's `AGENTS.md` and `docs/hoi4-bridge/STATUS.md` first. Verify the checkout and requested branch before edits. The existing service is `server/api.ts`; reuse `server/parser.ts`, `server/importer.ts` and `server/store.ts`. The bridge contract is `src/bridge-types.ts`.

## Community source tools

The pinned `hoi4_agent_tools` MCP registration supplies ten source-analysis tools. Read `docs/hoi4-bridge/COMMUNITY-TOOLS.md` for the reviewed revision, setup, evidence and native-adapter blockers. Discover the actual catalog before invoking tools; use `workspaceId: "companion"`. Prefer `hoi4.source_lookup` for exact definitions, nested blocks and overrides; `hoi4.reference_search` followed by `hoi4.reference_read` for installed documentation; `hoi4.script_validate` for command kinds/scopes. Focus, technology, event and decision inspectors provide source analysis, not live state or eligibility. `focus_inspect` writes analysis reports to configured ignored storage (its readOnlyHint is false); game/mod source writes are excluded. Do not rebuild these developer analyzers in the companion.

Inspect `structuredContent.status`, then `data`; MCP transport success alone is insufficient. Validation `valid: null` means unresolved; `parametersChecked: false` remains a limitation even when valid is true. Preserve revision, source layer, line and scan completeness. No source-rewrite tools are enabled. If the MCP catalog is absent, use the documented diagnostic/reconnect procedure once and the existing bridge reference query as a fallback; do not install native control components or launch HOI4 to repair source-tool access.

## Repeatable workflow

1. Run `npm run dev -- --bridge inspect`. This reads the installation and detected launcher configuration without opening an app database. Use explicit `HOI4_GAME_DIR` and `HOI4_USER_DIR` when automatic discovery is incomplete. Read installed `launcher-settings.json` and `documentation/`; an executable's Windows product version can be the generic `1.0`. Recheck after Steam updates.
2. Set `HOI4_DATA_DIR` to a disposable directory before indexing or testing. Run `npm run index`, then `npm run dev -- --bridge reference <identifier> [kind]`. Retain source path, line, hash, version and index revision. Resolve ambiguity instead of choosing the first candidate. The base index does not merge mods: inspect detected collisions, same-path replacement and descriptor `replace_path` before using a definition.
3. Search installed `common/national_focus`, `common/technologies`, `events`, `common/decisions`, `common/scripted_triggers`, `common/scripted_effects`, and localisation with `rg`. Parse repeated keys as ordered nodes, not a JSON object. Follow referenced effects/triggers and ROOT/FROM/THIS scopes. Extracted prerequisites, conditions and rewards do not prove eligibility or engine behavior in a campaign.
4. Query `/api/v1/bridge/status` before state-dependent work. Observer Mode cannot issue gameplay commands. Telemetry requires an explicitly configured log and `HOI4_BRIDGE_MODE=telemetry`; call `POST /api/v1/bridge/poll`. Missing values remain unavailable. Recent file writes are not proof of a running game. Replay is historical and never authorizes actions.
5. For scripts, check names/scopes against this installation's effects, triggers, dynamic-variable and localisation documentation. Use `npm run bridge:validate -- <game-root>` for this prototype's preflight. It checks syntax and required documented primitives, not general semantic correctness. Consider a separately reviewed CWTools integration for broader validation.
6. Start with `npm run test:bridge` and `npx tsc --noEmit`. Use recorded snapshots for parser/API/retry changes. Run `npm test` and `npm run build` once at the integrated milestone. Native tests are needed for script export, game UI, or adapter semantics; fixture tests cannot close those gates.
7. Before a native session, read `docs/hoi4-bridge/NATIVE-SMOKE.md` and write the budget and protected paths into the run evidence. Stop after the first isolating diagnosis, or at the stated limits. Never repeatedly launch to debug a parser defect. Categorize the blocker as environmental, permissions, unsupported-interface, version-incompatibility, scripting, integration, or application.
8. Retain raw logs/screenshots/snapshots under ignored `.bridge-local/` or `artifacts/`. Commit only concise summaries, hashes and reproducible commands. Update STATUS at meaningful milestones, including unsuccessful attempts. Never relabel a prior untested QA gate as passed.

Read `docs/hoi4-bridge/README.md` for API, replay and troubleshooting; `ADR-001.md` in that directory for reuse/control decisions. No native action adapter is currently registered. An emergency stop prevents later dispatch; it cannot undo earlier inputs.
