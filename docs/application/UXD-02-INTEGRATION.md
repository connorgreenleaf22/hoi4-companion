# UXD-02 — Future integration assessment

No production integration is implemented. The prototype imports React, React DOM, Lucide and Zod from the existing dependency installation. It does not import the existing application, API client, provider, evaluator or game services. This avoids their mount-time queries and preserves all user data.

## Reuse map, based on inspected source

| Existing surface | Future reuse and boundary |
|---|---|
| `src/ai-planning-types.ts` | `StrategyContent` already holds objectives, focus references, recommendations, assumptions, risks, milestones, alternatives and unknowns. `AiStrategy` adds revisions, origin, context and provisional review. Adapt these into the workspace rather than storing presentation HTML. `AiGeneration` may contain an attempt without a strategy; HTTP success alone must not open a fictitious result. |
| `src/planning-coverage-types.ts`, `server/planner/coverage.ts`, `POST /api/v1/strategy/review` | Preserve supported/unsupported interpretation, canonical references, gaps and provisional policy. Current confidence/ranking/optimization permissions are false. The prototype's editorial idea ordering cannot be passed off as a qualified mechanical ranking. |
| `src/planner/AiPlanner.tsx`, `StrategyWorkbench.tsx`, `CampaignPlanner.tsx` | Reuse strategy edit/revision concepts, focus preview/apply and conflict handling. Do not mount the complete old form inside the new shell; its route-local draft state caused the audit's loss case. Extract narrow presentation units later, behind explicit adapters. |
| `src/planner/drafts.ts` | Reuse serialized write/dirty accounting, deep-copy recovery and close protection. Extend the registry to whole-strategy and design drafts; prototype localStorage is not a replacement for production migrations or write conflict checks. |
| `src/MechanicsView.tsx`, `planner/CoverageView.tsx`, `EntryPicker.tsx`, `ReferenceTools.tsx` | Preserve structured explanations, requirement trees and canonical reference resolution behind readable evidence disclosures. Decouple presentation from source navigation and API state before direct reuse. Raw paths/hashes belong in Developer Mode; meaning and limitations stay visible normally. |
| `src/Lab.tsx`, `server/domain.ts`, existing calculate/production routes | Reuse equipment selection and bounded calculator seams only with their actual supported inputs. Existing Lab excludes modules/variants and is not a qualified combat designer. Never use zero defaults or unsupported fields as confident outputs. |
| M7.4.2 candidate, PR #8 | Read candidate report and design-evaluation contract without importing or merging. Its evaluated static full-establishment resource inputs/results cover bounded infantry and fixed medium models. Production may adapt `evaluateDesign`, `compareDesigns`, `designResultIsCurrent` and `indexedDesignSource` after integration approval. Attack, defense, breakthrough, terrain, supply, fuel and combat outcomes remain outside that candidate's qualified scope. |
| M7.4.1 candidate, PR #9 | Read mechanics report without importing or merging. Structured event dispatch, recipient binding, conditional effects and explicit unresolved choices can populate the explanation panel. AI weights are not probabilities, and readable source effects do not establish campaign eligibility. |
| `src/CampaignIntelligence.tsx`, `intelligence.ts`, `bridge-types.ts`, `history-types.ts` | Reuse field qualification, origin/freshness labels and recording selection. A connected local service is different from a connected owned game. Imported history is not live observation. Retain preview/apply before seeding a new planner context; never overwrite assumptions automatically. |
| `server/api.ts`, `store.ts`, planner/history services | Retain one local Node service and SQLite authority, schema-compatible typed library items, revision conflicts, canonical source/index revisions and authentication. No replacement database or duplicate bridge is justified. |
| PR #4 and PR #6 | Independent read-only Q&A and AI-context candidates retain their own merge/qualification gates. The design is compatible with future adapters but assumes neither is merged. No changes were made to these PRs. |

## Proposed recommendation-layer interaction contract

These are proposed interface concepts, not new production API promises:

```ts
type StrategyRequest = {
  conversationId: string;
  objective: string;
  orderedPreferences: ('fun' | 'winning' | 'efficiency')[];
  campaignContext: { observations: QualifiedFact[]; assumptions: PlayerAssertion[] };
  sourceContext: { version: string; indexRevision: string; dlcAssertions: unknown };
  previousStrategy?: { id: string; revision: number };
};
type WorkspaceResult = {
  strategyId: string;
  revision: number;
  presentation: 'quick' | 'explanation' | 'workspace';
  content: StrategyContent;
  review: ProposalReview;
  evidence: ClaimEvidence[];
  designs: QualifiedDesignResult[];
  unresolved: string[];
};
```

`QualifiedFact`, `ClaimEvidence` and `QualifiedDesignResult` above are explanatory placeholders for an adapter over existing/candidate contracts; they are not implemented types. Every fact must preserve origin, captured time, country/session identity and field qualification. Every computed result needs candidate/scenario identity, source dependencies, supported dimensions and invalidation rules. Source-verified semantics, conditional applicability, estimates and unavailable facts are separate statuses, not a single confidence score.

1. A request captures the objective, preferences and explicit assumptions. The application resolves source references and preview/coverage state before offering a generation request. Existing consent, data disclosure, quote fingerprint, held budget and duplicate prevention remain intact. No automatic paid retry.
2. A quick response and full workspace are alternate views of the same typed strategy/revision. Expansion makes no new provider request and does not lose conversation context.
3. Edits create a dirty revision. Proposed priority changes can update a draft immediately, while previously calculated results become visibly stale. A recalculation offer invokes only supported deterministic evaluation after explicit user action. Unsupported design dimensions remain unavailable.
4. Review uses `strategy/review` and canonical source resolution. Provider prose cannot promote its own evidence or unblock ranking/optimization. M7.4.1 mechanics and M7.4.2 resource results inform different parts of the explanation; neither alone certifies the plan will win.
5. Save stores typed strategies/designs and revision lineage using the existing local service. Expected revisions/fingerprints protect against overwriting newer work. Reopening older versions creates an explicit revision action, not silent replacement of a newer draft.
6. New observations are proposed as context updates, with a before/after review. Missing or stale data leads to targeted questions and general advice. It never triggers invented stockpiles, implied current readiness, automatic gameplay or background provider spending.

The eventual attention feed should consume qualified observations and deduplicate changes, preserving source/time and explicit player choices for interruptions. Existing live control safety/emergency-stop access must remain visible when applicable; the prototype has no control channel. Production rollout, schema migration, source integration and launch selection require a separate owner decision.
