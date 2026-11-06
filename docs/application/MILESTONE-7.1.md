# Milestone 7.1 — explanation quality and reference browsing

Branch `feature/hoi4-ux-m71` starts at validated M7 `0620369`. This milestone extends the existing importer, ordered parser, SQLite index, search and shared mechanics renderer. It does not change dependencies, schemas, native adapters, telemetry qualification, MCP permissions or gameplay execution. No HOI4 launch or gameplay input is used.

## Root causes and source evidence

The earlier renderer mostly understood scalar rewards. Timed ideas, country/state scopes, events and conditional removal effects became generic unknowns. Compact cards only selected direct completion leaves, so even some interpreted removal effects were invisible. Active modifiers, mission timeout/cancel phases, target/custom-cost rules and inherited category conditions were omitted. Uppercase conditional branches were unsupported. Names came from a small set of keys, with no linked idea modifiers or event titles. The warning count conflated unsupported semantics, state-dependent conditions, tooltips and bookkeeping. Three columns and nested scrolling amplified those failures.

Actual sources are **HOI4 1.19.4.2**, not the screenshot's 1.19.4.1. The same twelve IDs, versions and hashes are compared before/after; this is not a comparison of different patches. The installed root is `C:/Program Files (x86)/Steam/steamapps/common/Hearts of Iron IV`. Primary references are its `documentation/effects_documentation.md`, `triggers_documentation.md`, modifier documentation, localization, `common/decisions/_documentation.md`, idea/event definitions and `common/scripted_triggers/00_scripted_triggers.txt`. For example, `controls_or_subject_of` is a scripted helper, not an unknown engine primitive; it remains unexpanded here.

The reviewed, pinned HOI4 Agent Tools 4.7.0 installation was reused for documentation and two decision inspections. The connected transport closed; one fresh stdio fallback against the existing pinned checkout succeeded. `add_timed_idea` resolved to installed documentation. Baltic Expansion and Industrial Coaxing both returned `DECISION_ANALYZED_PARTIAL`; that is source analysis, not full validation or live eligibility. Reports remain in `.bridge-local/m71-agent-tools/`. No third-party code was installed, permissions expanded or source rewritten.

## Matched twelve-decision audit

`tests/fixtures/explanation-baseline-m7.json` retains localized-title availability, source identity, recognized costs/requirements/effects and unresolved counts from the old renderer. `scripts/explanation-audit.ts` refuses mismatched game versions or file hashes and writes the ignored detailed comparison to `.bridge-local/m71-after-audit.json`. Original 72-entry inspection and old explanations remain in `.bridge-local/m71-original-entries.json` and `m71-original-mechanics.json`.

**Specific outcomes visible in compact cards: 0/12 before, 12/12 after.** This excludes costs, durations, flags, tooltips and generic fallbacks. It measures whether a useful outcome is visible, not complete semantic coverage or native verification. Some decisions still have unsupported requirements or additional effects. Previously omitted requirements can increase diagnostic counts; counts are not a success percentage.

All twelve have localization entries. Four Austrian titles and the Congolese welfare title contain runtime expressions; fixed country names are resolved when known, while selected-country/state roles and other dynamic names are explicitly placeholders. Exact baseline titles and hashes remain in the fixture.

| Decision ID (source line) | Old base cost; old unresolved count | Newly visible specific outcome | Remaining important limitation |
|---|---|---|---|
| `BEL_EU_west_slavic_expansion_decision` (1981) | 100 PP; 8 | After 70 days, annex qualifying subjects with troop transfer and grant cores in the listed states | `controls_or_subject_of`; dynamic focus title; campaign conditions unknown |
| `BEL_EU_baltic_expansion_decision` (2166) | 100 PP; 8 | Same scoped annex/core mechanism for the Baltic state list | Same helper/title limits; not an unconditional annexation |
| `BEL_EU_scandinavian_expansion_decision` (2460) | 100 PP; 13 | Scoped Scandinavian annexation/cores, including separately scoped state rewards | Same helper/title limits; full list in details |
| `BEL_invest_congo_gold_into_welfare_decision` (125) | 10 PP; 4 | Qualifying Congolese subject autonomy +50; 180-day spirit with consumer goods factor -15% | Inherited category conditional trigger is unsupported |
| `BEL_worker_rallies_decision` (4324) | 50 PP; 4 | Active PP gain -10% for 15 days; removal gives Communist popularity +10 percentage points and stability -5 points | Dynamic focus name; conditions not evaluated |
| `BEL_emergency_measures_on_production_front` (308) | 100 PP; 1 | 180-day spirit: factory output +25%; civilian/military construction speed -15% | Inherited category conditional trigger is unsupported |
| `AUS_german_animosity_towards_high_command` (3) | None recognized; 2 | Mission timeout branches trigger the thwarted/assassination event after 12 hours | Flag state unknown; downstream event outcomes not expanded |
| `AUS_up_security_around_high_command` (56) | 30 PP; 6 | PP gain -10% while active for 20 days | Bookkeeping flag is not a separately claimed strategic outcome |
| `AUS_state_garrison` (103) | 25 PP; 7 | After 30 days, add Garrisoned State modifier to the selected state | Dynamic modifier values explicitly not evaluated; target not observed |
| `AUS_send_infantry_equipment_to_italy` (688) | 100 PP; 5 | Trigger equipment-offer event for Italy after 12 hours | No equipment quantity or transfer success inferred from the name/event |
| `AUS_industrial_coaxing_decision` (2684) | 100 PP; 9 | Commit 3 civilian factories for 50 days; removal triggers target-country event after 12 hours | Dynamic event name/target; later event consequences separate |
| `AUS_recruitment_push` (456) | Custom cost unrecognized; 18 | 365-day spirit: weekly manpower +100 and mobilization law cost -25% | Custom CP >25 is a requirement, not proven spending; templates/random unit placement and Anschluss helpers unsupported |

BEL file SHA256: `7888596c0407e8773e8c7c723b7d1d0199ccd99efd4c6af78097e6c708ff66e7`.
AUS file SHA256: `d74c450d02af0023c7fd94372966272b4af022c4941fce7e8b96bf001ea79219`.

Prioritization used frequency plus player value and implementation risk. Raw-key counts below locate work; they do not estimate explanation completeness.

| Construct family in twelve sources | Frequency signal | Value / complexity / disposition |
|---|---|---|
| Removal phases, active modifiers, timers | 8 `remove_effect`, 13 `modifier`, 9 `days_remove` | High economic value, low/medium complexity; render phases and supported units |
| Country/state scopes and territorial rewards | 10 `FROM`, 7 `add_core_of`, 3 subject loops/annex commands; 213 state entries | High strategic value, medium complexity; explicit target/guard tracking |
| Political prerequisites, flags, diplomatic rules | 18 `original_tag`, 10 country flags, 7 completed-focus, 5 subject-of | High eligibility value, low/medium complexity; known meaning with unknown current state |
| Timed ideas, modifiers and event references | 4 event commands; timed ideas in three sampled decisions | High benefit/cost value, medium complexity; unique same-index links, event trigger only |
| Scripted eligibility helpers | 71 `controls_or_subject_of` occurrences plus Anschluss risk helpers | High relevance, high expansion/parameter/scope risk; explicitly unsupported, future bounded helper interpreter |
| Unit templates, randomness and runtime names | Recruitment template/random placement; several dynamic titles | High complexity, contextual semantics; retain limits rather than infer quantities/outcomes |
| Tooltips and flags as effects | 10 custom tooltips, 6 set flags, 8 clear flags | Low direct strategic value; bookkeeping/descriptive roles, excluded from outcome metric |

## Implemented semantics and UI

`src/mechanics-interpreter.ts` supplies seven statuses: explained, conditional, known meaning/current state unknown, missing localization, unsupported script, ambiguous scope and parser limitation. `src/mechanics.ts` keeps the common entry interface. Known predicates never become true merely because they can be described. Unsupported branches remain visible and are not flattened into unconditional rewards.

New support includes literal timed ideas with linked modifier units/provenance; bounded country/state/ROOT/FROM/PREV/owner/controller scopes; guarded country/subject/state loops; uppercase and lowercase effect if/else-if/else; active modifiers and removal/timeout/cancel/research-completion phases; literal event delays; autonomy and ideology changes; annexation/troop transfer, state cores, resources and building levels; political/diplomatic/idea/focus/technology/flag prerequisites and grouped boolean conditions. Numeric interpretations include PP, manpower, XP, stability/war-support percentage points, research/production/construction factors, consumer goods factor, weekly manpower and mobilization-law cost. These are deterministic source explanations, not engine-parity certification.

The existing importer adds names, name provenance, uniquely resolved idea modifier records and event/category context. Duplicate ideas refuse resolution. The index rule revision `knowledge-foundation-v5.6.2-mechanic-context` refreshes cached references. No second indexer or database was introduced. The full definition and linked idea evidence retain path/line/hash/version.

Planner decision/technology results now use one column with ten results per page, larger localized titles, category/version, costs, specific effects, concise eligibility and optional detail. Country filtering says **Related to this planning country** or **All countries** and is explicitly discovery, not availability. Technical source is on demand. Encyclopedia decision/technology lists and full detail use the shared explanation engine; focus objectives retain their existing planner workflow. Search identifiers, aliases and saved plans remain supported. Dynamic target titles use role placeholders; runtime event-name functions remain marked unavailable.

Remaining limits: scripted helper expansion, conditional trigger `if` (distinct from effect branches), random distributions, division templates, dynamic modifier numeric values, variable formulas, arbitrary runtime localization, downstream event consequences, effective mod merging, and some technology dependency/exclusion/modifier semantics. Full-reference headers/universal-search titles may still expose dynamic source titles. Large territorial lists remain verbose, though collapsed details retain the complete conditions. Keyboard/responsive checks do not certify all accessibility or high-DPI combinations.

## Validation and repeatable commands

43 distinct focused Node tests passed across explanation, usability, importer, knowledge-store, strategy, history, planner-model and bridge-platform suites. The final affected rerun passed 21 tests (overlapping that total). The nine new explanation tests cover units, scope, guarded branches, unknown state versus unsupported semantics, phase/custom-cost handling, event parameters, missing/ambiguous names, linked source provenance and guarded technology rewards. TypeScript and the production build passed. Existing broader QA-LEDGER gates remain open.

Evidence: `.bridge-local/m71-focused-tests.txt`, `m71-affected-final.txt`, `m71-build-final.txt`, `m71-final-audit.txt`. Source UI passed with installed Edge: `artifacts/qa/explanation-browser-2026-11-06T22-14-35-261Z-811fc0ff/`; desktop/mobile screenshots reviewed. The first run supplied a nonexistent historical filename, then corrected it to the documented `owned-snapshots.jsonl`; this was test input, not a product/native failure. An earlier successful visual pass exposed tall cards; summaries were tightened and the affected journey rerun. No unchanged retry loop or HOI4 restart.

From the repository, with Node on PATH:

```powershell
node --import tsx --test tests/explanations.test.ts
node --import tsx scripts/explanation-audit.ts
$env:HOI4_INTELLIGENCE_RECORDING = (Resolve-Path .bridge-local/native-HN3JuU/owned-snapshots.jsonl).Path
node --import tsx scripts/explanation-ui.ts
# After committing validated source:
npm run package:development -- M7.1
node scripts/package-acceptance.mjs '<new build root>'
$env:HOI4_STRATEGY_SMOKE = '1'
$env:HOI4_EXPLANATION_SMOKE = '1'
node --import tsx scripts/development-package-smoke.ts '<freshly extracted executable>'
```

The UI helper requires the existing local audit database and retained recording; no personal save is needed. If those local evidence files are absent, use the bundled historical recording for manual review, or create an explicitly labeled synthetic fixture for an offline test. Do not claim a fresh native observation. A changed source hash requires a new matched audit, not disabling the provenance check.

## Windows package and checkpoint

Runtime source commit: **`9f19b9e54908`**. Later documentation/test-harness corrections do not change the packaged application.

- ZIP: `C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.1-9f19b9e54908/M7.1-9f19b9e54908-windows-x64.zip`
- Run: `C:/Users/conno/Documents/HOI4 Companion Development Builds/M7.1-9f19b9e54908/win-unpacked/HOI4 Companion M7.1-9f19b9e54908.exe`
- ZIP SHA256: `49e18d0cf0719331290dc1139615af9bebbf356282db6c8c72238e390e52b835`.
- All **76 files** in a fresh extraction matched byte-for-byte. The actual acceptance executable was under `acceptance-extracted/win-unpacked/`. Its bundled runtime members matched the compiled source output.
- Three packaged checks passed: first window (28.8 seconds including cold indexing); installed resources/embedded API, aliases and universal search, focus objectives, grouped requirements/exclusions, saved alternative comparison, Belgian/Austrian decisions, technology units, advanced source, keyboard and 390px layout; service shutdown plus restart/history/strategy persistence (5.1 seconds). Renderer sandbox and context isolation remained enabled. Developer Node paths/options were removed and working directory was outside the checkout.
- Evidence: `artifacts/qa/development-package-2026-11-06T22-30-19-033Z-2c4dba3e/`, `.bridge-local/m71-package-smoke-passed.txt`, `m71-package.txt`, `m71-extraction.txt`. Source identity remained unchanged during the successful run. Desktop and mobile screenshots reviewed; all three recorded owned process IDs were absent afterward. No HOI4 process was launched or running at cleanup.
- The normal build profile remains fresh. `START-HERE.md` contains `MILESTONE-7.1-ACCEPTANCE.md`; `M65-HISTORICAL-OBSERVATIONS.jsonl` is a byte-identical copy of the eight historical observations already bundled in M7. It is not live desktop state. The automated restart test separately used retained M3 history to preserve existing test expectations.

Two packaged attempts exposed test-harness defects, with no application rebuild: the old exact-text assertion matched both a requirement preview and its expanded detail; the combined journey then treated an empty boolean `open` attribute as closed and toggled an already-open panel shut. Scope the assertion to expanded details and check attribute presence (`=== null`), respectively. Each correction was checked with a small reproduction before the successful combined run. One local open-state reproduction initially omitted the region role; its corrected form passed both initial states. Failed evidence stays in `development-package-2026-11-06T22-26-10-959Z-5c2f6fc9/` and `development-package-2026-11-06T22-28-02-309Z-4cebc37e/`; the harness now captures failure screenshots/accessibility state. No unchanged failure was retried.

Extract the whole ZIP into a new desktop folder and follow its START-HERE walkthrough. Normal storage is `%APPDATA%/HOI4 Companion Development/M7.1-9f19b9e54908/`; no older installed application or package is overwritten. Unlike `npm run browser`, this contains Electron and the local service/resources, needs no developer Node/npm, and uses the isolated milestone profile. It remains unsigned and unpublished. If startup fails, retain this profile's diagnostics; if references are absent, verify Sources & settings rather than restarting HOI4.

Reachable-history audit at the runtime commit found zero secret-pattern, suspicious-path or large-blob findings; only the existing icon binaries. The remote was verified private. Final documentation/test-harness diff is separately reviewed, committed and pushed only to `feature/hoi4-ux-m71`; the exact remote-equality receipt stays ignored locally. M7 ZIP SHA256 remains `d650d22d0a046303514804f01f60ebce9ab173de34dccf52734dc89b0a25e36e`; previous branches are unchanged. No release, merge, update, save/mod/playset change or new native qualification.

Next development priority after desktop feedback: a bounded, provenance-preserving scripted-helper interpreter and more dynamic modifier explanations, with matched real-source audits. Keep arbitrary runtime state and native observation qualification separate. Do not expand gameplay control to address reference usability.
