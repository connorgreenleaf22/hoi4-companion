# Campaign knowledge engine — KGE-01

Owner direction recorded November 16, 2026: a campaign adviser with constrained design search. Representative tasks are infantry design for Siam in 1938, tank design for current research, and doctrine/division choices for a country and game plan. Target the current installed patch, all DLC enabled, no mods. Permit labeled estimates separately from independently validated results. Deliver useful slices without blocking the Campaign-first alpha.

## Product and completion contract

The long-term objective is broad understanding of focuses/events/decisions, combat stats and modifiers, division composition, tank/aircraft/ship design, doctrines, spirits and MIOs. KGE-01 implements the first experimental military slice, not that entire objective. It does not claim engine parity, near-complete semantic coverage or a globally optimal design.

“Optimal” requires a chosen objective, finite candidate space, research, active modifiers and constraints. A country/date alone cannot supply those facts. The UI requests manual inputs; no state is inferred from the running game. Search reports the best estimated score inside the supplied bounds. Industry is represented by explicit IC/manpower/width/stat constraints, not production deadlines, stockpile inference or a factory/resource simulation.

Success is measured by player tasks: construct or import designs; inspect the reason a stat changes; identify missing research/illegal slots; compare under a budget; enumerate count/module alternatives; save/reopen; optionally include an explicitly labeled estimate summary in an existing AI advice preview. Owner usefulness acceptance remains pending.

## Storage and integration

Reuse the ordered importer, canonical resolver, SQLite index, existing Node service and renderer. The original AST retains repeated keys, conditions, source lines and hashes. No new database, vector store, backend, game-control bridge or provider is introduced.

- `server/knowledge-engine/` owns the experimental equations, strict schemas, catalogs, bounded search and advice summaries.
- `src/knowledge-engine-types.ts` is the consumer contract. Rules carry `knowledge-estimates-v1`; metrics retain formulas and contributions. Dependencies retain definition references, file hashes, lines, game/index revision and input scenario.
- Explicitly saved comparison inputs live in existing SQLite settings under `knowledge-workspace:<campaign ID>`, with a separate CAS revision. They survive restart and remain separate from campaign facts and strategy approval. Canonical profile JSON export does not yet include these workspaces; use Download inputs to transfer them.
- Incomplete UI drafts live in local storage scoped to campaign and browser/desktop profile. Storage failure is disclosed; malformed drafts have a raw recovery download. Saved inputs and downloaded JSON provide the portable recovery paths. No computed result is silently trusted after a source change.
- `KnowledgeWorkbench` is reached from Division & production. Existing seven-tool navigation, templates, planner and legacy calculations remain intact.

All `/api/v1/knowledge/*` endpoints are local-only and retain the existing host/origin/body-size guards. Request bodies are read before synchronous SQLite snapshots. Workspace writes take an immediate lock and compare their own revision. Catalog pagination is bounded. Unknown fields and numeric overrides reject.

Endpoints: GET `catalog`, GET `chassis`, GET/POST `workspace`; POST `evaluate`, `compare`, `search`. Catalog kind/query/offset/limit provide exact choices; chassis accepts selected modules so turret-enabled categories appear in gun choices.

## Estimate model and explicit limits

Equipment defaults inherit through archetype, never research predecessor. Tank estimates combine chassis defaults, module additions (including chassis module-add multipliers), summed module/upgrade factors and matching equipment modifiers. Required slots, categories, module-added categories, count limits, explicit research unlocks and upgrade thresholds are checked. These checks are a partial designer model: role-specific constraints, production resources, XP, caps and native parity remain incomplete and disclosed.

Division estimates sum full-establishment costs/requirements and approximate full-equipment battalion contributions. They distinguish equipment, unit/category and scenario modifier layers, use estimated organization/support weighting and slowest-unit speed, and use installed highest/average defines for estimated armor/piercing aggregation. Designed tanks can be assigned to divisions. Unsupported support adjusters, dynamic effects and unresolved conditions become explicit issues.

Selected numeric technology/doctrine/idea/MIO blocks apply only to supported targets. MIO initial/individual trait paths can be selected; inherited MIO templates, equipment groups, trait ownership/exclusions, progression, dynamic effects and unimplemented targets remain visible limitations. Selecting a parent organization does not automatically apply every trait. Selected active idea IDs are a complete **manual** assumption for simple condition checks. Research lists are likewise complete manual unlock assertions; research timing/prerequisites are not simulated.

All numbers are `experimental-estimate`, with `campaignEligibility: manual-unverified`. Existing independently qualified resource APIs, five null combat totals, QUAL-195 and strategy/release coverage gates are unchanged. This new path does not promote the older calculations or qualification pins.

By default, blocking gaps exclude a candidate. The user may explicitly include partial estimates with unmodeled effect/support-adjuster gaps; the result retains `partial` status and its omissions. This option cannot waive failed research, missing equipment, slots, module compatibility, count limits, unresolved conditions or source/version mismatch. Actual battle performance, terrain, opponents, supply, training and air/naval interactions are not simulated.

Count/module search enumerates 2–128 candidates, refuses oversized bounds without truncating, and reports its declared search-space completion. The UI varies one dimension; the service supports multiple dimensions. Bounds that can remove every battalion reject with corrective guidance. Saving retains exact generated candidates rather than an unstated search claim.

## Connection to AI advice

`shareWithAdvisor` is an explicit checkbox, off by default, persisted only on Save comparison. The existing AI context builder re-evaluates the shared study. A bounded summary includes the objective, constraints, manual country/date, research/modifier selection names and omission counts, up to three candidate summaries, quality labels and important gaps. Unavailable/stale/mismatched studies supply no numerical recommendation. An invalid optional study cannot block unrelated AI planning.

The summary is part of exact outgoing context, context fingerprint, source-character limit, wire-byte limit and spending quote. Existing data-transmission approval and provider spending rules still apply. No automatic provider call/retry is added. Provider prose may describe the supplied experimental comparison while retaining its limitations; it cannot certify game mechanics, strategy rankings, campaign eligibility or global optimality. `server/planner/coverage.ts` and strategy review continue to decide planning coverage.

## Path toward broad understanding

Advance coverage in three separate columns: indexed definitions, interpreted mechanics and independently validated calculations. Counts or parser tests cannot stand in for the latter two. Preserve a finite patch/DLC configuration and explicit unsupported constructs at each step.

1. KGE-01: deliver the military estimate/search/AI-context slice and obtain owner usefulness feedback.
2. Extend military fidelity where feedback demands it: essential/transport equipment, support adjusters, modifier ordering/caps, MIO inheritance/groups and doctrine prerequisites. Establish patch-matched numerical comparisons before qualifying individual formulas. Preserve estimates when qualification is unavailable.
3. Add richer constraints and doctrine/design searches: supply, production deadlines, stockpiles, opponent/terrain/mission goals and multiobjective tradeoffs. Model doctrinal choices and their prerequisites; selected doctrine bonuses alone are not a doctrine recommendation engine.
4. Add aircraft and ship designer contracts using the same evidence/scenario/evaluation interfaces, with separate legality and mission models.
5. Expand focus/event/decision interpretation through the existing interpreter and planner gate. Prioritize actual selected campaign routes, then shared constructs and country-specific tails. Do not build another focus analyzer or call source reachability live eligibility.
6. Audit remaining spirits, leaders, MIO effects, defines, scripted helpers, condition branches and patch invalidation against the approved content denominator. Broader validated coverage and final release remain separate from shipping an incomplete useful development build.

Each increment must deliver an app task, a source/version invalidation case and the affected verification. Stop a research detour when it supplies no needed rule or user capability; retain the gap and ship the supported estimate path. Do not block ALPHA-01 on exhaustive engine completion.

## Verification

Focused deterministic/HTTP tests: `node --import tsx --test tests/knowledge-engine.test.ts tests/knowledge-engine-api.test.ts tests/ai-planning.test.ts`. Synthetic declarations prove estimator behavior and refusal/privacy/persistence contracts, not HOI4 parity. UI and installed-source checks are recorded separately in the handoff; no real provider or game-control call is part of validation.
