# UXD-01 — Independent review record

**November 11, 2026.** Reviewer **`/root/uxd01_independent_review`** was a separate agent from the audit author. This is independent source/evidence critique, not a GitHub human approval, a user acceptance decision or an independent runtime rerun.

Reviewed repository source: **bdb8a4887522b38f5110f3900bbf1655cc5fd600**. Separately inspected package-renderer evidence: runtime **155594f9c4d27780b969b217f19b01275d3d01bf**, corresponding source/documentation head **dfb27ec6a3b19e3a4240e550d501441db522c499**. The React components reviewed have no diff between these commits; AI context/service behavior differs. PR #6 remains unmerged and was not incorporated into the audit baseline.

The reviewer inspected baseline App, AiPlanner, StrategyWorkbench, discovery service, military Lab, CampaignIntelligence and planning coverage contracts; actual PNGs, measurements, the audit report and inventory drafts. The independent note is retained at [local review evidence](../../artifacts/uxd01/INDEPENDENT-REVIEW.md).

## Major conclusions and disposition

| Conclusion | Independent finding |
|---|---|
| Unsaved whole-strategy loss across Lab navigation | Supported by before/after PNGs and component-local state versus registered draft/close accounting. High severity and higher priority than cosmetic changes. No claim of saved-data loss. |
| Whole-strategy access is subordinate to focus planning | Supported by seven-route navigation and nested AiPlanner placement. Does not select either approved launch variant. |
| Discovery comparison and stale-guide recovery are incomplete | Supported. Acknowledge comparisons elsewhere and preserve the stale-source refusal; improve the recovery workflow. |
| Broad Germany source preview hits the size limit | Supported for the exact prompt/index/newer candidate. Not evidence all Germany requests fail, or of provider-quality failure. |
| Military tools are base calculators, not integrated designers | Supported by explicit exclusions and source. Layout changes cannot create qualified tank/aircraft models or simulation. |
| Missing campaign state is honest but technical and has no conversational fallback | Supported by synthetic/stale/unavailable UI and implementation. Empty audit roots do not establish a broken real installation. |

The reviewer required preservation of source/index identity, structured guards, qualification/freshness/ownership boundaries, revision/fingerprint checks, local recovery and persistence, budgets/holds, session keys and consent. Coverage flags for confident recommendation, ranking and optimization are currently literal false; resolving individual gaps alone does not qualify optimization. Editorial fun/difficulty comparisons must identify their basis. Human-readable sources and uncertainty must remain in normal mode even if raw hashes and diagnostics move to Developer Mode.

## Minor corrections and author verification

1. Added campaign delete/confirmation to inventory G03; source-inspected, not executed.
2. Clarified M7.4.2 as bounded infantry/medium-tank evaluation foundation; module/aircraft designers require separate scope.
3. Verified capture **31-global-search.png** exists and displays the actual global result dropdown; linked it in the gallery.
4. Added 1,258-character / 73px / 201px / 5,430px editor measurements and the fixture-specific 55-check result to `journey-measurements.json`.

**Final independent disposition:** no major audit-conclusion blocker, subject to the evidence limitations above. The reviewer did not rerun the application, make provider/game calls or mutate production state. The author applied and verified the four minor completion corrections. Owner acceptance and native/high-DPI/player-study follow-up remain open.
