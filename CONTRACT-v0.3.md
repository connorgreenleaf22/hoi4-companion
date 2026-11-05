# v0.3 Campaign Planner contract

Frozen for implementation on 3 November 2026; `src/types.ts` is the DTO definition. This extends the v0.2 contract without adding game save access, live state, AI, reward execution, network changes or game-file writes.

The baseline is v0.2 R5 SHA-256 `44987E64EA448E2E85B720BA90D40BBA3A9A955F1CA8869427E50533A6BCCAAE`. The parent's independent disposition was 64 pass, zero fail, five not tested and no critical findings. Physical offline, accessibility/high-DPI and three in-game comparisons remain limitations. These are recorded historical results, not reruns by this implementation owner.

## Facts and projection

`yes`, `no` and `unknown` represent supported knowledge, separately from reference resolution and verification. Requirement explanations retain original groups, source, role, scope, comparator, assumptions and ordered children. AND combines all; OR combines any; NOT requires every enclosed condition false (negated OR). Unsupported scopes/comparators/scripts remain unknown, including their children. A selected country alone does not establish live `tag` or `original_tag`; dates and other live conditions remain manual. This conservative decision supersedes the preparation-only task-10 tag=yes proposal.

Actual completion consists of explicit manual positive assertions. Absence is not a scripted negative. Each evaluation rebuilds projection from scratch in queue order: a supported prior completion can support later scripted completion predicates and prerequisites; conditional prior completion propagates assumptions; a blocked step establishes no completion. Step eligibility and sequence reachability are separate. Prerequisite rows are AND; members within a row are OR. Exclusions are checked in both declaration directions. Missing, ambiguous and repeated positions stay visible. Actual-completed positions remain in their saved order with zero remaining nominal effort. Done/Unmark change actual history explicitly and re-evaluate every alternative; checklist ticks never do.

Only completion is projected. Rewards, flags, ideas, research, territory, diplomacy, events, cancellation, bypass and stored focus progress are not executed. Tree selection/applicability is separate and remains conditional where runtime selection rules exist. Installed source evidence establishes extraction, not game-engine parity.

## Persistence and reviewed changes

One optional `Profile.planner` namespace has schemaVersion 3, activePlanId, named plans, sourced checklists and display view context. A plan has an ID/name, exact tree reference, ordered typed focus refs, date-only baseline, assumptions and accepted reference revision. Maximums: 20 plans, 2,000 positions per plan, 50 checklists and 2,000 tasks per checklist; bounded nested explanations, names and strings. Semantic fields are validated, unknown fields rejected; invalid display controls fall back safely. References use definition UID/logical identity or preserved legacy IDs, never fuzzy search. `legacyId` is a compatibility fallback, not resolution proof.

For a namespace-bearing profile, planner is canonical; tree/queue/startDate mirror its active plan in the same write. Legacy reads build a pure in-memory Main plan. Schema migration preserves legacy campaign payload bytes, revisions, selection and tombstones; the namespace is saved on explicit reviewed Apply. No queue positions are silently deduplicated. Missing/ambiguous references and original captured text are preserved.

`POST /api/v1/plan/preview` takes `{profile, plan, expectedProfileRevision, expectedIndexRevision}` and is read-only. It returns `{report, fingerprint, expectedProfileRevision, expectedIndexRevision}`. Choosing an alternative, comparison, edits and Cancel are transient. Applying a modified namespace (including deletion or changed country/tree) activates exactly the reviewed plan; deleting active requires a surviving replacement. Existing actual history is preserved unless explicitly edited by the user.

`POST /api/v1/plan/apply` adds the reviewed fingerprint. Within one BEGIN IMMEDIATE transaction it checks campaign CAS/tombstones and reference revision, resolves/evaluates against that snapshot, recomputes canonical SHA-256 identity, compares it, and commits one profile revision. Display view is excluded from semantic identity. Errors distinguish profile-conflict, reference-conflict and preview-changed (409). The UI keeps the draft; a changed context requires another preview. `/plan` remains a pure compatibility adapter.

Ordinary profile writes can update actual history, notes, bookmarks, templates, DLC facts, checklist progress and view with CAS. For existing planner profiles they cannot strip the namespace or replace plan semantics/active selection; reviewed plan apply is required. New-ID imports may preserve a schema3 namespace. Older schema1/2 exports remain importable; schema4+ is rejected. Schema3 is a database compatibility barrier: v0.2 refuses to open it. Downgrade requires closed-service restoration of the verified pre-migration backup.

## Timing and captured answers

Each step shows nominal days and cumulative known effort. Unknown duration makes total and downstream dates unknown; zero remains valid. UTC date-only arithmetic validates leap days and calendar range. Conditional/blocked routes have no unqualified finish date. This is sequential nominal effort, not a guaranteed in-game deadline; interruptions, bypasses and saved progress are not simulated.

Captured checklists retain plan ID, stable target plus legacy fallback, original grouped requirements, manual checks, ticks, actual/projected completion context, source/dependency hashes, game/app/index versions and assumptions. New references do not rewrite old answers. Changed index context is visibly stale; missing/ambiguous targets open the existing reference-review flow. Source/model status helpers can additionally compare a complete current corpus. Existing campaign bookmarks and notes remain the single reference store.

Saved view context restores through normal restart after explicit Remember view. Unsaved drafts are retained in renderer memory across navigation, support download and warn on close; they are not crash-durable. Conflict recovery supports download and explicit use of latest saved campaign. No external publication is part of this candidate.

R2 close-recovery correction: the app-level cache/unload guard covers every outstanding planner draft, including other campaigns and unmounted tools. A global review modal downloads each original draft or explicitly discards it using read-only current campaign data. Desktop close offers Stay, Review/download or Discard and close; pending writes prevent closing, and Stay keeps the service available. A delayed save acknowledgement cannot clear a newer cache entry. The native controller reads only fixed scalar close counts and dispatches a fixed review event; it adds no renderer Node integration, preload bridge or general IPC capability. Crash durability remains outside this contract.

## QA and security boundaries

Stage1 QA helpers use isolated fixture directories and per-run evidence. The internal loopback listener seam requires explicit temporary fixture data and autoIndex:false; it changes binding only. Real pairing, cookies, origin/host guards, rate limiting, privilege gates and revocation remain active. It is unavailable over HTTP/environment production configuration and provides no authentication bypass. Production phone access still requires its existing explicit toggle.

Developer source/API/headless/compiled/package checks are distinct from independent native acceptance and game/environment testing. Final executable qualification retains the task-11 release smoke and inherited acceptance obligations. Proposed preparation vectors are not passes until an adapter actually executes the product and records the observation. Historical broken baselines are not claimed replayed unless explicitly recorded.
