# Game-companion visibility assessment

November 15, 2026. Source baseline: `6f0762a` (`origin/main` when the integration worktree was created). This is an implementation assessment, not a new field-qualification result. The compact desktop modes share the existing application and observation service; changing window shape does not change what the bridge knows.

## What the compact modes can expose now

All modes can use the same campaign profiles, editable planner and strategies, encyclopedia and reference drawers, campaign ideas, division/production tools, field manual, settings, draft review and campaign-intelligence tools. Selected campaign country/date are manual planning context. They must never appear as automatically detected game state.

`GET /api/v1/bridge/platform/status` already supplies the connection state, detected installation version, observations, field availability/qualification, and explicit capability reasons. `BridgeConnection` and `CampaignIntelligence` already expose these within the Command center. Keep these tools reachable in every mode. A compact status summary should distinguish disconnected, log monitoring, and owned connection; observations still require source, game date, capture time, qualification and freshness labels. Recent log writes alone do not prove a running campaign.

The companion currently has no automatic detection of the game screen under the pointer, selected province, unit, production line, or native tooltip target. Quick Intel is an on-demand companion panel, not a patch of the game's hover tooltips.

## Actual observation coverage

| Area | Existing main implementation | Qualification boundary |
| --- | --- | --- |
| Installation and definitions | Read-only installation discovery, version, indexed definitions, source hashes, detected launcher context | Installed content is not current campaign state, DLC entitlement, or proven effective mod precedence |
| Country/date, political power, stability | Older GER telemetry captures and parser | Evidence is exact-version/capture specific; unowned and imported records remain historical |
| War support, research-slot count, civilian factories including trade, military factories, dockyards | Schema-2 telemetry | Narrow GER evidence on 1.19.4.2; current version and ownership checks still apply |
| Basic Machine Tools active-research membership | Named telemetry check | One false-to-true transition independently checked on 1.19.4.2; not the complete research list |
| Other fixed-ID focus/technology checks | Explicit manifest of two focuses and three technologies | Exported subsets; groups are not independently qualified complete inventories |
| Focus/research persisted fields | Explicitly selected plaintext save reader | Player-country and 1.19.4.2 only; parsed-unqualified historical persisted state, not live. Binary and compressed saves refuse |
| Current focus and progress | A save may contain explicit tokens; older owned UI observation is separate | Missing selection cannot be inferred from stored progress. General live identity/progress and progress units remain unsupported |
| Production lines, equipment stockpiles, construction queues, resources, supply network, units/fronts, air/naval missions, detailed diplomacy, pause/speed | No qualified observation provider | Unavailable; factory counts and static definitions cannot substitute for these fields |
| Completion events and complete focus/research inventories | No general qualified live exporter | Snapshot differences are changes between observations, not authenticated game events |
| Native memory and injected tooltips | No implementation | `native-readonly` is a reserved provider source kind, not a working memory adapter |

Main's emitter manifest and save mapping remain pinned to 1.19.4.2. The retained installed-source audit identifies 1.19.5.0; no current-patch native qualification follows from unchanged source hashes. A fresh environment read is required before any experiment. Compact UI implementation does not remove QUAL-195 or the existing combat/explanation/release gates.

## Separate live-Q&A candidate

The `hoi4-live-qa` worktree at `fef4efe` is separate from main. Its player-country successor uses a non-AI daily-hook guard, numeric country values, manpower candidate and a boolean war flag. It remains pinned to 1.19.4.2, with independent country/units/lifecycle verification pending. New records are explicitly parsed-unqualified historical observations; working ChatGPT transport does not establish verified live state. It does not add production lines, supply, stockpiles, full focus/research lists or detailed diplomacy. It is not silently included in these compact desktop modes.

## Native GUI and memory options

Installed primary documentation supports scripted GUI contexts for player, selected country/state, diplomacy target and national focus, with attachment tokens such as top bar, production, logistics and national focus. Source inspected through the existing Agent Tools reference service: `common/scripted_guis/_documentation.md`, lines 1–80, revision `43ce647fc5fde27488855b060b5463c790e5e356149fceb010d36b960b40f838`. This establishes modding hooks, not a generic external React/HTTP rendering channel or tested native tooltip integration. A true game GUI mod would need its own interface/localisation source, dedicated playset testing, and a defined data channel for companion features.

The existing [memory feasibility review](../hoi4-bridge/M7.5-FEASIBILITY.md) and [adapter review](../hoi4-bridge/NATIVE-ADAPTER-FUTURE.md) identify no qualified exact-build Windows memory provider. Previously assessed candidates have incompatible builds, incomplete Windows support, or unresolved reuse licensing. User authorization for deeper integration permits investigation; it does not make historical offsets compatible. No memory reads/writes, DLL injection, hook installation, or installed-game changes were performed for this assessment.

## Next practical depth improvements

1. Make current observation coverage easy to find in every compact mode, while preserving manual planning context and the existing capability reasons. Never replace unknown values with zero or infer live state from the active profile.
2. Qualify a supported current-patch observation path in a disposable campaign: bind exact executable/process/world identity, compare country/date and numerical values against independent paused UI evidence, and test new-game/load/reload/disconnect boundaries. Preserve older evidence and fail closed on unknown versions.
3. Add high-value fields in bounded groups through the existing `ObservationProvider` contract: current focus plus explicit selection/cancellation, complete research assignments, then production deficits and supply context. Each field needs source, units, completeness, version, freshness and independent readback before it may drive planning conditions.
4. If those interfaces cannot expose a required field, use the existing staged read-only memory plan: an immutable exact-build compatibility manifest, least-privilege process access, bounded reads, pointer/count/consistency validation, process-exit handling and independent state comparisons. A plausible memory value is not sufficient. Native tooltip rendering is a separate write/injection problem and should not be conflated with read-only state access.

This assessment makes no claim to see everything in the game. It identifies the exact gaps so future integration can close them without turning missing information into confident advice.
