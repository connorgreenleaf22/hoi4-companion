# v0.4 R2 - starter preview density retest

Candidate only; independent retest and full semantic/in-game acceptance remain pending. Portable `HOI4-Companion-0.4.0-r2.exe`, SHA-256 `336446DF2D55F424553E97DD917071C634583CCDE1CA15FDA7AFDCE0B29E4E4D`. Frozen source, runtime, original R1 findings and developer evidence are in `release/v0.4.0-r2/`. R1 remains preserved at SHA-256 `6035763E4BE5B8EB2A7F0DB6D3554E444BA833829E65257275F975AB5E7040B9`.

## Correction

Independent QA's LOW preview-density finding is corrected in presentation only. `src/discovery-review.ts` places plan-wide and repeated assumptions in one shared list. Distinct step-only wording remains under its focus. Identical warning text appears once with all affected step numbers; the display model retains every distinct position, focus ID and diagnostic type. Different wording is not merged by similarity.

The raw report, source wording/hashes, captured checklist, preview fingerprint, plans and saved profiles are unchanged. Guide facts/revisions, importer, planner evaluation, API, storage schema, dependencies, Electron close behavior and security are unchanged. Compiled backend and Electron controller hashes match R1 exactly. The USA fixture's assumption list items fall from 30 to 12 with all 12 distinct strings retained, and nine warning rows become five scoped messages.

## Developer verification

- The actual frozen R1 renderer fails the new text-count regression: the guide-provenance assumption appears four times where one is required. `QA-evidence/negative-control/results.json` and `developer/r1-negative-control.log` are the deliberate failing baseline, not an R2 failure.
- All 163 source/SQLite/HTTP tests pass, including two new display invariants for complete distinct-text preservation, unique per-step reasoning, subset scopes, diagnostic origins and nonmutation. `QA-evidence/developer/all-tests.log`.
- Six actual renderer groups pass, including counting every distinct assumption once, unique per-step placement, grouped warnings, raw saved-byte/selection preservation on Cancel, successful Apply/checklist preservation, spoiler behavior and formation browsing. `QA-evidence/renderer/results.json`, `review-regression.json` and PNGs. These are headless developer checks, not native retest.
- Build and packaging pass. Direct extraction of the exact portable is checked against all runtime members and the frozen first-party build. See `candidate.json`, package evidence and source/runtime manifests for exact hashes and boundaries.
- R1's independent native USA Apply/restart and sampled scripted-claim comparisons remain historical R1 evidence. No new native or in-game result is claimed here. Three production companion DB files and the named installed source dependencies are checked for preservation; this is not a whole-system claim.

## Independent retest

Launch the exact R2 portable with disposable `HOI4_DATA_DIR` **and** `--user-data-dir` paths. Keep the normal Electron cache and production database out of the test. Use the existing isolated reference index or a separate fresh import.

1. Open the USA starter preview. Check that each of the four guide assumptions appears once in the shared section, each of the six distinct focus-specific assumptions remains under the relevant focus, and the two general planner assumptions remain present. Shared requirements and source/review wording must survive. Availability/branch/conditional warnings should appear once with their correct affected steps.
2. Inspect a different country and an unresolved/conditional route. Different assumptions must remain distinct; scope grouping must not remove requirements, evidence, blocked/unknown status or duration qualifications. Expand requirement explanations. Cancel must preserve saved payload and selection.
3. Apply once to disposable data, restart and inspect the new plan/checklist. It must retain the original raw assumptions, claims and sources, along with existing alternatives, notes, bookmarks, completions, templates and ticks. Display grouping must not rewrite captured answers.

Full semantic adjudication, other native journeys, genuine pending-save native lifecycle, physical offline, full accessibility/high-DPI/screen-reader, maximum-load checks and game-route/engine parity remain at their prior partial/untested levels. See [QA-LEDGER.md](QA-LEDGER.md) and the retained independent R1 report. No full acceptance is claimed.

No native app or game input is used during this correction. All owned developer test browsers, local services and packaging processes are closed before handoff; no desktop window is held by the builder.
