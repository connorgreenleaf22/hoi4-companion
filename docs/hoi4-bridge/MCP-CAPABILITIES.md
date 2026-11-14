# Agent Tools 4.7.0 capability inventory

Pinned source: [3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8](https://github.com/klimPaskov/hoi4-agent-tools/tree/3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8). Audited locally in M4; no floating upstream upgrade. Actual `mcp/server/task-tool-catalog.ts`, `mcp/tools/*.ts`, `create-modern-operations.ts`, operation registration and domain services define **28 standard tools**, plus two private opt-in tools. `node scripts/bridge-community-inventory.mjs` reproduces the standard metadata catalog from the reviewed build without tool execution or permission changes.

Ten tools remain enabled in the Codex registration. The companion does not embed an MCP client: Codex uses these development tools; the application uses its existing installed-reference index and typed bridge. Source analysis can inform app features without becoming a second production service. All analysis is source/scenario based, not running campaign telemetry.

## Complete tool matrix

All rows below exist in this pin. `Pass` means our M2/M3 calls through a fresh Codex app-server connection, not upstream README claims or independent QA acceptance. `Not run` means implementation/registration reviewed but its output has not been locally qualified. No independent external acceptance test was run for these tools. Earlier connection checks did not execute all ten enabled tools.

Risk: **R** reads source/declared scenarios, may persist indexes/reports; **A** deliberately produces artifacts/cache (some advertise readOnlyHint=false); **W** edits workspace source; **J** changes background job state. All need bounded requests and source-layer/version/unknown-value handling.

| Tool (`hoi4.` prefix) | Codex enabled | Local execution | Codex development use | Companion value / existing equivalent | Risk / recommendation |
|---|---|---|---|---|---|
| reference_search | Yes | Pass | Find documented primitives | Citation discovery; app has indexed entry search | R; retain |
| reference_read | Yes | Not run | Read located documentation | Precise citations; app source drawer partly equivalent | R; retain, qualify before reliance |
| reference_context | Yes | Not run | Assemble relevant docs | Advisor evidence packets; no app equivalent | R; retain |
| source_lookup | Yes | Pass | Layered symbol/nested-block lookup | Definitions/overrides; app resolver exists | R; retain; don't duplicate resolver |
| script_validate | Yes | Pass, positive and unresolved | Syntax/kind/scope checks | Source diagnostics; prototype validator is narrower | R; retain; parametersChecked=false matters |
| focus_inspect | Yes | Not run | Structure/layout metrics and verdict | Focus graphs; app has interactive graph/list/queue | A; report writes, not source edits |
| focus_render | No | Not run | PNG/HTML/SVG/JSON focus preview, branch crops | Layout review/export; app already navigates focus trees | A; first recommended addition after bounded artifact smoke |
| focus_rewrite | No | Disabled-call rejection only | Create/arrange trees, layouts, preserve rewards | Developer mod authoring, not current app requirement | W; keep disabled; some engine/placement modes require hoi4-engine |
| tech_inspect | Yes | Not run | Explain technology/doctrine dependencies, revision compare | Research planner inputs; app references but no research scheduler | R; qualify existing permission first |
| tech_render | No | Not run | Folder/doctrine graphs with year guides | Research visualization; app has generic connections only | R/artifacts; recommend after tech_inspect qualification |
| event_inspect | Yes | Not run | Trace calls/options/timing/scopes and revisions | Event-chain planning; app generic relationships and curated guides | R; qualify existing permission |
| event_render | No | Not run | JSON/SVG/PNG routes, unresolved edges | Visual decision-path evidence; no dedicated app event graph | R/artifacts; later addition |
| decision_inspect | Yes | Not run | Eligibility/cost/lifecycle under declared scenarios | Decision planning; app references/limited conditions | R; scenario facts are assumptions, not live eligibility |
| impact_inspect | Yes | Not run | Cross-system definition/use graph | Explain dependencies; app relationship explorer partial equivalent | R; qualify existing permission |
| probability_inspect | No | Not run | ai_will_do, ai_chance, MTTH, random_list, strategy factors | Advisor's conditional explanations; no app probability engine | R; recommended bounded addition; missing facts stay unknown |
| probability_analyze | No | Not run | Compare/sweep/simulate/sequence/render declared choices | Sensitivity analysis; no app equivalent | R/artifacts/CPU; defer until inspector validated |
| gui_inspect | No | Not run | Window hierarchy/assets/localisation/fonts/layout | Helps diagnose game UI assumptions; app DOM is unrelated | A; recommended before more hand-built UI coordinates |
| gui_render | No | Not run | Source-based GUI previews/scenario visibility | Reference previews, not actual rendered game state | A; later; unresolved visibility/fidelity explicit |
| gui_rewrite | No | Not run | Full source, helpers, patches, related text files | Development mod GUI authoring only | W; keep disabled; binary art must already exist |
| map_inspect | No | Not run | Province/state/region lookup, references, layers/tiles | Supply/geography references; app lacks province topology | A; bounded lookupOnly first if geography becomes priority |
| map_rewrite | No | Not run | Province/state/supply edits and generated world/scenario | No immediate companion requirement | W; disabled; biome/climate models explicitly blocked |
| mechanic_test | No | Not run | Interpret supported effects on declared state/assertions | Planner parity fixtures; app evaluator has narrower semantics | R; useful later; unresolved effects are not engine success |
| package_check | No | Not run | Manifest links/definitions/assets/localisation/test coverage | Developer mod QA; no equivalent package manifest checker | R; useful for telemetry expansion, not native testing |
| scenario_test | No | Not run | Bounded suites/continuations for mechanics/packages/inspection | Deterministic developer regressions; existing Node tests remain | R/artifacts; source rejects mutating suite operations |
| error_log | No | Not run | Group actual error.log diagnostics | Troubleshooting; app environment diagnostics partial | R + local log privacy; configure owned log location before enabling |
| mod_index | No | Not run | Mod namespaces, folders, symbols, free IDs across layers | Developer mod inventory; app has game index and descriptors | R/cache; low-risk optional addition when expanding mod |
| job_inspect | No | Not run | Retrieve task progress/result | Development diagnostics; not gameplay session state | R; add with long-running artifact tools if needed |
| job_cancel | No | Not run | Cancel owned background analysis task | Developer operational cleanup only | J; explicit target required; does not undo completed writes |

The private `chaosx.visual_revision` computes scripted-GUI revision/cache identity; `chaosx.focus_country_assets` produces flag/portrait assets for a private Discord integration. Both are opt-in stdio extensions, absent from our configured allowlist, untested here, and unnecessary for the companion. No Discord or other external message was sent. Their existence does not authorize that workflow.

## Implementation findings and limits

The domain implementation paths under `src/hoi4_agent_tools/` substantiate the tool declarations: `focus/tool-operations.ts` implements inspection/rendering and transactional rewrite preparation; `gui/tool-operations.ts` does the same for GUI scenes; `map/tool-operations.ts` implements inspection and map/world transactions. `technology/service.ts` builds/analyzes/compares technology graphs; `event/service.ts` builds source-linked chains and revision comparisons. `probability/service.ts` preserves unresolved eligibility, unsupported inputs and missing scenario facts instead of asserting unconditional campaign odds.

`core/analysis-job-operations.ts` registers impact/decision/mechanic/package/scenario operations as read tasks. `mechanic/service.ts` interprets supported declared steps and marks unsupported effects/assertions unresolved. `scenario-suite/service.ts:216` rejects mutating operations as well as using a fixed schema allowlist. These are static/simulated mod tests, not launching HOI4. `reference/operations.ts` routes seven reference tools through the read scope; `error-log.ts` reads bounded known log locations and maintains diagnostics/cursor state; `mod-index.ts` checks identifiers across source layers. Source rewriting uses transactions, validation and changed/proposed file reports; that is not sufficient permission to edit arbitrary directories.

Additional protocol surface: linked artifact resources (authorization-bound, not globally enumerated), local-only `hoi4-agent://server/status`, the `hoi4.probability_analysis` prompt, task progress/results/cancellation, modern and legacy protocol adapters, stdio and optional HTTP transports. Their source presence is verified; these resources/prompts/transports were not all exercised in our client. The current installation uses stdio, not remote HTTP. Tool allowlists do not sandbox filesystem access or automatically constrain prompts/resources.

## Permission decision and workflows

Keep the ten-tool source-analysis default this milestone; no tool permissions or Codex trust settings were expanded merely to satisfy an inventory. First candidates: focus_render and gui_inspect, then probability_inspect, tech_render and job_inspect as a concrete task needs them. Before each addition, review the exact schema and execute one bounded case with output under ignored storage; record changedFiles, source revision, artifacts, unresolved values and elapsed work. Rendering is an approximation until compared with native evidence. Prefer validating already-enabled tech/event/decision inspectors before adding competing analyzers.

Source-writing tools remain disabled. A future approved mod-writing task must use an explicitly named Git-tracked development workspace, clean/reviewable diff, reviewed source layers and transaction preview; it must never target the installation, Workshop files, regular playset or saves. `preview` is tool-specific, not a universal safety switch. Map/world generation is outside current scope.

For app development: use source_lookup for IDs/provenance, the installed-doc tools for supported syntax, and the domain inspector for a specific graph/scenario question. Retain unknowns in the app model, then test the app with fixtures. For focus layout, review the existing app graph before requesting upstream renders; do not replace it. For a strategic advisor, source-defined weights and conditional scenarios must be presented separately from verified observations. No MCP tool in this catalog supplies live focus/research state or a safe bidirectional gameplay API.
