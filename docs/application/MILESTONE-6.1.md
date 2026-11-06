# Milestone 6.1 — usable search and mechanics

Milestone 6 acceptance feedback identified vague navigation, an unnecessary objective dropdown, missed country aliases and raw-script rewards. This implementation extends the existing React renderer, Node API, ordered parser and SQLite index. It adds no dependencies, database migration, gameplay control or telemetry fields. Desktop user acceptance remains open.

## Changes

- Command center now has a Start here section with direct planning/reference actions. Navigation carries short purpose descriptions; country/campaign context is visible. Decision/research lookups and detailed mechanics expand on demand. Missing-state and source-authority warnings remain visible.
- A reusable keyboard combobox powers the header's categorized universal search and the objective picker. Suggestions appear under the input; arrows select, Enter opens/selects, Escape dismisses. The selected objective shows a summary and a direct details action. No second selector is required.
- `GET /api/v1/search` uses the existing indexed definitions, with name/ID/alias matching, partial tokens, case/accent normalization, and one-edit or adjacent-transposition spelling fallback when no direct matches exist. The current country boosts ranking without excluding other countries. Shared names are marked ambiguous, with separate definitions retained. Explicit reference filters still restrict results. Existing semantic question search remains the fallback for supported questions; existing year/filter endpoints remain intact.
- Country aliases come from English installed localization, ideological name variants and cosmetic identities declared in the same country's history. Foreign scoped cosmetic changes are excluded. Aliases include localization evidence; cosmetic mappings retain the history source/hash. The index rule revision forces refresh of older indexes and existing localization dependencies invalidate changed content. No hardcoded Dutch alias or new alias database is introduced.
- Reusable deterministic explanations serve objective details, reference drawers, route requirements and saved comparisons. Raw script is available in explicitly advanced sections. Planner persistence, alternatives, baseline/history storage and worker startup remain unchanged.

## Installed evidence and limits

This laptop now has HOI4 **1.19.4.2**. Prior native evidence and imported recordings remain **1.19.4.1**, not reclassified as current observations. No HOI4 process or gameplay action was started for this milestone.

`common/country_tags/00_countries.txt:97` declares INS as Indonesia; `history/countries/INS - Indonesia.txt:346` assigns INS_HOL; `localisation/english/countries_cosmetic_l_english.yml:5` names that identity Dutch East Indies. The history SHA256 is `3010af2b171a6700949ae82c103c9b2a729ba6a22211538135a927f4f8fd1d34`; cosmetic localization SHA256 is `83f06824840a60e9ec07b7f09d1aa934081d1b72d756d1eba999ebacc8c31338`. This proves an alias for INS, not a different HOL country or its current campaign name. Conditions surrounding historical assignments are not claims of active cosmetic identity.

Indexing remains English/base-game only. Installed DLC declarations and detected mods retain the previous qualification limits; there is no authoritative merged mod load order. Arbitrary renamed countries, event-only aliases and dynamic localization are not inferred. Names such as `[GetAutobahnName]` can remain unresolved. Fuzzy search is deliberately bounded, not general language understanding. The global popup lists twelve ranked results; Browse all search results opens the existing explorer.

## Explanation coverage

Supported literal effects: political power, manpower, army/navy/air experience; stability and war support as percentage-point changes; scalar idea addition/removal with an explicit warning that idea modifiers need inspection. For example, `add_stability = -0.1` becomes **Decrease stability by 10 percentage points**. Effects remain declarations, not simulated outcomes.

The translator preserves AND/OR/NOT conditions, grouped focus prerequisites, exclusions, bypass, visibility/availability rules and if/else branch structure. Known leaf conditions include completed focus, technology, DLC, country identity, war/peace and literal always. Hidden effects retain their context. Focus duration is nominal; literal nonnegative decision costs are political power; research cost is labeled a factor, never invented days. Selected technology modifiers are named but kept as source coefficients because a final campaign value is not computed.

Unsupported scopes, variables, random/loop constructs, scripted effects, dynamic decision costs, complex research modifiers and unknown commands remain explicitly untranslated. Their whole source is available; nested values are never promoted to unconditional player rewards. Descriptive custom tooltips do not count as independently evaluated effects. The concise summary shows an unknown-part count; details retain conditions. Requirement statuses still come from the existing conservative planner and distinguish missing information/assumptions from checked rules.

The registered community MCP reference tool returned **Transport closed** on the first call this milestone. No repeated reconnect/game-launch loop or permission expansion followed. Installed documentation, existing parser/index and retained evidence were used instead. No new community runtime component was installed or copied.

## Validation checkpoint

- 32 focused tests passed: usability, importer, knowledge-store, planner-model, history and strategy. Evidence: `.bridge-local/m61-focused-tests.txt`. Covers alias provenance/refresh/ambiguity, foreign-scope exclusion, spelling, conditions/units, existing persistence and strategy API behavior.
- TypeScript noEmit passed; `.bridge-local/m61-typecheck.txt`.
- Initial rendered source journey passed four checks against installed 1.19.4.2 content and the retained real recording: `artifacts/qa/strategy-planning-2026-11-05T21-09-03-135Z-1a2104f1/`. Review prompted a shorter default mechanics summary; final packaged verification follows below.
- Broad QA/release gates in QA-LEDGER.md are not recertified. Tests do not establish user acceptance.

## Windows build and review

Use the existing `npm run package:development -- M6.1` workflow from a clean committed checkout, then `node scripts/package-acceptance.mjs <build-directory>`. The output stays under `C:/Users/conno/Documents/HOI4 Companion Development Builds/`, outside tracked source. The final artifact/evidence will be recorded after fresh-extraction testing. No older artifact or installed application is replaced.

The bundled walkthrough is `MILESTONE-6.1-ACCEPTANCE.md`. Each milestone/commit label gets separate default AppData; existing data is preserved rather than silently imported into a new build. A prior recording can be imported deliberately, and saved campaigns can use the existing export/import workflow. Reopening the same build retains its own plans/history. The executable embeds its loopback service and uses the existing indexing worker; it needs no browser server, Codex, Git, Node installation or MCP connection. Unlike `npm run browser`, it provides the packaged Electron window/lifecycle and isolated development-build data path. Both use the same renderer/service.

If names appear stale, check Sources & settings and Refresh game data. Check the installation path and base-game/mod warnings. For startup problems retain this build's `data/diagnostics/startup-*.jsonl`; do not delete older data or repeatedly restart an unchanged failure. See the acceptance walkthrough for focused feedback.

Next: desktop acceptance of these specific tasks, then prioritize the user's findings. Reliable expanded telemetry, synchronized focus trees, ranked recommendations, AI and delegated controls remain separate milestones in APPLICATION-ROADMAP.md.
