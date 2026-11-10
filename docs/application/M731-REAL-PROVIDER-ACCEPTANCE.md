# M7.3.1 real-provider acceptance — preflight recovery

Manifest: [M7.3.1](../milestones/M7.3.1.json). Acceptance tracking: [Issue #2](https://github.com/connorgreenleaf22/hoi4-companion/issues/2). User acceptance remains pending.

## 2026-11-10 laptop preflight

The existing M7.3.1-4d7c04f38fd7 Windows artifact matched its retained executable, ASAR and ZIP hashes. The development machine identifies as an HP OMEN laptop. The prior M7.3 database was inspected read-only: one rejected GPT-6.1 Sol attempt with the POR_estado_novo collision, no recoverable response or usage. M7.3.1 had no generation attempts. No API credential was read/exported; the user configured the original app, presence was checked through its boolean status, then the memory-only key was cleared when that build failed preflight. No remote authentication/model probe or generation was sent.

Fourteen existing deterministic generation/reference tests passed before provider use. Installed HOI4 1.19.4.2 was indexed by the isolated app. The exact requested objective selected 83 definitions; all 12 directly cited installed files matched their indexed hashes. The established eight-focus route normalized correctly, including Estado Novo, and was structurally valid but retained 75 blocking checks without supporting recommendations. This differs from the prior 104-check full fixture because the reviewed supporting-reference set differs, not because interpretation improved.

## Critical defect found before spending

`ai.ts` used the reward-only `explanationPreview` for requirements. That formatter deliberately removes condition nodes, costs and timing metadata. The outgoing context consequently had zero requirement summaries despite 129 interpreted requirement groups in the indexed source. It also dropped known decision costs, research years/cost factors and focus durations. Examples include the Non-Aligned government requirement for Restoration of the Monarchy and the 1936 year / 1.5 base research factor for Basic Machine Tools.

The original $0.07163 estimate / $0.1769775 reservation was withdrawn before approval or dispatch. The user explicitly authorized only directly observed critical defects, so a separate `fix/hoi4-m731-context` worktree was created from `bdb8a48` for this narrow serialization correction.

The fix preserves complete nested requirement text and uncertainty markers; supplies separate costs/timing; groups repeated interpretation-gap wording with deduplicated source locations (not complete call-site/condition paths); and explicitly counts understood outcome lines omitted from the compact reward preview. It reuses the existing interpreter and does not implement additional mechanics or promote coverage. Optional source fields preserve older saved contexts. Stable source prefixes, quote fingerprints, source hash/version checks, size ceiling and spending checks remain active.

A regression failed on the original empty requirements and passed after correction. Sixteen focused tests and the production build pass. The installed-copy offline check retains all 83 definitions, now with 57 nonempty requirement lists and 65 cost/timing lists. The source policy still treats these as requirements, not satisfied live-game conditions. No live observations, private notes or saves are sent. Unknown interpreter nodes and high-tier research applicability remain explicit limitations.

Local evidence is retained under ignored `.bridge-local/m731-real-acceptance-2026-11-10/`. Outgoing licensed source excerpts, full context/proposals, credentials and raw diagnostic data must not be committed. Packaged verification, independent review and the replacement quote will be added after validation.

## Paid request gate

Maximum one real GPT-6.1 Sol request, only after explicit user approval of the replacement quote. No retries, fallback provider calls or automatic revisions. The corrected bundle is necessarily larger than the defective one; approval of the withdrawn quote does not authorize it. Credentials must be entered again in the replacement build. Account validity cannot be proven offline; configured status verifies presence only.

Actual provider outcome, tokens, cost, usability, mechanical review and save/reopen acceptance: **not run**. User acceptance: **pending review**. HOI4/native tests: **not run**.
