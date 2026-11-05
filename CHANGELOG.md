# Changelog

## 0.4.0 candidate r3 - Qualify unresolved guide semantics

Independent review left the USA event-delay compound NOT interpretation unverified. USA guide r2 now labels that claim unverified, quotes only the declared branch structure, and adds a manual check to starter captures. New checklist provenance retains per-claim status. Historical USA r1 checklists display a correction notice without changing saved text, sources or ticks, even when index hashes match.

All 12 independently unverified claims were checked for presentation: the other seven strategy claims, three wiki leads and Japan full-route caveat already carry editorial/unverified labels. Their wording/status is not promoted. Tests cover qualifications, new captured provenance, older-capture preservation and visible warnings. No NOT engine semantics, full campaign route or complete release acceptance is certified. See [GUIDE-QUALIFICATION-v0.4-R3.md](GUIDE-QUALIFICATION-v0.4-R3.md) and [QA-LEDGER.md](QA-LEDGER.md).

## 0.4.0 candidate r2 - Shorter starter review

Fixes the low-severity preview-density issue found by independent R1 QA. Shared guide/planner assumptions appear once; unique reasoning stays under its focus. Identical warning text is grouped with all affected step numbers. Distinct wording and diagnostic origins remain available, and the raw preview, fingerprint inputs, captured checklist and evidence are unchanged. Source invariants and an actual-renderer regression check for the duplication accompany the fix.

R1 snapshots are preserved. This is a presentation correction, with no game content, planner evaluation, persistence schema, dependency or security change. Independent R2 retest and full semantic/in-game acceptance remain pending; see [QA-LEDGER.md](QA-LEDGER.md).

## 0.4.0 candidate r1 - Discovery and sourced campaign guides

Seven original entries use stable guide IDs/revisions, narrow claim categories, installed source hashes/line ranges, patch/DLC context and review/reuse metadata. Secret guides are filtered before catalog search and explicit reveal also gates the retained raw formation browser. Wiki links that could not be fully accessed remain unverified leads. No guide claims game-engine verification.

Five early focus sequences can be previewed without writing, independently evaluated by the planner, cancelled, or explicitly applied as a new alternative with an original sourced checklist. CAS/fingerprint checks, existing draft recovery and pending-write guards protect the handoff. Guide bookmarks use stable namespaced keys and are excluded from unresolved raw-reference lists. Source/dependency changes flag guides for review without rewriting captured answers.

No storage schema, dependency, authentication, phone setting, save access, live capture or game file change is included. The owner explicitly permitted v0.4 with v0.3 QA incomplete; [QA-LEDGER.md](QA-LEDGER.md) carries all remaining obligations. Exact candidate evidence and independent disposition belong to the frozen release handoff.

## 0.3.0 candidate r2 — Unsaved draft close recovery

DRAFT-CLOSE-01: R1 silently blocked close on the mounted planner, then lost its memory-only draft on ordinary close after navigation. Draft ownership and the unload guard now live at app level, covering cached plans across tools and campaign switches. The desktop offers Stay, Review/download drafts, or explicit Discard and close; in-flight writes keep it open. Stay preserves the running service. Downloads retain original revisions and editable plan values without writing a committed campaign.

A related reproduced late-response race is also fixed: an earlier acknowledged Apply cannot remove a newer draft cached after navigating away again. Clean cached views do not become false unsaved warnings; explicit discard reads the current campaign without overwriting it. Browser/renderer recovery, close-policy and preservation regressions accompany the fix. R1 bytes and previous versions remain preserved. No schema, dependency, game/save or authentication change is included. Independent retest and existing release gates remain required.

## 0.3.0 candidate r1 - Campaign Planner

Named alternatives support write-free preview/cancel and one atomic reviewed apply guarded by campaign and reference revisions plus a recomputed fingerprint. Queue-order evaluation preserves nested three-valued conditions, exact references and causal actual/projected state; known-blocked predecessors grant no completion. Explicit Done/Unmark preserve alternative order. Timing shows known nominal effort, propagates unknown durations, and suppresses unqualified dates on conditional/blocked sequences.

Sourced checklists preserve original conditions/evidence, actual/projected capture context, versions and independent ticks. Existing bookmarks/notes remain campaign-wide. The desktop planner provides list/map browsing, concise queue actions, draft conflict/download recovery and explicitly remembered view state. Unsaved drafts are memory-only.

Database schema 3 provides a writer compatibility barrier with verified closed-service backup, rollback and restore. Legacy campaign payloads are preserved byte-for-byte during migration, and namespace initialization happens on reviewed Apply. Export schema 3 preserves the new fields while accepting older imports; older replacement payloads cannot strip planner state. Duplicate queue positions remain visible for review.

Stage1 QA reuse adds isolated fixture/result helpers, parameterized existing harnesses, a loopback-binding seam that preserves real authentication, exact ASAR/runtime manifest verification and permanent SEARCH/PRECISION/COPY checks. Historical failing baselines have not been replayed merely by adding regressions. Current execution evidence belongs to the candidate handoff; this changelog does not certify native or engine behavior. R5 offline/accessibility/in-game gaps remain explicit. No game/save editing, live state, AI, security weakening or external publication is included.


## 0.2.0 candidate r5 - Equipment year robustness

ROBUST-01: production and both comparison selectors validate the resolved/declared year before rendering an option label. Objects, arrays, booleans, malformed strings and fractional values display Unknown year. Valid whole years retain resolved-field precedence, including zero and Unicode edge-whitespace normalization. Raw metadata is unchanged.

The confirmed crash used a manually injected cache record outside the supported importer's scalar metadata contract. This correction guards year labels; it does not claim general corrupt-cache recovery. Focused normalization, importer-contract and browser regressions accompany the fix. The portable has a distinct `-r5.exe` name. Prior artifacts, schema, importer behavior and existing independent QA gates remain preserved.

## 0.2.0 candidate r4 - Unicode year normalization

YEAR-02: SQL filtering and bookmark normalization share one explicit set of 25 edge-whitespace characters, including NBSP and BOM. The policy trims edges only; interior separators, malformed values, booleans, fractions and embedded NUL remain excluded from whole-year matches. Regression cases cover both source-year fields and combined public filters.

The portable has a distinct `-r4.exe` name. Prior candidates and QA evidence remain retained. No schema, importer-content, game/save or v0.3 changes are included. Existing QA gates remain in place for independent retest.

## 0.2.0 candidate r3 - Declared year filter

YEAR-01: numeric and text declarations compare consistently with the requested year. Valid numeric text is normalized before comparison; missing, invalid, boolean and fractional values do not become whole-year matches. Bookmark filtering uses the same normalization policy. Existing exact-ID, text, category and country constraints remain in force.

The portable has a distinct `-r3.exe` filename. Earlier candidates and QA evidence are preserved. No schema, importer-content or v0.3 change is included; acceptance remains on hold for the same independent QA task to retest.

## 0.2.0 candidate r2 - Independent QA corrections

Replacement for candidate FDB54836DC5B; the first candidate and its evidence remain retained. Independent acceptance remains on hold pending retest in the same QA task.

- SEARCH-01: ordinary event questions and short cost queries retry meaningful subject terms when literal retrieval has no matches. Literal names/IDs remain preferred; numeric event tokens match exactly, and existing country/year/type filters apply to both attempts. Results expose installed references and scoped links without claiming simulated outcomes.
- PRECISION-01: reference base/scripted values, declared added values and multipliers preserve source numeric precision (including reliability -0.025). Compact aggregate/calculator formatting is unchanged.
- COPY-01: naval unsupported text is version neutral. Ships and convoys remain unsupported for military-factory estimates.

No database/schema, migration, importer-content or v0.3 change is included. The portable uses a distinct `-r2.exe` name to preserve the previous candidate.

## 0.2.0 - Knowledge Foundation

Candidate for independent acceptance QA. No v0.3 planner, full designer/event simulation, verified strategy library, live-data or AI system is included.

- Extends references to modules/upgrades, doctrine rewards/milestones, characters/instances/roles, history recruitment, events/options/stages, general decisions/categories, idea-category metadata and continuous focuses. Retains scoped modifiers and inherited base-cost declarations.
- Adds typed forward/reverse links with exact targets, repeated conditions, comparators, stage/scope paths, declared delays and explicit unresolved/ambiguous/unsupported states. English questions and declared-country/year/category filters lead to those links.
- Introduces logical identities, retained UID aliases and review of missing/reused definitions. Anonymous positional records are revision sensitive. Notes, bookmarks, profiles and templates stay in the existing SQLite store.
- Adds transactional schema migration, closed-app verified backups, failure rollback, restore tooling and forward-schema refusal. Revision CAS, tombstones, selection and interrupted-save safeguards remain.
- Publishes coherent index revisions with localization/define/import-rule/applicability dependencies. Fatal refresh failures retain the previous snapshot; no-op checks retain revision. API answers use committed snapshots and reference changes invalidate derived results while preserving editable inputs.
- Adds drawer Back, exact candidate selection, missing bookmark/legacy-note review, expandable provenance/conditions, claim-sized conflict notes and independently reconciled source coverage. Separates DLC installed/owned/enabled/integrated facts and legacy combined assertions.
- Prevents mousewheel changes on focused numeric inputs and clears old import errors after successful import.

Developer checks use disposable databases, failure fixtures and read-only comparisons against installed build 1.19.4.1. Independent packaged acceptance, physical network-disconnection tests and representative in-game parity are separate gates. Unsaved drafts remain memory-only and do not survive forced termination.

## 0.1.1 — Reliability and desktop polish

Candidate for independent acceptance QA. v0.2–v0.4 remain planning work outside this patch.

- Campaign writes compare revisions atomically. Stale saves and deletes return a conflict with the current campaign. Deleted IDs cannot be resurrected by an older window.
- Rejected or interrupted saves keep a visible draft with download, retry where applicable, save-as-new, and explicit discard actions. Saves are serialized in each window; overlapping stale edits are surfaced for review.
- Desktop campaign selection persists in SQLite across changing loopback ports. Deleted or missing selections fall back to the first remaining campaign.
- Production uses indexed equipment identity and cost. Unresolved costs, empty/invalid inputs, pending requests, and late responses cannot display an old estimate.
- Ships and convoys explicitly show naval production as unsupported. No dockyard formula was added.
- Removed the stale Nordic guide identifier form_nordic_nation after verifying the installed form_nordic_league decision. Unresolved references elsewhere are explicitly reported.
- Reduced headings and generic copy while retaining the desktop palette and layout. Added concise save/recovery states, readable focus labels, visible keyboard focus, and expandable formula/source/effect details with consequential warnings retained.

Developer verification uses temporary fixtures and a separate desktop data directory. The QA handoff identifies the exact portable hash, before/after captures, pass/fail evidence, and remaining acceptance gate. No AI, telemetry, save editing, or new phone feature systems are included.
