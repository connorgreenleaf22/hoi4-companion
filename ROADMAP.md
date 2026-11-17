# Future implementation milestones

KGE-01 (November 16, 2026) starts the owner-selected campaign adviser/design-search direction with experimental division/tank estimates, explicit modifiers, bounded searches and optional AI-preview context. Broad knowledge-engine completion remains staged; [the contract](docs/application/KNOWLEDGE-ENGINE.md) defines storage, useful tasks, limits and continuation. This does not block the Campaign-first alpha or qualify legacy combat/release gates.

Completed continuation (2026-11-14): [AI-CONTEXT-01](docs/application/AI-CONTEXT-01.md), bounded and disclosed strategy source previews. The exact broad Germany request succeeds against the retained corpus, with atomic source groups, mandatory-reference preservation and measured overflow recovery. This closes one AI workflow blocker; current-patch semantics, source applicability, generated usefulness and final release remain separate.

Current management assessment (November 14, 2026): [project goals, completion estimates, blockers and execution gameplan](docs/workflow/PROJECT-GOALS-2026-11-14.md). The common application baseline is now on main through PRs #13/#14. STRATEGY-DRAFT-01 closes the separate whole-strategy editor loss; current-patch qualification, production Campaign-first workflow and existing final-release gates remain independent work. Historical milestone notes below retain their original scope.

Workflow update (2026-11-10): [development and independent QA procedure](docs/workflow/README.md); PR #3 approved and merged into `feature/hoi4-ai-m731` at `440d625`; default-branch rollout remains separately gated. Product milestone acceptance remains unchanged.

The current release provides manual campaign tracking. The following are planned extensions, with separate acceptance gates.

## Read-only save analysis

- Probe representative text, compressed, and binary saves without modifying originals. Identify save version, checksum, DLC/mod context, player country, and supported encoding.
- Normalize supported fields into a campaign snapshot separate from the reference index and manual planning state.
- Start with focus progress, equipment stockpiles, manpower, production, and division templates. Show capture time, source, unsupported fields, and differences from the previous import.
- Gate: repeatable import fixtures, explicit handling of unsupported formats, manual state preserved, and verified parity with representative in-game displays.

## Real-time game analysis

- First investigate available game-produced telemetry, logs, modding interfaces, and autosave frequency. Do not assume a complete official live API exists.
- Prefer documented/read-only game outputs or an optional user-installed telemetry mod. Keep collection separate from the UI and reference importer.
- Report snapshot age, collection method, unavailable fields, and paused/disconnected state. Autosave-based updates must be labeled as periodic, not truly live.
- Gate: demonstrate reliable capture and measured update frequency before advertising real-time analysis. Keep read-only collection disabled by default.

## Save editing

- Build on proven format support. Keep editors separate from all read-only workflows.
- Start with a small supported field set and explicit before/after previews. Preserve unknown fields and original encoding where supported.
- Make an immutable backup, validate constraints, and export to a new save filename. Never overwrite the only original copy.
- Gate: parse/write round trips, structural and semantic validation, backup restoration, and successful in-game loading of representative exported copies. Unsupported or integrity-protected formats must report their limitation.

## Optional AI assistant

- Add interchangeable cloud and local adapters behind a common interface. Keep all reference tools usable without either.
- Retrieve versioned source passages and include provenance with explanations. Distinguish indexed facts from generated suggestions.
- Let the user choose exactly which campaign fields leave the PC. Keep credentials in an OS credential store, not exported campaign files.
- Show cloud usage/cost information when available, handle unavailable models, and keep tools read-only initially.
- Gate: source-grounding tests, explicit treatment of missing evidence, local/cloud switching, and useful offline behavior.

## Content and calculation depth

- Expand European country guides into tested, version-specific event walkthroughs, including secret-path event chains.
- Add technology/doctrine and designer modifiers to the workshop only after matching game-designer reference fixtures.
- Add mod-aware precedence and separate indexes before claiming mod compatibility.
- Add selected wiki explanations with provenance, licensing review, and independent freshness labels; do not make external scraping a startup requirement.
