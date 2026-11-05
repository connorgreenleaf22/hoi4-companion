# Community integration audit — 2026-11-04

Decision: integrate pinned HOI4 Agent Tools as a developer-side stdio MCP server, with ten source-analysis tools allowed by Codex. They do not edit game/mod source; caches and analysis reports are written to ignored storage. Preserve the companion's Node service, database, API and action gateway. No second bridge, native controller or full agent framework is introduced. This audit supersedes the preliminary README/metadata survey in ADR-001 where they disagree.

## What Milestone 1 actually achieved

Reviewed `9017453`, `e83d6a2`, `src/bridge-types.ts`, `server/bridge/*`, HTTP routes and focused tests against the retained evidence; no broad QA rerun was necessary.

| Original criterion | Implementation and evidence | Remaining limit |
|---|---|---|
| Environment identified | Installed executable, launcher version and content descriptors; version/hash rechecked this sprint | Descriptor presence is not DLC entitlement; no normal profile exists, so active playset is unavailable |
| Skill usable | Actual Codex loader discovered repo skill; invocation instructions provided | Open the actual repository, not the original empty chat directory |
| References with provenance | Real German focus resolved to germany.txt:124 with source hash/version | Companion index has conservative override warnings, not merged mod semantics |
| Typed interface | Existing HTTP/CLI and separate bridge.sqlite | API tested offline; no companion UI for every bridge capability |
| Deterministic replay | Two retained native snapshots replayed after game exit; synthetic rotation/partial/duplicate tests | Not a live process/session binding |
| Two live observations | One Windows 1.19.4.1 GER campaign, two daily records; date/country, rounded PP and stability checked visually | GER only, daily; fractional PP from log only; no current continuous feed |
| Unsupported/Observer rejection | Implemented and covered by fixture/API tests | Adapter execution, lock, deadline and readback tests use a fake adapter |
| Native control, if compatible | No production adapters or authorization grants registered | No verified gateway gameplay command; manual setup clicks are not adapter acceptance |
| Bounded/protected native test | One successful launch/16 inputs/5m21s; owned absent-profile reservation restored | Helper deliberately refuses existing personal profiles |

Codex can consume structured bridge snapshots, but **cannot currently claim reliable general live game state**: polling is explicit, only four values are exposed, file mtime is not liveness, and no PID/start-time binding exists. The companion can consume the same local API; this does not imply an implemented gameplay UI. No native control effects have been independently verified through the gateway. Existing release gates in QA-LEDGER remain open as documented.

## Pinned source audit

All seven repositories were fetched read-only into ignored `.bridge-local/community/`. Only Agent Tools dependencies and its compiled TypeScript were executed. The Agentic checkout hit Windows long-path errors for some bundled assets; reviewed skills/license were read through `git show HEAD:<path>`, without retrying the assets. Commit timestamps below describe source maintenance, not compatibility certification. Upstream native claims are **author evidence**, not this laptop's results.

| Candidate / exact revision | License; installation | Actual implementation / compatibility | Decision and verification |
|---|---|---|---|
| [Agent Tools](https://github.com/klimPaskov/hoi4-agent-tools/tree/3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8), 4.7.0, Nov 2 | Apache-2.0; Node ^22.19 or ^24, shrinkwrapped npm dependencies; sharp/image libraries, MCP SDK, Zod | `src/hoi4_agent_tools/mcp/tools`, `reference`, `focus`, `technology`, `analysis`: real source graphs, layered game/DLC/dependency/mod lookup, documented command/scope validation, events/decisions, previews and rewrite tools. No running-game connection. Installed DLC layers do not establish active entitlement. | **Integrate** source-read-only subset. Built and invoked through Codex on Node 24.21.0 / installed HOI4 1.19.4.1. Four successful calls across three distinct tools; other enabled inspectors discovered/source-reviewed, not individually qualified. |
| [saslifat HOI4 MCP](https://github.com/saslifat-gif/hoi4-mcp/tree/93849c027941af8384a7a9c0d9b2cd4a8c29a9f1), Oct 15 | No LICENSE located; Python >=3.10, `mcp>=1,<2`, native Windows C/DLL backends | `native_controller.py`, `attach_native_probe.py`, `native_selection.c`, `native_time.c`: structured reads, durable IDs, validators/readback; DLL injection via WriteProcessMemory/CreateRemoteThread and callback/vtable hooks via VirtualProtect. Upstream reports protected GER/ITA commands; published ZIP predates source snapshot. | **Reject execution on this build; reference contracts only.** Required executable SHA256 `7dc947be34970da1e1c787bcddbe7f62b610ff258aebf8f06aa8b348f3a031d5` differs from local `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`. A hash substitution is not a port. Requires license clarification, reviewed layouts/build process and explicit approval before any native execution. |
| [Live Tools](https://github.com/klimPaskov/HOI4-Live-Tools/tree/5b9ec1ec7578c37ecf77a4e8a8c96c3a24317dc6), 1.2.0, Nov 2 | Apache-2.0; Windows Python >=3.9, numpy/Pillow/OpenCV, English Windows OCR, optional FFmpeg; separate native Rust >=1.86 runtime | Python `windows_input.py` sends scan codes and checks foreground; `focusview.py` searches localized focus and verifies panel, `console.py` waits for animation/OCR. `state/savefile.py` indexes text saves; telemetry modgen uses versioned generation IDs. Launch tools own PIDs and backup settings, but can touch a normal profile. Rust Windows production allowlist is empty and attachment reports unavailable; Linux/Mac qualifications do not transfer. | **Adapt later**, ordinary-input Python path plus telemetry producer/manifest patterns. Upstream Windows evidence cites 1.19.2; our 1.19.4.1, resolution and OCR still need qualification. Not installed; installer would register multiple clients by default. No direct structured Windows memory API is ready. |
| [Agent Harness](https://github.com/Xocas12/hoi4-agent-harness/tree/09e52bda349bf0d58d46967edc50791c04e2f8bf), 0.1.0, Oct 31 | MIT; Python >=3.10; no base dependencies, optional provider SDKs/pyautogui/mss | Actual `agent/loop.py`, `budget.py`, `adapters/clock.py`, `input_driver.py`, `actions/registry.py`, `observation/delta.py`, `replay.py`: budgeted loop, critical-event wakes, capability-filtered validation, date-driven waits, calibrated inputs with verification, reconstructable prompt replay. README's “input_driver stubbed” is stale relative to code. | **Adapt patterns**, not framework. No laptop execution or proven campaign. Keep unavailable values and wall-clock deadlines. Do **not** adopt continuing reflex gameplay after model-budget exhaustion: our native action budget must stop all further dispatch. |
| [Agentic Modding](https://github.com/klimPaskov/Agentic-HOI4-Modding/tree/38b561489aae5707a2e0868b2019f4d5e75ff4f8), Nov 2 | Apache-2.0; skills/docs/assets, selected tools need separate runtimes | `.claude/skills/hoi4-live-playtest` separates provider gates and source/native evidence. Some provider/version descriptions lag Live Tools' own source. Broad asset/model workflows exceed this task. | **Reference**, retain focused repo skill; no wholesale import or installer execution. |
| [Jomini](https://github.com/rakaly/jomini/tree/16d025dbf4ecc7a906b3513d61cfd300aa710b64), 0.37.2, Nov 4 | MIT; Rust/Cargo, edition 2024; optional serde/compression/WASM paths | `crates/jomini`: text and binary tape/stream/deserialization; binary flavor and token resolver are game/patch specific. Does not supply HOI4 research/focus semantics or live control. | **Prefer for future save parsing** when a text/binary/save-field scope is agreed. No Rust dependency or duplicate parser added now. |
| [cpntodd HOI4-MCP](https://github.com/cpntodd/HOI4-MCP/tree/e7101f6bee5b6536c965e05935659af4a7220cc5), 0.1.0, Jul 27 | LICENSE explicitly GPL-3.0-or-later; Python >=3.10, mcp[cli], PyYAML | `hoi4-mcp-server/src/hoi4_mcp`: vanilla SQLite index, tokenizer/bracket/YML validation, error grouping, sessions and learning rules. Not a native controller or full scope/type validator. | **Reference**, do not duplicate existing index/service or adopt code without license review. No tests rerun; advertised counts are not our evidence. |

## Capability choice

| Capability | Companion today | Community advantage / evidence | Choice |
|---|---|---|---|
| Source definitions and overrides | Persisted index, hashes, conservative collision warning | Agent Tools layered lookup and exact nested blocks; real focus returned at the same line on this laptop | Keep app index; use MCP for deeper development analysis |
| Focus/research/event/decision analysis | Definitions, limited extracted relationships | Agent Tools has specialized graphs and diagnostics; source reviewed, only focus source lookup locally exercised | Use upstream inspectors before writing custom developer analyzers |
| Script validation | Prototype-specific syntax/documentation preflight | Agent Tools checks kinds/scopes with citations; `valid=null` preserves unknowns; parameters remain unchecked | Use upstream validator; retain emitter-specific preflight/native gate; CWTools remains an optional broader schema validator |
| Structured observations | Two verified daily GER records; replay and missing fields | Live Tools' Python telemetry covers more fields/research with manifest; saslifat native reads require incompatible injection | Extend/adapt log producer + normalize to existing BridgeSnapshot; qualify every new field |
| Gameplay actions | Gateway only; no real adapter | Live Tools Windows ordinary-input selection; saslifat hash-pinned research/focus backend incompatible; harness calibrated driver lacks local qualification | Next: one reviewed Live Tools input path behind ActionAdapter; no direct MCP bypass of gateway |
| Saves | No bridge save-state mapping | Jomini binary/text parsing; Live Tools text subtree indexing | Define semantic fields first; reuse rather than implement another general parser |
| Testing/replay | Existing tests and retained native captures | Agent Tools static diagnostics; harness injectable clocks, deltas and replay | Add recorded-format regression now; do routine verification without launching HOI4 |

## Installed MCP integration and evidence

Source checkout is pinned by `integrations/hoi4-agent-tools.json`. `npm ci --ignore-scripts --no-audit --no-fund` installed 408 packages using upstream's shrinkwrap; direct `tsc -p tsconfig.build.json` built the reviewed source. Companion dependencies/lockfile are unchanged. No npm lifecycle scripts, native game components, remote HTTP listener or native HOI4 binary were executed. Normal prebuilt sharp dependencies were loaded by upstream's diagnostic.

Production `npm audit --omit=dev` reported three moderate entries: `@hono/node-server` static-path decoding, `glob` cancellation, and `minimatch` pattern amplification. Retain `.bridge-local/agent-tools-audit.json`. HTTP is not enabled; bounded local source analysis remains appropriate, but upstream upgrades need renewed review. No forced dependency overrides were applied. Inspector peer/deprecation warnings were retained as installation observations, not game failures.

Ran upstream `dist/bin/setup.js --print-client-config` and `--config ... --diagnose` (status `ok`). Followed its stdio registration/timeouts, using absolute Node and built-entry paths instead of a floating global/npx install. The initial project config was ignored because this checkout is not in Codex's trusted-project list. It was removed, and **only** the named MCP table was appended to the user's Codex configuration; trust/permission settings and other servers were preserved. Paths, caches and generated TOML stay ignored/local. The server is user-registered but its workspace is fixed to this companion's telemetry mod and installed game.

`scripts/bridge-community-smoke.mjs` used actual Codex app-server RPC (`thread/start` ephemeral, `mcpServerStatus/list`, `mcpServer/tool/call`), with zero model turns, zero persistent test chats and zero game launches. Results at 2026-11-05T02:26:32Z:

- Exactly ten allowed tools discovered; write/render/world-generation tools excluded. Codex rejected `hoi4.focus_rewrite` as disabled.
- `focus_inspect` advertises `readOnlyHint=false` because it stores analysis reports (`focus/tool-operations.ts`), not because it rewrites mod source. It is explicitly allowed for that purpose; source rewrite and transaction tools stay excluded. Other nine enabled tools advertise readOnlyHint=true. Client allowlists are not an operating-system sandbox.
- `hoi4.source_lookup` found one unshadowed `GER_prioritize_economic_growth`, `game:common/national_focus/germany.txt:124–197`, complete scan with no skipped sources. Agrees with companion provenance and current source SHA256 `ac730be5ccc9095fb400e58b2f7d44501288a94186beb148dbbb0b32cf8ea03c`.
- `hoi4.reference_search` found installed `effects_documentation.md:1854`, `add_political_power`; installed-doc coverage reported 50 files/3,281 sections. Wiki/generated-doc authorities were not used.
- `hoi4.script_validate` accepted `add_political_power = 10` in country scope for syntax/kind/scope, explicitly `parametersChecked=false`. The invented command returned **valid=null**, `SCRIPT_COMMAND_UNRESOLVED`, not a false success or a proven engine error. Neither snippet was executed in game.
- First diagnostic script assumed `ok:true`; upstream uses `status:"ok"`. Saved first failure, fixed only the diagnostic parser, then completed the affected checks. No native retries or broad QA loop.
- New sanitized native-format fixture preserves hour 24 and values while replacing producer identity. Its focused regression passed, including historical replay staying stale. This is recorded-data evidence, not another native test.
- Companion TypeScript check, both helper syntax checks and skill YAML validation passed. Repeating setup left the user's Codex configuration hash unchanged.

Local artifacts: `.bridge-local/agent-tools/{diagnose,codex-registration,codex-tools,focus-source,documentation,valid-script,invalid-script,write-tool-rejection,smoke-summary,first-envelope-failure}.json`, plus `recorded-test.txt`. Summary SHA256: `ef120f6230cb4e5d52db7ff023580024675fbdc9fce28b6890a2a9cf10182576`. The diagnostic connection exited and no game was launched. Previously recorded 174-test/build results still apply to unchanged companion production code; they were not rerun or relabeled as this sprint's tests.

## Reproduce and use

Use Node 24 in this checkout. On another machine, review the pin/source before installation, clone to the manifest's sourceDirectory and detach at the exact revision; do not auto-update it. From that upstream directory:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/typescript/bin/tsc -p tsconfig.build.json
```

From the companion repository:

```powershell
node scripts/bridge-community-setup.mjs '<installed HOI4 game root>' --register-user
node scripts/bridge-community-smoke.mjs '<installed codex.exe>'
node --import tsx --test tests/bridge-recorded.test.ts
```

The setup helper verifies the pin/clean tracked source and refuses to replace a differing named registration. Without `--register-user` it only generates server config and a TOML snippet. Keep `.bridge-local/community/0-hoi4-agent-tools` and `.bridge-local/agent-tools`: the registered command depends on them. To remove registration use `codex mcp remove hoi4_agent_tools`; do not delete unrelated config. Restart/reconnect the desktop MCP client to load the new catalog into existing chats. This chat's verification used the fresh Codex app-server connection; hot-reload into the already-running chat is not claimed. See [official Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Use workspaceId `companion`. Query `hoi4.source_lookup` with the exact ID and kind, then follow revision/continuation fields for bounded source. Use `reference_search`/`reference_read` for installed rules. Use `script_validate` before another game launch; inspect `valid`, `checksPerformed`, unresolved findings and `parametersChecked`, not just MCP transport success. Focus/technology/event/decision inspectors are available but their predictions are not observed state.

For state, continue using the existing bridge CLI/API and replay (README.md). No community tool replaces process/session provenance. If MCP is missing: `codex mcp get hoi4_agent_tools --json`, check the absolute entry/config paths and `--diagnose`, then reconnect once. Stop on a specific diagnostic; do not launch HOI4 to fix MCP startup. A validation `null` needs source/documentation inspection, not a retry loop.

## Milestone 2: qualified observations and one ordinary selection

This sprint closes the community source-analysis gate. The next smallest implementation slice is **M2A: bind a telemetry session to one owned Windows process and expose research/focus readback**, adapting the reviewed Live Tools generation-manifest/logging patterns instead of designing another export mechanism. Continue publishing through the existing bridge. Keep native memory access excluded.

Pass/fail gates, in order:

1. Deterministic tests reject wrong producer, PID reuse/start-time changes, old log generations, unavailable required fields and replay as live evidence. PID binding alone must not upgrade log mtime to per-record freshness.
2. Extend observations only with installed-script-supported active focus/research identifiers and explicit field provenance/verification precision. Unsupported values remain unavailable. Reuse Agent Tools to resolve IDs and validate script scopes.
3. Review/select only the Windows Python Live Tools input/selection path and its dependencies. Wrap behind existing ActionAdapter; no direct MCP mutation bypass, global installer, unbounded console interface or normal-profile takeover. Respect the existing native budget even where upstream retries more often.
4. One planned disposable 1.19.4.1 GER session: compare two fresh research/focus observations to visible UI; observe stopped process as unavailable; capture and replay without the game. Do not touch an existing personal profile; if one exists, isolation is a blocking gate.
5. Only after readback works, select **one** ordinary national focus (`GER_prioritize_economic_growth` if independently eligible) or one research item through the reviewed input path. Require idle-slot/no-active-focus precondition, exact session/version, authorization, and a distinct post-action observation plus visible confirmation. No instant-completion or prerequisite-bypass console cheats. A duplicate request must cause zero additional inputs; stop/timeout must prevent later dispatch.

If the selection or readback cannot be qualified, deliver M2A and retain the rejected/uncertain receipt. The route is concrete but unverified on this patch; no native command success is promised. The alternate route is additional documented log observations and disposable text-save inspection, not changing the saslifat executable allowlist.
