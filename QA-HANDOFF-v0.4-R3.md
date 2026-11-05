# v0.4 R3 - guide certainty and captured-checklist retest

Candidate only; independent retest and full semantic/in-game acceptance remain incomplete. Portable `HOI4-Companion-0.4.0-r3.exe`, SHA-256 `CD1A54FEB1DC539CECC4A9A797940F7E6CAA2930AFCACBD57BFCF347C130FC1A`. Source/runtime snapshots, package manifests, independent R2 reports and developer evidence are retained in `release/v0.4.0-r3/`. R1 and R2 remain preserved; R2 SHA-256 is `336446DF2D55F424553E97DD917071C634583CCDE1CA15FDA7AFDCE0B29E4E4D`.

## What changed

The independent R2 audit classified 44 guide claims as 32 bounded script-supported, zero contradicted and 12 unverified. Of those 12, one had an overly strong app label: USA `war-dispatch` was `script-extracted` and interpreted a compound NOT as “neither.” R3 marks it unverified and describes only the declared 280/180-day branch structure. It explicitly does not identify which completion combinations select the delays. USA guide revision is now 2; its source IDs/hashes and claim ID are retained. Its starter assumptions and newly captured checklist retain the manual check and per-claim qualification.

The other 11 claims already had appropriate strategy/editorial or unverified labels and are not promoted. Generic starter provenance no longer calls a mixed guide wholly script-extracted. Existing USA r1 captures show an editorial-correction marker/notice, even if the index hash matches, while preserving original wording, sources, ticks and exports. The initial one-time research importer refuses to overwrite a reviewed catalog. See [GUIDE-QUALIFICATION-v0.4-R3.md](GUIDE-QUALIFICATION-v0.4-R3.md) for the complete 12-claim disposition.

No NOT engine semantics or complete route is newly established. Planner evaluation, preview/CAS/fingerprint policy, schema, dependencies, native close controller and security settings are unchanged. Compiled bundles change because guide content and capture wording are bundled into the service; byte identity with R2's whole backend bundle is not claimed.

## Developer evidence

- All 167 source/SQLite/API tests passed. Four added regression groups cover all 12 audit classifications, refusal to overwrite reviewed content, catalog/preview/committed checklist qualifications and historical-capture preservation.
- Seven discovery renderer groups passed, including visible `Unverified`, the manual starter check, old-capture correction with checked progress retained, write-free reading/Cancel, successful Apply, spoilers and formation browsing. Eight existing planner renderer groups passed, including capture/ticks, manual Done, pending responses, conflict recovery and source freshness.
- Build/package passed. Exact portable NSIS extraction is compared with the builder archive, every packed runtime member and the retained first-party build. Exact hashes and source/data comparisons are in candidate/manifests and QA-evidence.
- R2's independent density, USA native save/restart and sampled semantic checks remain historical evidence at their recorded scope. No R3 native or in-game pass is claimed. Owned test browsers/services/packaging processes are closed before handoff, and the builder holds no desktop window.

## Independent retest

Use the exact R3 portable with disposable `HOI4_DATA_DIR` and explicit `--user-data-dir` paths. Preserve the normal Electron cache and production DB. Reuse a copy of the isolated reference index or index separately.

1. Read the USA guide's `war-dispatch` claim. Confirm the unverified badge, unresolved compound NOT wording and preserved two source references. It must not state that “neither” selects 280 days. Check limits and the starter's shared manual checks before Apply. Other 11 audited unverified claims must remain editorial/unverified; wiki leads must not become unlock rules.
2. Preview/Cancel, then Apply in a disposable campaign. The new guide r2 checklist must retain `SCRIPTED · unverified`, the exact qualified text, source path/hash/claim/revision and manual check. Verify existing plans, completions, notes, bookmarks, templates and checklist ticks survive.
3. Load an older USA guide r1 capture with the original timing sentence and checked tasks, using the unchanged installed index. Its summary must show `guide correction`, and opening it must show the warning above retained text. Reading must not write. Original sources/ticks/export must remain identical. A subsequent reviewed Apply must preserve the old capture and add a newly qualified one.

The unresolved NOT truth table needs a separately authorized isolated engine fixture or independently reviewed authoritative specification. No four-combination engine test was performed. Full game routes, engine parity, genuine pending-save native lifecycle, physical offline, accessibility/high-DPI/screen readers, exhaustive combinations and performance remain at their ledger statuses. See [QA-LEDGER.md](QA-LEDGER.md) and the retained independent reports. This is not complete release acceptance.
