# M7.1 acceptance finding: Autarky Achieved

2026-11-07. **M7.1 remains pending user acceptance.** The original twelve-decision audit established a useful local improvement, not adequate explanation coverage for the whole planner. The user's German focus counterexample is now a separate permanent regression, with its own M7.1 baseline rather than retroactively changing the M7 decision baseline.

## Cause and verified source meaning

On installed HOI4 **1.19.4.2**, `GER_autarky_achieved` is at `common/national_focus/germany.txt:2387`, SHA256 `ac730be5ccc9095fb400e58b2f7d44501288a94186beb148dbbb0b32cf8ea03c`. Its nominal duration is 70 days. At baseline commit `9105ae7`, it produced **zero specific reward summaries**. Its main reward is a call to `GER_autarky_achieved_effects`, defined in `common/scripted_effects/GER_scripted_effects.txt:848`. That directory was outside the index manifest. The remaining direct reward uses unsupported `swap_ideas`. A tooltip describes an improved law but cannot establish the mechanical effect by itself.

The fixed installed-source regression verifies these separately understood effects:

- Conditional removal of MEFO Bills, Economy of Conquest or Recovering Economy, and addition of Wirtschaftswunder, preserving the if/else-if chain. These are alternative branches, not three simultaneous rewards.
- Literal +0.05 writes to four variables directly bound by the linked dynamic definitions: military factory construction speed, dockyard construction speed, factory output and dockyard output. The displayed **+5 percentage points changes a stored modifier contribution**, not a verified +5% increase in actual production. Activation, other contributions and campaign totals remain unknown.
- Setting the consumer-goods factor contribution variable to zero. This does **not** claim zero consumer-goods factories or zero total consumer-goods requirement.
- Conditional replacement of the existing Autarky trade law by its improved definition. Supported replacement values are factory output +5%, dockyard output +5%, construction speed +10%, research speed +5%. These are the replacement law's values, **not net gains over the old law**. Both definitions localize to Autarky; the new wording identifies the replacement version and retains separate IDs/provenance.

All independently understood siblings remain in the full effect tree even when adjacent commands are unsupported. Compact cards remain bounded summaries; full details show all interpreted effects and limitations. The fixed regression exposes twelve specific effect leaves, including separate removal/addition operations; **twelve is not a completeness score or twelve independent bonuses**.

Primary checks used the installed `common/scripted_effects/00_scripted_effects.txt` example and the game's effects/triggers documentation for parameterless calls, dynamic modifier removal, idea swaps, variable assignment/addition and core-state predicates. Dynamic bindings come from `common/dynamic_modifiers/wuw_dynamic_modifiers.txt`; law values/name override come from `common/ideas/_economic.txt`. No semantic claim relies on a tooltip or a variable's spelling alone. The online Paradox wiki returned 401; no third-party mirror replaced installed source evidence. This is source interpretation, not native engine verification.

## Implementation and bounds

The existing importer and independent record census now include `common/scripted_effects` and `common/dynamic_modifiers`; their hashes participate in cache invalidation. `server/mechanic-context.ts` attaches bounded same-index references. No separate index, database, AI provider or gameplay controller is added. Idea name overrides and idea/event references inside helpers reuse existing localization and relationship context.

The shared interpreter expands only unique, unrecovered, parameterless `helper = yes` definitions. It preserves caller country/state, ROOT/FROM/PREV, conditions, phases and helper source evidence. It rejects parameters, recursion, ambiguity, recovery warnings and size/depth limits. Attachment is bounded to 64 helper definitions, eight helper levels, 12,000 visited nodes and 160,000 serialized characters (64,000 per helper); effect interpretation has a 4,096-node work budget and depth limit. Bounds are limitations, never proof of no effect. Known siblings are retained after a rejected helper.

Added primitives: `remove_dynamic_modifier`, literal no-duration `swap_ideas`, `all_core_state`, and literal shorthand `set_variable`/`add_to_variable` only when linked dynamic definitions give the variable one supported modifier meaning. Known direct bindings carry source evidence. Arbitrary formulas, parameter substitution, full dynamic modifier evaluation and campaign state simulation remain unsupported. The shared explanation type now carries optional typed evidence for future consumers; existing planner comparison still uses the same `entryMechanics` tree.

## Coverage report

The original twelve matched BEL/AUS decisions still each produce specific outcomes (**12/12**). Autarky Achieved now does as well. This thirteen-entry regression set is targeted, not representative enough to claim whole-game completeness.

An automated scan over the **same installed definitions** before and after the follow-up measures entries with at least one non-generic outcome, and entries containing any explicit unsupported/ambiguous/parser-limited effect or requirement:

| Definition kind | Total | Specific outcome before → after | At least one unresolved part after |
|---|---:|---:|---:|
| Ordinary focuses | 10,341 | 5,839 → 6,635 | 9,559 |
| Shared focuses | 335 | 183 → 188 | 308 |
| Joint focuses | 280 | 26 → 26 | 215 |
| Decisions | 3,931 | 2,694 → 2,860 | 3,794 |
| Formables / related decisions | 255 | 223 → 226 | 247 |
| Technologies | 552 | 241 → 242 | 536 |

An initial scan counted empty effect containers as outcomes, particularly empty joint-focus rewards. A fifth regression now excludes empty helpers/scopes/phases while retaining an actual idea award with no modifiers. The table recomputes both sides with that same exclusion using the original 9105ae7 semantic rules for the baseline; older raw scan logs are retained, not used as the corrected metric. Definitions with no intended direct reward can legitimately have no specific output.

This is **output screening, not independently verified semantic coverage**. A recognized outcome can coexist with many unknowns; absence of a diagnostic does not prove every source construct was modeled. Most ordinary focuses still have at least one explicit gap, and 3,706 ordinary focuses still have no specific outcome. Broader counts must not be presented as native parity or success rates. Relevant evidence: `.bridge-local/m71-engine-before-normalized-census.json`, `m71-engine-after-census.json`, `m71-autarky-before.json`, `m71-autarky-after.json`; exact dependency hashes are retained in the latter.

Remaining Autarky gaps: resource-collection predicates; variable comparisons and nonliteral penalty corrections; unmapped intelligence-contribution variables; trade-law export, lend-lease tension and faction trade-opinion modifier semantics. General limits include scripted triggers, parameterized helpers, random rewards/unit templates, runtime names, downstream event consequences, effective mod merging, source/campaign mismatches and total economic simulation. Core-state control requirements have known meaning but unknown current truth.

## Validation and acceptance checkpoint

32 distinct focused tests pass (scripted rewards, existing explanations, importer, knowledge store, strategy and usability); five new cases cover partial siblings, source scopes/evidence, bounded rejection, variable bindings, name overrides dependency invalidation and empty-container false positives. TypeScript/build pass. Original twelve-decision audit passes; the new installed Autarky regression verifies its important interpreted effects and required unresolved parts. The expanded source UI journey passes and screenshots were reviewed: `artifacts/qa/explanation-browser-2026-11-07T06-23-11-945Z-788e2ee8/`.

Reproduce with `node --import tsx --test tests/scripted-rewards.test.ts`, `node --import tsx scripts/explanation-focus-audit.ts`, and the existing `scripts/explanation-ui.ts` / packaged explanation journey. Installed audits use the isolated `.bridge-local/m71-audit-db`; a changed focus hash/version requires a new matched baseline. Raw installed definitions and generated databases remain ignored.

The first candidate package (`f2620498fef4`) exceeded the 60-second first-window limit while waiting for service startup. Its diagnostics contain no renderer crash. One instrumented attempt with a bounded 120-second limit then passed startup, installed-source Autarky/reference/planning/history and restart, with index-file progress captured. This does not establish the cause of the first delay; startup reliability remains an open issue. Evidence: `artifacts/qa/development-package-2026-11-07T06-27-40-459Z-1068af15/` (failed) and `development-package-2026-11-07T06-29-47-707Z-2965e278/` (passed). The final rebuilt package includes the empty-container correction and passed the full journey; identity and evidence follow. Older M7.1 and M7 builds remain intact. No HOI4 launch, gameplay command, mod/save/playset edit or AI implementation is needed.

The roadmap now defines **Milestone 7.3 — AI-Assisted Strategic Planning MVP** for complete editable objective plans, including monarchist Portugal. It reuses existing focus plans, path/evaluation/comparison APIs, revision-checked previews and structured explanations; a future proposal envelope holds decisions/research/preparation/dependencies. M7.3 is documented, not implemented. Explanation gaps remain visible to that future planner rather than being replaced with AI assertions.

Publication checkpoint: the unchanged GitHub origin now reports `private: false` (2026-11-07 06:26:55 UTC), unlike the earlier private-repository instruction. New commits remain local pending clarification; visibility has not been changed. Reachable-history audit at f262049 found no secret-pattern, suspicious-path or large-blob findings, only existing icon binaries.

## Final Windows acceptance candidate

- Runtime/source **7b797e04d7c6**; ZIP `C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.1-7b797e04d7c6/M7.1-7b797e04d7c6-windows-x64.zip`.
- SHA256 `88b4f07c0a519f340e7c331a563f96b3bf8a2a80597ee3183b9e4234267ef037`. All **76** freshly extracted files match.
- Open `win-unpacked/HOI4 Companion M7.1-7b797e04d7c6.exe` after extracting the whole ZIP into a new folder. Follow START-HERE.md, beginning Sources & settings and the Autarky Achieved objective. Keep all resources beside the executable. It is unsigned, isolated, unpublished and needs no developer Node/npm. Normal data is under `%APPDATA%/HOI4 Companion Development/M7.1-7b797e04d7c6/`; older builds and personal game data are untouched.
- Three actual extracted-package checks passed: first window/cold index **29.3 seconds**, renderer/service/source resources and Autarky/decision/technology/search/strategy/history workflow **29.8 seconds**, then shutdown/restart/persistence **6.1 seconds**. Checks used a bounded 120-second first-window diagnostic allowance; the actual final startup was below the original 60-second threshold. Earlier timeout remains documented rather than reclassified as a pass.
- Evidence `artifacts/qa/development-package-2026-11-07T06-35-01-756Z-3449b643/`; `.bridge-local/m71-autarky-final-package-smoke.txt`, `m71-autarky-final-extraction.txt`, `m71-autarky-final-tests.txt`, `m71-autarky-final-audit.txt`. Packaged runtime bytes match the build, source identity stayed unchanged during the run, renderer sandbox is preserved, screenshots reviewed, and all recorded owned process IDs were absent after cleanup. No HOI4 launch occurred.
- Old M7.1 ZIP SHA256 remains `49e18d0cf0719331290dc1139615af9bebbf356282db6c8c72238e390e52b835`. The intermediate f262049 package is superseded; use 7b797e04d7c6 for review.

If the first window is delayed, allow up to two minutes for indexing and retain this build's data/diagnostics if it still fails. Do not start repeated copies or launch HOI4 to troubleshoot reference indexing. The documented developer alternative is `npm run browser`, which uses the same renderer/service with a system browser and checkout environment rather than the isolated Electron package. Desktop acceptance, startup reliability and broader QA-LEDGER gates remain open.
