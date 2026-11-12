# UXD-01 — Screen inventory and feature decisions

Repository baseline **bdb8a4887522b38f5110f3900bbf1655cc5fd600**; newer inspected renderer/runtime **155594f9c4d27780b969b217f19b01275d3d01bf**, PR #6 unmerged. See [audit evidence limits](UXD-01-AUDIT.md). Decisions concern future placement/experience, not deletion or implementation authorization.

**Keep** retains a useful capability; **Consolidate** joins overlapping entry points while retaining distinct data; **Redesign** changes the player interaction; **Hide in Developer Mode** moves technical details out of normal view; **Defer** keeps future capability out of current promises; **Candidate Remove** requires owner review before removal. Evidence: **UI** directly inspected at the numbered capture; **Source** inspected implementation, not a new execution/acceptance test. Subcontrols belonging to one workflow are grouped in a row. This is a complete route/component inventory, not certification of every control's runtime correctness.

## Navigation and shared surfaces

| ID | Screen / feature and entry | Actual current behavior / limit | Decision | Proposed destination and evidence |
|---|---|---|---|---|
| G01 | Seven-item persistent sidebar | Command center, Campaign planner, Encyclopedia, Campaign ideas, Division & production, Field manual, Sources & settings. No chat destination. | Redesign | Five-destination shell; UI 01/09; App:23. |
| G02 | Global content search | Name/alias/ID search across categories; category results and open/all-results actions. Reference search, not strategic conversation. | Keep | Tools and contextual search; UI 30/31; UniversalSearch. |
| G03 | Campaign selector / create / edit / delete | Selected profile persists locally; campaign switch and profile editor. Delete has confirmation. Manual state, not a running save. | Consolidate | Shared context strip and Campaign; UI 07/09; delete source-inspected only, App:185,212. |
| G04 | Campaign setup / country/date/goals/historical AI | Germany defaults; large country select includes generated tags; editable goals. | Redesign | Optional progressive context setup; UI 07/08; ProfileEditor in App. |
| G05 | DLC ownership and enabled-state assertions | Separate evidence, legacy assertions retained, per-DLC manual yes/no/unknown; optional collapsed panel. | Keep | Campaign applicability; human-readable summary; UI 07; DlcSetup source. |
| G06 | Source reference drawer | Description, mechanics, prereqs, source/relationships, bookmarks and notes; opens across features, Back and close. | Consolidate | One contextual evidence drawer; UI 13; EntryDetail/ReferenceIssue/RelationshipExplorer. |
| G07 | Ambiguous/stale reference resolution | Keeps missing reference, shows candidates/reason; deliberate choice before use. | Keep | Same drawer; Source ReferenceIssue. |
| G08 | Draft/conflict recovery / download / close guard | Planner/profile registries, serialized saves and revision conflicts; AI editor is not registered. | Redesign | Shared draft controller covering every editable object; UI 19/21; App:65–67, drafts, close-guard. |
| G09 | Error/toast/loading and paired-phone login states | Global and local feedback; remote pairing form when unauthorized. | Consolidate | Consistent status/action components; UI 08/10; App/api source; no phone pairing run. |

## Command center and campaign observations

| ID | Screen / feature and entry | Actual current behavior / limit | Decision | Proposed destination and evidence |
|---|---|---|---|---|
| H01 | Home hero and repeated task links | Large branding/choose-country actions; tools/cards repeat sidebar navigation. | Consolidate | Launch variants' task entry; UI 01. |
| H02 | Indexed content counts and source footer | Country/focus/entry totals, last index and sources link. Counts are not coverage quality. | Hide in Developer Mode | Normal patch/context chip; UI 01/15. |
| H03 | Manual campaign cards / new campaign | Queue/completion summaries, plan/open/edit actions and recent profile context. | Redesign | Campaign and typed saved library; App overview source; UI 06–09. |
| H04 | Featured campaign ideas | Three short guide teasers / All campaign ideas. | Consolidate | Discovery entry within Chat/Tools; UI 01/02. |
| H05 | Campaign Intelligence status / refresh | Distinguishes local bridge, owned session, observer mode and installation; empty-state instructions. | Redesign | Plain campaign availability and next action; UI 01/16. |
| H06 | Installation/connection details | Paths, configuration caveats, environment diagnostics. | Hide in Developer Mode | Brief normal applicability explanation remains; UI 24; CampaignIntelligence. |
| H07 | Read-only observation connection | Detected log/custom path/owned manifest, Connect/Disconnect/Check and polling status. | Redesign | Campaign setup with capabilities explained; UI 24; no connection activated. |
| H08 | Plaintext-save inspection | Path input/read-only request; binary/compressed saves unsupported; field qualification shown. | Redesign | Optional historical-context import, not initial redesign dependency; UI 24 + BridgeConnection source; no real save read. |
| H09 | Capabilities and MCP diagnostics | Paths, connection descriptor/tool/capability details. | Hide in Developer Mode | Developer diagnostics; UI 24 + source. |
| H10 | Emergency stop integration | Stops monitor and latches shared command stop; no undo or game close. | Keep | Visible when integration active; advanced placement otherwise; UI 24, source only; not clicked. |
| H11 | Recording import / provenance / persistent library | JSONL file, fixture vs origin-unverified historical, duplicate handling, select saved recording, return to bridge. | Redesign | Clear historical-context import; keep provenance; UI 16/17. |
| H12 | Recording removal confirmation | Type recording name; original file and planner baselines preserved. | Keep | Recording library management; source only; not executed. |
| H13 | Country/session/snapshot filters | Separate sessions; snapshot date/country/capture metadata. | Consolidate | Campaign evidence history; UI 16. |
| H14 | Last observed facts / focus / stale indicator | PP, stability fraction, engine date; missing fields explicit. Expanded bounded research/factory observations when present. | Redesign | Player units, timestamps and unavailable-fact actions; UI 16/17; expanded branch source only. |
| H15 | Snapshot comparison | Same-session/version/country limits; PP/stability deltas and focus transition. | Keep | Historical comparison workspace; UI 16. |
| H16 | Raw observation provenance and unavailable list | Log offset/hash/session; explicit incomplete inventory. | Hide in Developer Mode | Keep understandable missing-fact summary in normal mode; UI 17. |
| H17 | Plan from this snapshot | Preview/confirm new workspace, optional tree; original plans/history remain. | Keep | Reviewed context adoption; UI 16 form and BaselineTransfer source; not applied. |
| H18 | Planner observation-baseline display | Origin/time and retained evidence; observations do not automatically overwrite assumptions. | Consolidate | Shared context inspector; PlannerObservation source. |

## Campaign planner and whole-strategy editor

| ID | Screen / feature and entry | Actual current behavior / limit | Decision | Proposed destination and evidence |
|---|---|---|---|---|
| P01 | No-campaign planner gate | Requires saved campaign before displaying strategy tools. | Redesign | Allow exploratory question before durable campaign setup; UI 06. |
| P02 | Alternatives / plan name / copy / delete | Multiple saved focus plans, active alternative and replacement handling. | Consolidate | Typed library + route workspace; UI 08/09; CampaignPlanner source. |
| P03 | Country/tree/date / tree rules | Explicit definition tree, nominal baseline and applicability warning. | Consolidate | Shared context + advanced route selection; UI 09. |
| P04 | Unsaved preview / refresh / apply / cancel / download | Reviewed activation uses revisions/fingerprint, preserves actual history. | Keep | Consistent Save/Use route lifecycle; UI 08/09; plan service. |
| P05 | Whole-strategy objective form | Nested inside focus planner, optional local manual draft or paid-provider generation. | Redesign | Primary conversation → strategy workspace; UI 09/10/25. |
| P06 | Session provider configuration | Model, API key, output cap, use/forget key; no test request from setup. | Consolidate | Settings plus contextual setup; UI 09; AiPlanner source; no credential entered. |
| P07 | Budget/effort/threshold controls and approvals | Persisted budget/holds; transmission and above-threshold approvals; local limits not invoices. | Redesign | Clear quote/approval with advanced options; retain enforcement; UI 10; source. |
| P08 | Manual campaign context | Text only; explicit manual assertion, no silent snapshot injection. | Consolidate | Reviewed context editor shared with Campaign; source/UI 10. |
| P09 | Source bundle preview / disclosures / omissions | Local retrieval; exact inspected Germany prompt exceeds 180K. | Redesign | Readable sources and scope recovery; UI 10. |
| P10 | Additional canonical AI context references | One reference per line, manual exact-ID correction. | Hide in Developer Mode | Normal source picker; source AiPlanner. |
| P11 | Generate / revise / cancel provider request | Editable provisional result; save edits/preview/approve fresh request; cancel cannot reverse costs. | Keep | Chat/workspace action with explicit quote; source only, no generation here. |
| P12 | Local manual strategy editor | Name, focuses/reorder/remove/add; recommendation advice/category/conditions/references; secondary goals, assumptions, risks, milestones, alternatives, unknowns. | Redesign | Read mode + focused edits; shared draft protection; UI 19–21/25. |
| P13 | Save/recheck, independent mechanics and coverage | Local save/review works; provisional ranking restrictions remain; technical detail expandable. | Keep | Summary plus evidence drawer; UI 25; 55 checks specific to synthetic one-focus case. |
| P14 | Draft focus sequence as alternative | Copies focus items only; whole-strategy document remains separate. | Consolidate | Precise “Use focus route” in strategy workspace; UI 25/source. |
| P15 | Request history / costs / recovery / export | Schema-2 attempts preserve structured content/usage; local recover without another paid call; private text in exports. | Consolidate | Activity/history + recoverable drafts; request internals in Developer Mode; source/UI 10/26, historical acceptance. |
| P16 | Saved whole strategies and comparison | Separate saved list/revisions, 2–3 unranked document columns. Reopening inserts editor above list. | Consolidate | One typed Saved Plans & Designs library, focus/scroll restoration; UI 26 + source. |
| P17 | Objective search / suggestions / inspect / prerequisite paths | Bounded source-defined route exploration, not full strategic optimization. | Consolidate | Same objective workspace; StrategyWorkbench source/UI 08. |
| P18 | Review current draft coverage | Source risk gate for actual plan, unsupported mechanics vs unavailable facts. | Keep | Explicit validation status; source strategy/review. |
| P19 | Compare saved focus alternatives | Select 2–4 plans, shared/conflicting definitions and declared rewards; unranked. | Consolidate | Comparison workspace with object type explicit; source/UI 08. |
| P20 | Decision/technology lookup | Country/all-country reference browsing, search, pagination and full mechanics/relationships. Availability/research state not observed. | Consolidate | Contextual reference drawer and Tools; StrategyWorkbench source. |
| P21 | Focus tree/list, filter, zoom, remembered view | Source positions/links, alternate list mode; no claim all source branches selectable in campaign. | Keep | Route workspace; CampaignPlanner source/UI 09/22. |
| P22 | Focus queue editing / timing / requirement projections | Add/reorder/remove and nominal sequential dates; bypass/progress/current conditions bounded. | Keep | Route workspace; source/UI 08/09. |
| P23 | Manual assumptions/baseline editing | Explicit planning facts, editable hypothetical conditions and warnings. | Keep | Shared context with provenance; CampaignPlanner requirements source. |
| P24 | Actual manual completions | Separate from planned queue and checklist checks. | Redesign | Precise “Record completed in game”; preserve storage; source/UI 08. |
| P25 | Saved source checklists | Capture saved conditions/sources; check items/name/manage; does not complete focus. | Consolidate | Tasks attached to typed plan; source/UI 08. |

## Discovery, references, military tools and settings

| ID | Screen / feature and entry | Actual current behavior / limit | Decision | Proposed destination and evidence |
|---|---|---|---|---|
| D01 | Campaign guide catalog | Search objective/country, My country, bookmarks; four visible by default, spoiler filtering. | Redesign | Discover/compare ideas via Chat/Tools; UI 02/18. |
| D02 | Spoiler reveal | Deliberate per-visit reveal; hidden snippets/references are not loaded into visible search. | Keep | Clear Show/Hide secrets control; UI 04/05. |
| D03 | Guide article | Objectives/preparation/difficulty rationale, editorial/script claims, limits and raw review evidence. | Redesign | Concise comparison summary + expandable guide/evidence; UI 03/29. |
| D04 | Guide starter preview/apply / bookmark / plan country | Context/revision checked starter and checklist; stale guide refuses. | Keep | Safe provisional recovery/explanation; UI 03, Discovery/discovery service. |
| D05 | Formations/restorations raw catalog | Search/pagination and reference open; includes cosmetic/non-nation decisions. | Redesign | Curated player discovery plus advanced full catalog; UI 05. |
| R01 | Encyclopedia category/reference filters | Search, kind/category/country/year/bookmark filters and pagination; unfiltered lexical results are technical/noisy. | Consolidate | Tools and contextual search; UI 12/30. |
| R02 | Plain-English mechanics + detailed conditions | Shared structured interpretation, linked rewards, uncertainty and requirements. | Keep | Same semantic rendering reused in advice/evidence; UI 13. |
| R03 | Bookmarks/notes / plan or complete focus from drawer | Campaign-bound saving and planner entry, separate reference notes. | Consolidate | Unified library; precise completion action; UI 13/source. |
| R04 | Relationship explorer / direction/type filters | Typed resolved/unresolved links; scope/declaration details visible per relationship. | Hide in Developer Mode | Human-readable “requires/unlocks/affects” normally; raw graph metadata advanced; UI 13. |
| R05 | Full script/provenance / hashes / source accounting | Exact source details support inspection and reproducibility. | Hide in Developer Mode | Keep human-readable citation accessible; UI 13/15. |
| L01 | Division composition/count calculator | Battalion/support counts; base width/manpower/org/supply and total equipment/personnel; excludes modifiers/layout simulation. | Redesign | Supported design workspace with limits/assumptions visible; UI 20/28. |
| L02 | Saved templates / load / compare / delete | Campaign-bound named row compositions; comparison uses current division-count context. | Consolidate | Typed Saved Plans & Designs library; Lab source; saved-template actions not all exercised. |
| L03 | Equipment needs → production | Seeds quantity/equipment into one line; manual stockpile/factories etc remain inputs. | Keep | Existing valuable cross-tool seam; UI 11/20/source. |
| L04 | Production estimator | Constant efficiency, manual factors; unsupported naval model and missing costs refuse. | Keep | Plan-side what-if; UI 11. |
| L05 | Base equipment comparison | Two dropdowns, declared years and base stats; modules/upgrades/tech/campaign excluded. | Redesign | Searchable contextual comparison with readable units and applicability; UI 11/source. |
| M01 | Field manual | Four static combat/supply/air/naval checklists and reference searches; no live diagnosis. | Consolidate | On-demand help/fallback advice with editorial label; UI 14. |
| S01 | Installation/index refresh and import warnings | Read-only game-source indexing updates local index, preserves campaign content; mod overrides not merged. | Keep | Settings, concise applicability warning; UI 15; not refreshed in audit. |
| S02 | Phone network pairing | Opt-in local HTTP access, 24-hour pairing; local observation routes remain restricted. | Defer | Retain capability under Settings; secondary to personal Windows second-monitor product, no removal; UI 15/source. |
| S03 | Campaign storage import/export/edit | Schema-version checks; import as new profile; storage separate from HOI4. | Keep | Settings/library management; UI 15/source; no user imports/exports run. |
| S04 | Source-order explanation / wiki/update links | Static evidence hierarchy and optional external links. | Consolidate | Brief About sources + per-answer evidence; UI 15. |
| S05 | Coverage census / roots / relationship resolution / manifest export | Accounting, unsupported roots and per-file omissions; not full semantics. | Hide in Developer Mode | Developer evidence tools; UI 15/source. |
| S06 | Future milestones list in settings | Static list and “No AI dependency” copy lag current partial implementations. | Candidate Remove | Replace with accurate capability availability if needed; UI 15. No deletion authorized. |
| X01 | `CountryBrief` function | No caller in current App; source-only unused UI, not an additional current screen. | Candidate Remove | Confirm no consumers in future cleanup; source App:216. |

## Absent or unmerged capabilities — not current screens

| Capability | Decision | Boundary |
|---|---|---|
| Persistent AI conversation/adaptive workspace | Redesign | Approved direction; no current chat history/composer workflow. No implementation in this audit. |
| Tank/aircraft module designers, validated scenario comparisons | Defer | Static module references exist; that is not an operable designer or validated outcome model. M7.4.2 supplies a bounded infantry/medium-tank evaluation foundation; module designers and aircraft design need separate scope. |
| Qualified broad live campaign Q&A, alerts and automatic context | Defer | PR #4 unmerged; native pilot incomplete. Existing observation review remains available. |
| Numerical strategic ranking/optimizer/full campaign simulation | Defer | Coverage gate must remain; no qualified utility/simulator. Editorial fun/difficulty comparison may still be useful. |
| Save editing, gameplay controls/delegation | Defer | Future separate qualified/authorized work; not added by a redesign. |
| Broad air/naval/logistics/construction optimization | Defer | Reference/help content exists; numerical/live analysis remains unsupported or incomplete. |

No row recommends deleting a valuable backend capability. The only removal candidates are static stale roadmap UI and uncalled presentation code. Consolidation must preserve distinct histories, object types, qualification and recoverability.
