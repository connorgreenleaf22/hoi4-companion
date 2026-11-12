# UXD-01 — HOI4 Companion product and UX audit

**November 11, 2026, America/New_York. Read-only audit; owner acceptance pending.**

Evidence/status manifest: [UXD-01.json](../milestones/UXD-01.json). This local audit does not change the acceptance state of [PR #6](https://github.com/connorgreenleaf22/hoi4-companion/pull/6) or the live-Q&A pilot.

The application has useful local reference, planning, editing and evidence capabilities, but asks the player to assemble a strategy workflow from separate utilities. A frontend redesign over the existing services is justified for exploration and prototyping. It should first protect unfinished work and connect advice to editable plans and calculations. It cannot, by itself, supply missing mechanics, observations or military-design models.

The strongest new finding is a reproducible loss of an unsaved whole-strategy draft when navigating to another tool. The strongest task-completion blocker in this inspection is the broad Germany objective exceeding the local AI-context size limit before dispatch. These are distinct from the approved product direction and from visual preferences.

## Baseline and evidence limits

| Identity | Exact status |
|---|---|
| Repository analysis baseline | `feature/hoi4-ai-m731`, **bdb8a4887522b38f5110f3900bbf1655cc5fd600**. User explicitly confirmed this shared baseline. |
| Audit branch | `audit/uxd01`, isolated checkout `C:/Users/conno/.codex/worktrees/hoi4-uxd01-baseline/hoi4-ai-m731`. Only audit documents are intended changes. |
| Latest appropriate retained application candidate | **M7.3.1-155594f9c4d2-windows-x64.zip**, runtime **155594f9c4d27780b969b217f19b01275d3d01bf**, from draft PR #6. This is an available development candidate, not a merged release or an accepted product. |
| Package identity | ZIP SHA256 `3eaad6e5da22d01006d4c150fbdcc5a4c887439b3c4c31f00655a1c612e4ee6f`. `app.asar` SHA256 `7841688340ea8e6d1393674cd0a0f7e1fcaa1c7cf6d03e51b4edf3ec3c8b5c8d`; ZIP member and retained unpacked member match. |
| PR #6 | Open/draft/unmerged at remote check; head **dfb27ec6a3b19e3a4240e550d501441db522c499**. Runtime correction is the earlier SHA above; later commit documents acceptance. Do not incorporate this branch without a separate decision. |
| PR #4 | Open/draft/unmerged; mergeable=false at remote check; head **fef4efec13e353d54e7b7afd291c6958e1107873**. Its six-tool campaign-Q&A adapter, recorder and desktop pilot are not capabilities of the inspected M7.3.1 package. |
| M7.4.1 / M7.4.2 | Separate mechanics and deterministic design-evaluation workstreams. Their intended outputs are not credited to the current application. No shared interfaces were changed here. |

The initial evidence checkout was created at PR #6 documentation head before the user's baseline clarification. It remains preserved at `C:/Users/conno/.codex/worktrees/hoi4-uxd01-audit/hoi4-m731-acceptance`, with local evidence under `artifacts/uxd01`. No reset, discard, integration or application source edit occurred. Repository analysis then moved to the shared baseline. The inspected React components and Electron shell have **no diff between bdb8a488 and dfb27ec6**; PR #6 changes AI context/transport/contracts, tests and documentation. Core UI findings therefore also apply to the shared baseline; the specific context-preview result is attributed to the newer candidate/service.

### What actually ran

The extracted, unchanged **package renderer** ran in headless Chrome on Windows, served by an audit-only bundle of the corresponding PR #6 source service. The bundle used `startServer({dataDir:<audit-only>, port:0, autoIndex:false, staticDir:<extracted package dist>})`. This is browser-equivalent UI evidence, **not a fresh execution of packaged Electron or its bundled backend**.

Native launch was deliberately skipped to preserve the existing profile: `electron/main.ts:10–15` creates its fixed development Electron profile under AppData even when the database directory is overridden. The existing package's previous successful native acceptance is historical evidence only. No claim that native launch is unavailable is made.

The disposable database contains only retained source-index data: 65,144 entries, 1,912 source hashes, aliases, definition identities, relationships, meta, coverage and guide hashes. Profiles, keys, provider attempts and real observations were not copied. Its source version is **retained HOI4 1.19.4.2**, not newly verified campaign configuration. The bridge received deliberately empty game/profile roots; **“Game installation unavailable” in these screenshots is a fixture condition, not an installation defect**. One manually created Germany profile, manual strategies and an explicitly synthetic stale two-snapshot recording were used. Browser external-origin requests were blocked. No provider was configured or called, monitoring connected, phone listener enabled, game launched, save inspected or production state changed.

Screenshots use **1920×1080** and **1100×900** CSS viewports. They establish layout at those sizes, not physical second-monitor/DPI usability. Evidence is local-only: [annotated gallery](../../artifacts/uxd01/index.html), [measurements](../../artifacts/uxd01/journey-measurements.json), and [complete inventory and decision matrix](UXD-01-INVENTORY.md). Gallery captions annotate unmodified captures; source and DOM observations supplement pixels. Raw locally extracted game/index data must not be published with the report.

## Ranked problems

Severity describes impact on the approved player tasks: **High** = lost work or blocked core task; **Medium** = substantial friction or misleading expectation; **Low** = limited clarity/maintenance problem. This is an expert inspection, not a measured player study or frequency estimate.

| Rank | Severity and problem | Supporting evidence | Diagnosis and recommended response |
|---|---|---|---|
| 1 | **High — unsaved AI/manual strategy disappears across tool navigation** | Captures **19 → 21**: enter local draft/name/advice, navigate Division & production, return; proposal absent, objective blank, close-state `unsavedDrafts=0`. `AiPlanner.tsx:15–22`; `App.tsx:65–67,176`. | Reproducible frontend state/persistence defect. Include whole-strategy drafts in cross-route recovery and close protection before encouraging combined workflows. Saved content is a separate case; no saved-data loss was observed. |
| 2 | **High — broad Germany request cannot reach a source preview** | Capture **10**: exact request below yields “Source bundle exceeds 180,000 characters…”, before provider call. `server/planner/ai.ts:67`. | Context-selection/unfinished implementation limitation, with poor UX recovery. Support bounded task decomposition or explain which scope to narrow; preserve the hard cap. Do not claim every Germany prompt fails or that changing layout fixes retrieval. |
| 3 | **High — strategy-to-design task has no connected completion path** | Captures **09,20,25** and `Lab.tsx:117,151,161`: strategy recommendations are text/reference lists; Lab is manually entered counts/stats, excludes modules/variants/technology. | Both UX integration gap and absent numerical/design models. Offer supported division/production work beside the plan; wait for qualified M7.4.2 contracts before promising calculated combined designs. |
| 4 | **Medium — entry architecture hides the intended product** | **01** spends its first viewport on setup/intelligence. Seven sidebar destinations describe utilities. **09** places “Build a whole strategy” after alternative, country, tree and applicability controls; objective area reaches below the first viewport. `App.tsx:23`, `StrategyWorkbench.tsx:41`. | Information architecture issue. Make asking for strategy and discovering paths primary entry actions. Keep tools directly reachable. Test both approved launch variants; this audit does not choose between them. |
| 5 | **Medium — discovery helps read paths but cannot compare them as player choices** | **02,18,29**: read Austria/Hungary independently; no discovery comparison control. All four default guide cards use Hard. Existing comparison controls are saved focus alternatives or whole-strategy documents. | UX/data-content gap. Add comparable fun/style, difficulty rationale, risks, DLC and preparation fields, preserving editorial vs calculated status. No unsupported objective numerical ranking. |
| 6 | **Medium — stale guides end in a refusal without a recovery route** | **03/29**: authored 1.19.4.1 versus retained 1.19.4.2; starter preview disabled. Version mismatch remains after copying complete coverage/hash metadata. `server/discovery.ts:18,32`. | Correct evidence gate plus maintenance/recovery gap. Preserve refusal to apply stale starters; keep readable advice, explain what changed/needs review, and offer a clearly provisional manual starting path. Do not simply remove verification. |
| 7 | **Medium — observations are honest but do not help finish a question** | **16,17,24** expose local bridge vs owned-session state, import provenance, engine date, stability 0.81, missing focus and paths. No question/composer or guided fallback. `CampaignIntelligence.tsx:48–51`; `BridgeConnection.tsx`. | UX wording/actionability plus absent observations/conversational integration. Show “No verified live campaign”, usable last-known facts and the next useful manual question. Never invent inventory, current focus or campaign readiness. |
| 8 | **Medium — reviewing a strategy is a long editable form** | **25–26**: a 1,258-character synthetic recommendation occupies a **73px-high textarea with 201px scroll height**; saved editor makes document height **5,430px**. Prior real-provider report independently noted short scrolling fields and generic source labels. | UX component issue. Readable advice by default, focused edit mode, expanding fields, structured sources and section navigation. Keep full editability and review after changes. |
| 9 | **Medium — “saved”, “alternative”, “completed”, “checked” and “apply” describe different objects** | **08,25,26**, planner source: whole strategies save separately; “Draft focus sequence as alternative” copies only focuses; reviewed Apply activates a plan; actual manual completion/checklists are separate. | Conceptual UX issue. Use one library with explicit item types and precise actions (“Save strategy”, “Use this focus route”, “Record completed in game”). Preserve underlying distinctions. |
| 10 | **Medium — several technical surfaces occupy normal player space** | **03,13,15,24**: source file paths/hashes, relationship scope paths, coverage census, manifest/MCP diagnostics, origin controls, emergency-stop latch. | Progressive disclosure issue. Keep short verification explanations and human-readable sources available normally; move developer accounting, raw schemas/IDs and connection diagnostics to Developer Mode. Emergency stop remains accessible when an integration is active; never bury an applicable safety control. |
| 11 | **Low/Medium — navigation preserves an unrelated document scroll position** | **11** opens Lab midway down after scrolled planner; **20** shows its top after explicit scroll reset. `App` conditionally replaces page content without a per-page navigation scroll policy. | Frontend navigation issue. Define per-route restoration and focus, and bring reopened saved content into view. No blanket claim that every navigation mispositions. |
| 12 | **Low — stale marketing/status copy weakens the mental model** | **15** lists research/decision paths and AI advisor as future while planner already contains related implementations; status API says 0.3.0, sidebar/package 0.4.0. Formations text says “Use Secrets hidden to reveal…” (**04**). | Content/metadata debt. Remove static milestone roadmap from player settings or derive accurate capability status; use explicit reveal action. Do not change release identity as part of this audit. |

## Three current workflows

### 1. Discover and compare interesting alternate-history paths

From Command center, select **Campaign ideas**, open Austria's guide, then Hungary's. Three inspected actions expose useful narrative, preparation and difficulty rationale. However, the player must remember and compare two long articles. The expanded Austrian card alone was over two viewport heights during inspection. Source review/provenance is mixed into that reading path; it is not a concise decision summary. Secrets are deliberately hidden on each visit, and formation candidates require revealing them before search; this is a valuable spoiler boundary with an awkward action label.

Switching to **Formations & restorations**, revealing secrets and searching “Scandinavia” returns two installed-script candidates, including “Scandinavian Expansion” and “Restore the Kalmar Union”. This is a raw decision catalog, not a shortlist of interesting playable nations; the UI correctly says some candidates are cosmetic transformations. Reading a reference is possible. Comparing fun, difficulty and tradeoffs across candidates is not.

Starter previews are disabled for the retained patch mismatch. **Plan this country** starts campaign setup, but is not a bypass of stale route review and does not create a trustworthy complete campaign plan. Existing two-to-four-plan focus comparison and two-to-three whole-strategy comparison become available only after creating/saving their respective objects; they do not supply discovery comparison by fun or difficulty.

**Outcome:** partial success for browsing; requested decision/comparison task unfinished. Keep curated content, spoiler protection, source links and safe starter preview. Consolidate discovery and comparisons around the same player objective, without pretending editorial difficulty is deterministic optimization.

### 2. Ask for Germany strategy and inspect military designs

With no profile, **Campaign planner** gives only “Create a campaign to plan its focus sequence” (**06**). Create campaign; the modal defaults to Germany, 1936, historical AI, with optional goals and collapsed DLC assertions (**07**). After Save, select the German tree and apply the reviewed planning context if using a saved baseline. Whole-strategy generation is already present; it is not absent from the app. It appears below focus-planner context rather than as a named primary destination.

The exact inspected objective was:

> Give me a Germany 1936 campaign strategy with infantry and medium tanks, research and production. Prioritize fun, then winning, then efficiency. Current campaign state is unknown.

**Preview AI source bundle** returns the 180,000-character refusal (**10**). No generation was attempted. The message offers no suggested narrower objective, scoped source selection or visible estimate showing what must shrink. This establishes a blocked request in the newer candidate; it says nothing about real-model Germany output quality.

**Start local draft** works offline. A synthetic saved proposal with one economic focus and a preparation note saved and reviewed as provisional, retaining 55 interpretation/campaign checks. That count is specific to this fixture, not a coverage percentage. The full editor contains focus reorder/remove, recommendation categories, source references, conditions, assumptions, risks, milestones, alternatives, unknowns and revision instructions. Saving protects this version; navigating away with an unsaved version did not (**19–21**).

To inspect a military design, leave the planner for **Division & production**. The default nine-infantry, 24-division example reports 216,000 personnel and 21,600 equipment in the inspected index, with base width/organization/supply cards (**20**). These are a demonstration of current calculator output, not independently certified formulas or a recommendation. The equipment-needs row can seed production quantity, a useful existing connection. The estimator assumes constant efficiency and manual stockpile/factory/output inputs (**11**). Equipment comparison displays base stats; it excludes modules and upgrades. No combined strategy-to-template binding, tank/aircraft module editor, battle matchup result or validated optimal design exists in this baseline.

**Outcome:** local drafting and bounded calculations work; the complete requested strategy/design task is blocked by retrieval and missing models as well as disconnected UX. Preserve the calculator seam, require M7.4.2 qualification, and make returning to the strategy safe.

### 3. Ask about the current campaign with incomplete observations

Command center initially shows **Local bridge connected**, **No owned game session connected**, **observer mode** and **No campaign observations yet** (**01**). These are different technical states, and they are accurately distinguished. The deliberate empty game roots explain the installation warning. Refreshing cannot turn absent observation into live state.

The inspected fallback imported two **explicitly synthetic** GER snapshots with 2020 capture timestamps, game dates 1936.01.01.24/1936.01.02.24, PP 2/4 and stability 0.81. The UI labels them Offline test fixture and Stale, keeps focus Unavailable, and compares PP +2 / stability +0 without asserting a live game (**16–17**). This is a strong evidence boundary worth retaining. The UI also offers a reviewed **new** workspace from a snapshot; it does not silently overwrite the current plan.

The player still cannot ask “What should I do next?” in this screen or receive a fallback based on these selected facts. They must interpret unavailable fields, possibly inspect a plaintext save path, or return to the planner and enter manual campaign text. `AiPlanner`'s optional text is a manual assertion; the recording is not silently injected. That protects truthfulness, but the user has to bridge context between utilities. A redesigned experience should state which facts it can use, ask only the missing high-impact questions, and offer labeled general advice meanwhile. Current army, stockpile, focus and production readiness cannot be inferred from PP/stability.

**Outcome:** successful truthful evidence review; no completed in-app campaign-Q&A task. PR #4's separate six-tool adapter must remain explicitly unmerged and independently qualified.

### Interaction measurements

| Inspected segment | Semantic actions | Automation elapsed |
|---|---:|---:|
| Open discovery; expand Austria and Hungary | 3 | 725ms |
| Existing saved Germany profile → fill exact objective → blocked local preview | 3 | 6,277ms |
| Retained synthetic recording → compare snapshot → reveal unavailable fields | 3 | 46ms |

These are one-run headless automation segments with no human reading/thinking, first-time setup, provider latency or game execution. They are **not end-to-end completion times, benchmarks, or evidence that a human can perform the journeys this quickly**. The first Germany setup additionally used Create campaign, name/goals fields, Save, tree selection and Apply; defaults can reduce that path. All three desired end states remain partially or wholly unavailable, so there is no honest successful task-completion timing. Reproduce using the named controls and exact fixture/prompt above; timings vary by machine and index. An early harness wait used an incorrect success string and timed out; recovery reopened the persisted disposable profile. This was not classified as an application failure.

## UX versus capability boundaries

| Problem class | Examples | What a redesign can and cannot accomplish |
|---|---|---|
| UX defects | Unsaved draft loss, cross-page scroll, short advice textareas | Fix continuity, navigation and reading/editing without changing mechanics. |
| UX architecture/content | Buried strategy entry, multiple saved-object concepts, no discovery comparison, fractions/technical jargon | Reorganize access, expose player tradeoffs, use readable units and progressive disclosure. Keep evidence distinctions. |
| Knowledge-engine limitations | Conditional scripted helpers, dynamic values, Brazil event outcomes; historical provider strategy still had 106 blocking checks | Present implications and unresolved mechanics clearly. M7.4.1 must improve interpretation; no renderer can certify unsupported semantics. |
| Unavailable observations | Current army/equipment stockpiles, broad current research/focus state, production readiness; native evidence remains narrowly scoped | Ask for manual context or use labeled historical evidence. Never turn freshness, positive membership or imported origin into completeness/ownership. |
| Unfinished implementation | Broad Germany source bundle; absent designers/scenario evaluator; no persistent conversation surface | Needs separately scoped backend/product work as applicable. Moving existing controls is insufficient. |
| Branch/acceptance differences | PR #6 source context fix, PR #4 Q&A pilot, future M7.4 work | Keep build/status labels explicit. Prior provider success, CI and browser fixtures do not imply native or owner acceptance. |

## Architecture that should survive a frontend redesign

| Preserve | Contracts and constraints |
|---|---|
| One local service and store | `server/api.ts`, `store.ts`, ordered `parser.ts`, importer/index worker, SQLite migrations and backup/restore. Retain offline use, one application-owned bridge/gateway and local ownership/auth boundaries. No replacement backend justified by this audit. |
| Canonical source identity | `Entry`, `Resolution`, `TargetRef`, relationships, stable `definition:` references/entity keys, hash/version/index revision and scope. Resolve ambiguous/stale references explicitly; never use displayed English as a mechanical data model. |
| Structured mechanics and review | `MechanicsView`, `mechanics-interpreter`, requirement/explanation trees, guards/recipient/phase, `planning-coverage-types`, `server/planner/coverage.ts`, **POST strategy/review**. Separate unsupported interpretation from missing campaign facts; preserve vetoes on confident ranking/optimization and final-release coverage requirements. |
| Planner data and writes | `Profile` schema 3, `PlannerState`, `CampaignPlan`, `FocusRef`, `PlannerReport`, alternatives, manual completions, checklists, templates/bookmarks/notes; `plan/preview`→`plan/apply` fingerprints and expected profile/index revisions. Preserve conflict recovery, draft download, serialized writes and close protection. Extend protection to whole-strategy drafts; do not flatten every item into a focus ID. |
| AI contracts and cost protections | Provider seam, `AiContext`, `AiGeneration {attempt,strategy?}`, schema-2 attempts, schema-1 strategies, revisions/origin/classification, metadata/usage/held budgets, duplicate prevention, local recover/save, consent/quote fingerprints. HTTP 200 is not successful strategy output. Keep explicit transmission/cost approval and no automatic paid retry. PR #6 context enhancements need separate integration approval. |
| Calculation seams | `calculateTemplate`, `production`, resolved equipment stats, supported/unsupported model boundaries and revision invalidation. Renderers may explain results, not invent missing stats. M7.4.2 owns the bounded infantry/medium-tank evaluation foundation and its candidate/scenario/result contracts; module designers and aircraft design need separate scope. Adapt the workspace after qualification. |
| Observations and history | `bridge-types`, `integration-types`, intelligence, `GameObservation` field qualification, `bridge/platform`, `history/recordings`, import/remove, reviewed `history/preview`→`history/apply`; separate bridge database and imported recordings. Keep static, manual, historical, parsed-unqualified and native-qualified data distinct. Observation transfer creates reviewed context, not automatic assumption replacement. |
| MCP and execution boundaries | Authenticated local adapter, connection credentials, capability checks, shared receipt store/gateway and emergency stop. Source-analysis MCP remains separate. Frontend redesign does not authorize actions or expand adapter permissions. PR #4's read-only six-tool contract remains its owner's independent work. |
| Privacy and compatibility | Session-only keys, local raw saves, no background provider traffic, opt-in phone sharing, preserved old packages and data. Additive adapters and tested migrations are future integration decisions; this audit changes no schema. |

## Proposed information architecture and components

Use five collapsible sidebar destinations: **Chat**, **Campaign**, **Saved Plans & Designs**, **Tools**, **Settings**. The inventory maps every existing capability to them. This describes the shared capability structure; it does **not** select the launch screen. Prototype both chat-first with compact context and campaign-first with a prominent composer, respecting the owner's slight campaign-first preference without treating it as selection.

Chat should answer briefly with a recommendation and reasons, then expand the same request into a workspace. Campaign should hold goals, usable context, missing facts and an opt-in priority feed. Saved Plans & Designs should be one library whose items retain their real types and revisions. Tools should retain offline reference/search, discovery, focus tree, division and production utilities and field-manual help. Settings should hold source/configuration, privacy/provider budget and Developer Mode; connection setup belongs in Campaign with deeper diagnostics behind disclosure.

Build around a shared context strip (country, patch, goal, observation age/qualification), a conversation/composer, an adaptive workspace host, a readable recommendation component with explicit edit mode, a comparison table, synchronized route list/tree, a typed library, a source/evidence drawer and a draft/status controller. Keep route-specific mathematical/observation components behind these reusable frames. Use task-specific renderers for a quick answer, comparison, timeline or design; a giant generic editable form is not an adaptive workspace.

Normal mode should explain “source-backed / needs campaign facts / mechanics unresolved” in player language, with expandable human-readable sources. Developer Mode may expose hashes, raw scripts, scope paths, coverage census, transport diagnostics and request internals. The provider quote and cost/privacy choice stay visible where they affect a request. Preserve user overrides and editable assumptions, while rechecking changed plans and explaining unresolved risks.

At 1100×900 the inspected planner and Lab had no document horizontal overflow, but the planner remained 3,301px tall and placed its AI section about 621px below the document top (**22**). Therefore prioritize reading density, explicit workspace opening, one intentional content scroll area and robust focus/restoration over a mobile-first navigation rewrite. Do not claim full accessibility from these two viewport checks: keyboard-only journeys, screen readers, contrast at actual monitor settings and high-DPI native behavior still need acceptance.

## Highest-value next design opportunities

1. **Protect cross-tool work.** Carry whole-strategy drafts and context safely across navigation; acceptance: the reproduced draft-loss case survives tool/campaign changes and close/reopen according to an explicit draft policy.
2. **Make one useful strategy task the primary path.** In isolated prototypes, ask once, compare two or three ideas, expand the chosen plan and return from its supported calculation without losing context. Compare both approved launch variants; do not ship a preferred layout from this audit.
3. **Connect plan and bounded calculation.** Begin with existing division requirements/production what-if and explicitly label unsupported designer dimensions. Integrate qualified M7.4.2 outputs only after contract review.
4. **Replace the form-first review experience.** Readable recommendations, short actionable risk summaries, section navigation, focused editing and visible save/recheck state; preserve technical evidence on demand.
5. **Make missing context useful.** Distinguish no live connection from usable historical facts; ask the minimum missing questions and provide conditional general advice without claiming live diagnosis.
6. **Give discovery a comparison and stale-content recovery path.** Keep spoilers and source gates; show editorial fun/difficulty/tradeoffs beside DLC and patch applicability. Improve safe provisional continuation instead of bypassing stale validation.

Resolve the Germany context-size issue through its owning AI/retrieval scope; do not hide it as a loading state or spend on a provider to diagnose a local refusal. Preserve M7.4.1/2 ownership and the independent live-Q&A pilot. The next UX implementation, if separately commissioned, should be UXD-02's isolated synthetic prototypes. A full production refactor, functionality deletion, schema change, merge or release is not an outcome of UXD-01.

## Evidence, review and handoff

Read [the complete feature matrix](UXD-01-INVENTORY.md), [independent review](UXD-01-REVIEW.md) and [Rook/HQ handoff](UXD-01-HANDOFF.md). The local gallery annotates the actual captures and records their limitations. Owner usefulness/acceptance and launch-variant selection remain open.

Reference sources checked: repository AGENTS, workflow/HQ procedure, current ROADMAP/APPLICATION-ROADMAP, QA-LEDGER, FEATURE-INVENTORY, M6.1/M7.1/M7.3.1 reports and acceptance/verification receipts; [approved UX brief](https://chatgpt.com/space/page_1796a0d6d2608191855ae01cf559acfd), [work orders](https://chatgpt.com/space/page_cd2019a49b208191a18e2667e194b55c), [HQ protocol](https://chatgpt.com/space/page_0b88523e013c8191ad68670ed056673e), current [PR #4](https://github.com/connorgreenleaf22/hoi4-companion/pull/4) and [PR #6](https://github.com/connorgreenleaf22/hoi4-companion/pull/6). Page read access succeeded; no Page was edited or claimed synchronized. User will pass the local handoff to the separate Rook Dot.
