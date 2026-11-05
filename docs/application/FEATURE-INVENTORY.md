# Companion feature inventory — Milestone 4

Reviewed at `3851fe7` and the M4 working tree on 2026-11-04 EST. This is a source/navigation/service inventory, not a new certification of every inherited QA gate. M4 exercised the Command center intelligence feature and its reference navigation; inherited tests and `QA-LEDGER.md` retain their previous scope.

The app uses Electron `electron/main.ts` with sandboxed React renderer `src/App.tsx`, a local Node HTTP service `server/api.ts`, SQLite `server/store.ts`, ordered source parsing/import, and a separate `bridge.sqlite`. Browser and Electron share the renderer/service. Paired phone access has a separate authenticated listener; bridge routes remain desktop-local. No new service architecture or MCP dependency was added to the app.

| Screen / feature | Actual state and implementation | Limits / immediate integration opportunity |
|---|---|---|
| Command center | Functional navigable home: indexed counts, selected manual campaign, queue/completed summaries, links, curated ideas | Previously no bridge consumer. M4 extends this same screen with observations and history; no duplicate dashboard |
| Campaign Intelligence (M4) | Functional React feature consuming bridge API; installation/version, connection status, snapshot selection, country/date/PP/stability/focus, freshness, provenance, comparison, recording/fixture viewer, existing reference drawer | Observer default; no owned-session attachment UI or continuous log watcher; no gameplay controls; imports are temporary historical views |
| Campaign profiles | Functional local CRUD, selected profile, JSON export, country/date/goals, DLC facts, bookmarks, notes, templates | Manually declared planning state, not a synchronized save. Must not overwrite it with observed values implicitly |
| Campaign planner | Functional source-backed focus tree/list, filtering, prerequisites/exclusivity, queue ordering, alternatives, timing/projections, preview/apply, baseline facts and supported-effect checks (`src/planner`, `server/planner`) | Partial engine semantics, unresolved conditions explicit. No live focus/research scheduling. Verified observations can later seed a reviewed planning baseline |
| Draft safety | Implemented cross-page draft registry, conflict/recovery/download, serialized writes, close guard, migration flow | Native lifecycle and broader fault/keyboard gates remain partial or untested in QA ledger; M4 does not replace them |
| Encyclopedia | Functional kinds/search/filter/bookmarks, source drawer, ambiguity handling, reference provenance, notes, relationship explorer (`ReferenceTools.tsx`, search/knowledge/store) | Static declarations only; MCP layered lookup and graph inspectors can help improve extraction without replacing this UI |
| Campaign ideas | Functional curated/searchable discovery, spoilers, source evidence, scope/DLC caveats, route inspection and eligible planner starters (`Discovery.tsx`, server/discovery) | Editorial/source-backed; not game-verified walkthroughs. Seven expanded initial entries; Japan partial, no starter |
| Division & production | Functional template battalion counts, aggregate personnel/equipment needs, saved templates, equipment comparison and manual production estimates (`Lab.tsx`, domain) | Partial model; not full combat simulator or equipment designer. Naval production explicitly unsupported. No live stockpile/factory inputs |
| Field manual | Functional editorial combat/supply/air/naval troubleshooting and reference searches | Static checklists, not measured diagnosis of the running campaign |
| Sources & settings | Functional installation/index controls, coverage/provenance, DLC setup, phone access, future-work summary | Installed descriptors do not prove entitlement or active campaign configuration. Old broad future-telemetry wording updated for M4 |
| Bridge HTTP/CLI | Functional environment/reference/telemetry/history/replay/gateway services, now consumed by Command center | M3 owned runner is separate explicit test configuration; ordinary desktop startup does not attach to it |
| Owned-session observation | Native startup and idle-focus observation verified in M3; durable metadata/readback architecture and offline failure tests | Experimental, GER/patch/DPI constrained; imported historical ownership metadata does not reconnect the game |
| Focus control adapter | Implemented gateway adapter, durable receipts and preconditions; native recognition failed before input | Incomplete, not advertised as verified gameplay control; no active focus readback qualification yet |
| Agent Tools MCP | Functional developer-side restricted stdio connection; ten permitted tools, three tool implementations exercised locally | Disconnected from application runtime by design. Full capability inventory in `../hoi4-bridge/MCP-CAPABILITIES.md`; connection is not blanket qualification |
| Live research/military/economy state | Missing/unsupported bridge fields | Blocks trustworthy automatic planning from the campaign, supply analysis and military orders; static/manual planning remains feasible |
| Strategic advisor / delegated play | Planned | No game-aware conversational advisor or autonomous player exists; source references and validated observation are prerequisites |

## Duplication and obsolete pieces

- `CountryBrief` in `App.tsx` has no caller; retained rather than deleting unrelated code during M4.
- `scripts/smoke.ts` still refers to the earlier “Countries & focuses” navigation, while the current planner is `CampaignPlanner`. Do not treat that historical smoke script as current full-app acceptance. Use relevant focused scripts; reconcile obsolete broad journeys separately.
- Status API still reports appVersion 0.3.0 while package/sidebar show 0.4.0. Recorded as existing metadata debt; this milestone does not invent a release version.
- Companion parsing/indexing and Agent Tools analysis overlap intentionally at different boundaries: app-owned persistent reference UI versus developer-side deeper source/scenario analysis. Do not add another live-data service or replace the established planner with MCP renders.
- The M1 telemetry freshness API and M3 owned-session contract serve different evidence levels. M4 presents recent log timestamps as history unless the service independently validates an owned live snapshot.

Immediate value is observation review beside existing plans/references. Next, explicitly reviewed snapshot-to-planning-baseline transfer can use country/date/known values without requiring native control. Research/event graph explanations can follow using existing inspector permissions and app reference components.
