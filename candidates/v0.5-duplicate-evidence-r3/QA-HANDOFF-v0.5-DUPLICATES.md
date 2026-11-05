# HOI4 v0.5 — duplication-evidence candidate for independent QA

Status: **candidate only, not release acceptance**. This source snapshot retains version 0.4.0 metadata and must not be presented as a finished v0.5 build. No game file, existing release snapshot or user database was changed. All builder-owned browsers/services are closed before handoff.

## What this candidate does

Reuses the existing template builder, saves, comparison and production calculator. Adds a clearly hypothetical percentage what-if, equipment deltas, source-specific lineage, and conservative failure on ambiguous equipment, unit IDs or inheritance. The what-if does not model technologies or stacking. The importer now indexes `duplicate_archetypes` declarations and their raw `for_each` rules as source evidence; it does not apply them. Its rules revision changes and therefore triggers a transactional reference reindex on startup. Independent verification of this upgrade on a production-like copy is required before applying it to the live project.

Installed version 1.19.4.1 has 308 indexed equipment definitions. 248 have complete indexed archetype chains; all remaining 60 trace to 34 indexed `duplicate_archetypes` declarations and remain withheld because duplication/`for_each` behavior is not modeled or engine-verified. Example: `jet_fighter_equipment_1` reaches `common/units/equipment/x_plane_airframes.txt:131`, file SHA-256 `0747e1a834d4c44eeee593bc0d5cbd7f636be6f34be89be53b19f83afcd08f8a`. `installed-duplicates-check-output.txt` records the audit. These results describe indexed declarations, not gameplay parity.

## Evidence

- Source archive: `candidate-v0.5-duplicate-evidence-r3.zip`, SHA-256 `9AEF45E9248F3ED18C23B40A00065E7737381B081545BF65667D957BED943F26`. Contains selected source/config/tests and ledger, not node_modules, game assets, databases, generated builds or prior releases.
- `npm run build` passed; final regression suite `regression-round14.txt`: 175/175 passed, including exact saved profile payload and selection preservation through a simulated importer-revision refresh. This test is fixture-scoped.
- `lab-qa-round12.txt` passed the full headless workflow with installed data, including a visible unsupported-duplication warning. The follow-on exact link check `lab-qa-round15.txt` passed and inspected the raw source block. Rounds 13/14 source-link assertions failed because their selector chose hidden text, not because the link failed; the separate round 15 isolated and verified the visible source field. `scripts/lab-qa.ts` now uses the corrected source selector.
- Existing baseline and prior candidate archives are retained in the task-6 snapshots directory. New candidates must use new names.

## Review and blockers

Independent desktop, source semantics, production-like reindex and saved-work review remain pending. Matching in-game designer fixtures are untested; automatic technology/doctrine/designer/national modifier application, duplication transformations and equipment modules are unsupported. The manual what-if is arithmetic only. Keep the inherited v0.4 pending-save, physical-offline, accessibility and in-game limitations plus 12 unverified guide claims in the QA ledger. Connor's v1.0 priority is reliable, current and source-traceable information.

This isolated candidate is for review. Before touching the live project, independently assess evidence and availability changes, preserve an immutable source/build baseline and user data, and use the environment's out-of-root approval mechanism for a narrowly scoped integration. Do not overwrite existing snapshots or production databases.
