# v0.5 r4 staged QA-fix handoff

Status: **candidate for independent retest; not release acceptance**. This source snapshot is a staged continuation of the r3 independent rejection. The package metadata still reports 0.4.0 and this is not a packaged v0.5 executable. No live project source, user database, game file, existing release or prior snapshot was overwritten. The builder has closed its desktop/browser/services.

## Independent findings addressed

1. Unverified division values and production estimates are now unavailable in the UI. The public `/calculate` and `/production` routes return 503 rather than unverified results; `/template-validation` returns only input validity. This intentionally changes prior API behavior and disables previous production estimates pending matched game/rounding checks. Cost eligibility and actual production availability are distinguished in equipment API responses. The earlier manual percentage what-if was removed because its base division figures are unavailable.
2. Replacement/deletion/campaign change: the comparison is now a synchronous comparison of user-entered unit counts, keyed to active profile, saved template name, exact saved rows and index revision. It does not request async division statistics. Changed/deleted templates, profile switches and reference changes hide/invalidate the comparison.
3. Empty and all-zero templates now fail both domain validation and UI validation and cannot be saved as a meaningful zero-valued division. Existing saved profile formats are not migrated or rewritten.

The 60 duplicate-archetype chains remain withheld. Raw equipment declarations remain labeled as extracted, with source chain, line, version and hash; they are not claims of gameplay parity. Decimal display/difference avoids two-decimal truncation and binary subtraction artifacts. Source-declared equipment comparison is not final equipment effectiveness.

## Evidence

- Source archive `candidate-v0.5-qa-fixes-r4.zip`: SHA-256 `55C29B467EEE4E410573F2C7B633EA20BF4A2058C7BEAB6E0A310D86EFBFE3E7`. It contains selected source, configuration, tests, scripts, QA ledger and `CALCULATION-SPEC-v0.5.md`; it excludes databases, game files, installed dependencies, prior releases and generated builds. Earlier baseline and r3 archives remain intact.
- `qa-bug-repro.txt`: both comparison and empty-template defects reproduced in a browser using a copied disposable index before the fix.
- `npm run build` passed; `regression-post-fix-r2.txt`: **177/177 developer tests passed** with approved local loopback. The earlier 22 independent failures remain blocked/unadjudicated in that review; this builder run is not independent QA. The prior production API test was changed to verify the deliberate 503 availability gate; pure production arithmetic remains research-tested internally.
- `lab-fix-qa-final.txt`: disposable headless GUI checks passed for saved-template replacement, deletion, profile switching, a held late validation response, all-zero/empty saving, unverified API gates, decimal equipment delta and a withheld duplicate-archetype example. The comparison makes no legacy `/calculate` request. The tests use only a copied disposable database.
- `scripts/lab-fix-qa.ts` can create a disposable fresh index using discovered game files or `HOI4_GAME_DIR`; alternatively set `HOI4_QA_INDEX_DB` to an explicitly disposable indexed database to copy. It requires approved loopback and a Playwright Chromium executable. `scripts/lab-bug-repro.ts` is the historical pre-fix reproduction and is not an expected passing current test.

## Remaining before acceptance

Independent GUI, API, migration/reindex and saved-work retest is pending, as is independent rerun of the 22 previously loopback-blocked tests. Matched in-game designer, equipment, technology, national/doctrine modifier, armor/piercing, production and rounding fixtures do not exist yet. Those calculations remain unavailable; this candidate does not complete the approved v0.5 scope. The full v0.4 ledger and 12 unverified guide claims remain open. Review `CALCULATION-SPEC-v0.5.md` for exact units, supported boundaries, research-only formulas and provenance. Prioritize reliable, current and source-traceable information toward v1.0.

Only an isolated candidate should be copied into the project for review. Any integration into live source or launch against actual user data requires the environment's separate narrowly scoped out-of-root authorization and independent acceptance; preserve the existing release snapshots and user databases.

## Candidate-folder copy blocked

The attempt to copy the r4 source archive and QA artifacts into `C:\Users\conno\OneDrive\Documents\Hoi4\companion\candidates\v0.5-qa-fixes-r4` was **denied by automatic approval review**, before process creation. Its stated reason was that the out-of-workspace OneDrive destination's ownership and sharing status were unverified for the private source and QA artifacts. User-message history was checked; no materially new evidence addressing that exact destination/payload was found, so the denied action was not retried. A read-only check confirmed the target folder does not exist. The archive and evidence remain in the task-6 workspace and are available for independent retesting there; the live project is unchanged.
