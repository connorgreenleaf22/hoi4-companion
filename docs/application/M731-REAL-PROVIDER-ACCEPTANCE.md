# M7.3.1 real-provider acceptance — technical result

Manifest: [M7.3.1](../milestones/M7.3.1.json). Acceptance tracking: [Issue #2](https://github.com/connorgreenleaf22/hoi4-companion/issues/2). User acceptance remains pending.

## 2026-11-10 laptop preflight

The existing M7.3.1-4d7c04f38fd7 Windows artifact matched its retained executable, ASAR and ZIP hashes. The development machine identifies as an HP OMEN laptop. The prior M7.3 database was inspected read-only: one rejected GPT-6.1 Sol attempt with the POR_estado_novo collision, no recoverable response or usage. M7.3.1 had no generation attempts. No API credential was read/exported; the user configured the original app, presence was checked through its boolean status, then the memory-only key was cleared when that build failed preflight. No remote authentication/model probe or generation was sent.

Fourteen existing deterministic generation/reference tests passed before provider use. Installed HOI4 1.19.4.2 was indexed by the isolated app. The exact requested objective selected 83 definitions; all 12 directly cited installed files matched their indexed hashes. The established eight-focus route normalized correctly, including Estado Novo, and was structurally valid but retained 75 blocking checks without supporting recommendations. This differs from the prior 104-check full fixture because the reviewed supporting-reference set differs, not because interpretation improved.

## Critical defect found before spending

`ai.ts` used the reward-only `explanationPreview` for requirements. That formatter deliberately removes condition nodes, costs and timing metadata. The outgoing context consequently had zero requirement summaries despite 129 interpreted requirement groups in the indexed source. It also dropped known decision costs, research years/cost factors and focus durations. Examples include the Non-Aligned government requirement for Restoration of the Monarchy and the 1936 year / 1.5 base research factor for Basic Machine Tools.

The original $0.07163 estimate / $0.1769775 reservation was withdrawn before approval or dispatch. The user explicitly authorized only directly observed critical defects, so a separate `fix/hoi4-m731-context` worktree was created from `bdb8a48` for this narrow serialization correction.

The fix preserves complete nested requirement text and uncertainty markers; supplies separate costs/timing; groups repeated interpretation-gap wording with deduplicated source locations (not complete call-site/condition paths); and explicitly counts understood outcome lines omitted from the compact reward preview. It reuses the existing interpreter and does not implement additional mechanics or promote coverage. Optional source fields preserve older saved contexts. Stable source prefixes, quote fingerprints, source hash/version checks, size ceiling and spending checks remain active.

A regression failed on the original empty requirements and passed after correction. Sixteen focused tests and the production build pass. The installed-copy offline check retains all 83 definitions, now with 57 nonempty requirement lists and 65 cost/timing lists. The source policy still treats these as requirements, not satisfied live-game conditions. No live observations, private notes or saves are sent. Unknown interpreter nodes and high-tier research applicability remain explicit limitations.

Local evidence is retained under ignored `.bridge-local/m731-real-acceptance-2026-11-10/`. Outgoing licensed source excerpts, full context/proposals, credentials and raw diagnostic data must not be committed.

## Corrected runtime and replacement quote

Runtime: `155594f9c4d27780b969b217f19b01275d3d01bf`, branch `fix/hoi4-m731-context`, [draft PR #6](https://github.com/connorgreenleaf22/hoi4-companion/pull/6). Independent reviewer `/root/review_context_fix` inspected this exact SHA against `bdb8a4887522b38f5110f3900bbf1655cc5fd600`: no blockers. Review covered the diff and whitespace check, not an independent rerun of the builder's tests. Source-location provenance is not complete call-site/condition-path provenance. Optional fields preserve old contexts; qualification and spending gates remain unchanged.

Sixteen focused tests, TypeScript, production build, schema validation and hygiene passed. The replacement ZIP contains 75 byte-matched freshly extracted files; the extracted application launched and its local service returned the corrected context. This is companion application testing, not native HOI4 testing. At this pre-approval checkpoint, generated-strategy persistence had not yet been tested; its later successful result is recorded below.

- Artifact: `M7.3.1-155594f9c4d2-windows-x64.zip`, retained outside Git under `Documents/HOI4 Companion Development Builds/M7.3.1-155594f9c4d2/`.
- ZIP SHA256: `3eaad6e5da22d01006d4c150fbdcc5a4c887439b3c4c31f00655a1c612e4ee6f`.
- Exact packaged bundle: 83 definitions, 57 with requirements, 65 with costs/timing, 292 grouped uncertainty records. All 15 direct/nested evidence files match installed hashes. Base-game index revision `39404c534a84409b4cecb169cc9fdb9b1fc5aaf252ad5703bf95077911f22fc9`; active playset and DLC entitlement remain unconfirmed.
- Outgoing wire SHA256: `2f26b2ee02c26ebdd95b498d6e8ae157e30813019c3533f0dfb09d2111a73946`. Quote fingerprint: `c1ad5fea3ec22389628265cd62a13d04d2bcd17f1edbcaa2a40e3ac52f4dc79c`.
- GPT-6.1 Sol, low reasoning, estimated 43,837 input tokens, 3,000 maximum output tokens including reasoning. Estimate $0.1395925; conservative reservation $0.41485, using 153,940 conservative input tokens and full output cap. No cache discount assumed.
- Standard pricing per million: $2 input, $0.10 cache read, $2.50 cache write, $10 output; reservation/estimate conservatively use cache-write pricing. [Official model pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol), checked 2026-11-10. Local pricing version `openai-sol-2026-11-09-v1`. These are estimates, not invoice guarantees.
- Disposable acceptance session budget/request ceiling $0.50, confirmation threshold $0.05; spent/held $0, remaining $0.50, $0.08515 available after reservation. This replacement quote supersedes the older $0.20 walkthrough example; changing local settings does not authorize payment.
- Before approval, the new runtime had zero attempt records, no unsettled requests, and a fresh unused request ID. The old rejected M7.3 attempt was examined read-only; this was a separately authorized corrected acceptance, not a retry of its request ID.

At the approval checkpoint the replacement app was open at its session-key form. No credentials transferred between builds. Boolean configured status proved presence only, not remote account/model authorization. No remote probe was used.

## Paid request gate

The pre-approval gate permitted a maximum of one real GPT-6.1 Sol request, only after explicit approval of the replacement quote. No retries, fallback provider calls or automatic revisions. The corrected bundle was larger than the defective one; the withdrawn quote could not authorize it. Credentials had to be entered again in the replacement build. Offline configured status verified presence only; the later approved successful request established model/account access for that request. The one-request authorization is now consumed.

The user explicitly replied: “Key configured; approve one request at this quote.” Before dispatch, the harness rechecked the exact quote/context/wire fingerprints, settings, installed source hashes, key-presence boolean, unused request ID, zero prior attempt records and unchanged $0.50 remaining budget. An exclusive local dispatch marker prevents rerunning the harness. Exactly one local generate operation called the fixed OpenAI Responses endpoint; no fallback, remote probe or second generation occurred.

## Real-provider result (2026-11-10 local / 2026-11-11 UTC)

Technical generation, reference validation and saved-draft reopening passed on the extracted Windows runtime above. The source and financial qualification limits below remain open. This is not user acceptance or native game qualification.

| Provider-reported field | Result |
| --- | --- |
| Model / tier / status | gpt-6.1-sol / default / completed |
| HTTP status | 200 |
| Input tokens | 36,215 |
| Cached-read input | 0 |
| Cache-write input | 36,212 |
| Other input | 3 |
| Output tokens | 2,405 |
| Reasoning tokens | 0 reported, included in output accounting |
| Usage-based cost estimate | $0.114586 |
| Remaining local budget | $0.385414; held $0; no unsettled requests |

Cost calculation: `(3 × $2 + 36,212 × $2.50 + 2,405 × $10) / 1,000,000`. Actual counters came from the provider; dollars are a local estimate using the versioned table, not an inspected invoice. Taxes, discounts, credits and provider adjustments are excluded. The original historical failed M7.3 request's usage/invoice remains unavailable and is not included in this session's budget.

The structured response is retained in the app's SQLite attempt record and ignored local `real-generation.json`, before deterministic review. It passed unchanged: eight focus steps, six supporting recommendations, 29 typed reference occurrences / 17 unique references, all supplied in the exact bundle, zero ambiguous/missing IDs and zero repairs. No local content correction was necessary. The `POR_estado_novo` focus/idea collision did not recur.

## Mechanical and strategic assessment

| Area | Observed result and limits |
| --- | --- |
| Focus route | Same eight core focuses as the established source-backed route. The provider moves domestic Restoration from step 5 to step 7, after Uprising/Empire of Brazil. Both orders satisfy the inspected prerequisite graph; this is not evidence that the provider's order is faster or better. It labels the sequence conditional and offers earlier domestic restoration as an unranked alternative. |
| Costs and prerequisites | Correctly identifies 70 nominal days per core focus, 560 nominal total with explicit bypass/delay caveats, 220 PP from the first two focus rewards, and the two separate prerequisites for Kingdom Reunited. Branch exclusions and Non-Aligned government requirements are retained. |
| Political risk | Correctly distinguishes Duarte's -20 stability points, Restoration's below-40% civil-war branch versus -10-point alternative, and optional Army Reorganization's -5 points. Current stability/government are unknown. Civil-war force allocation is unresolved. |
| Decisions | Cites the two Portuguese agitation decisions, their 25 PP base cost, 180-day duration and -0.5 daily PP while active. Conditions identify DLC, peace, progression and unresolved neutrality/IF checks. It does not recommend Brazil's repression decision as a Portuguese action. No guaranteed popularity/stability recovery is claimed. |
| Research | Suggests unresearched 1936 Basic Machine Tools / Construction I and correctly distinguishes cost factors from actual research days. Avoids the bundle's distant-year specialist technologies. Research slots, already-researched state and equipment follow-ups remain unspecified. |
| Economy / military | Gives explicitly heuristic civilian-to-military preparation, equipment stockpiles and port/Atlantic cautions. Optional Public Works infrastructure and Army Reorganization's 15 XP/removal of Unreliable Army are source-backed. Factory numbers, build locations, production allocations, division templates and invasion readiness are not calculated. |
| Spirits | Identifies Estado Novo removal and Unstable Monarchy's -10% construction / -0.5 daily PP values. These are replacement spirit values, not verified net changes against Unstable Republic; the proposal must not be used as a net economic simulation. It does not fully explain every reward, including all Portuguese Empire bonuses or the timed domestic monarchist spirit. |
| Brazil events | Correctly treats annexation/cores/troop transfer as conditional on event choice and distinguishes civil-war and throne-restoration outcomes. Installed focus/event scripts were inspected read-only to corroborate key claims. Trial of Allegiance routing, refusal war goals, AI choice weights, flags, state ownership and all downstream outcomes are not fully interpreted. No guaranteed peaceful annexation or unsupported probability is claimed. |
| Provenance | All six recommendations have canonical references and explicit conditions. Key numerical claims were checked against indexed explanations and targeted installed-script reads. A reference verifies identity, not every clause; references are grouped per recommendation, and prose-only assumptions/alternatives lack individual structured citations. |

The deterministic review reports structural validity `valid`, but **106 blocking interpretation/campaign checks**. Costs and branch conflicts are marked reviewed; prerequisites, rewards, downstream events and source context remain incomplete. `provisionalAllowed=true`; confident recommendations, rankings and numerical optimization are all false. The eight-focus comparison without supporting recommendations had 75 checks; the larger proposal checks extra sources, so these counts do not measure regression or improvement.

**Engineering usefulness assessment:** materially useful as an editable provisional route and risk checklist. It covers every requested topic with relevant sources and acknowledges major unknowns. It is not a complete execution schedule, a verified selectable campaign path, or an optimal strategy. User usefulness/acceptance must be decided by the user after reviewing the saved proposal.

## Packaged usability and persistence

The paid request was dispatched through the packaged application's existing local API, using the user's session key; the Generate button itself was not clicked in this acceptance. Actual Windows UI checks then opened the retained request via **Recover local draft**, displayed the provisional strategy and costs, clicked **Save and recheck strategy**, reloaded the renderer, and reopened the saved revision from **Saved whole strategies and unranked comparison**. Revision 1 exactly matches the original provider content, verified by API readback and SHA256 `160eda9d90308c059cf4458a25863ef2f6d52bdd589e68bf643166765f6c2ce9`. One paid attempt and one saved strategy remain. This verifies renderer reload/reopen, not an additional full Electron process restart. Earlier package restart fixtures remain historical evidence.

The session key was cleared through the app's existing interface after generation; safe status reports unconfigured. Local recovery/save/reopen succeeded without credentials. Editable advice, conditions, focus movement and source links are present. The original response was preserved unchanged, rather than edited to make acceptance appear stronger. No focus alternative was applied and no campaign conditions were asserted.

Usability limitations observed: long recommendations and conditions live in short internally scrolling text areas; adjacent source buttons have little visual separation; optional supporting focuses sometimes display generic “Inspect source” labels. Opening a saved proposal inserts it above the list without automatically scrolling to it. These are review friction, not data loss; no additional UX development was undertaken. One accessibility click targeted an offscreen Save button and was refused; scrolling to the visible button resolved this without another provider call. User foreground changes were respected by recapturing state before continuing.

## Evidence and next step

- Sanitized receipt: [M731-REAL-PROVIDER-VERIFICATION.json](M731-REAL-PROVIDER-VERIFICATION.json). Private evidence remains in ignored `.bridge-local/m731-real-acceptance-2026-11-10/`, including exact wire, approval marker, original response and save readback.
- Runtime [hosted CI run](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/42927656643): qa-typecheck, qa-test-ci, qa-schemas and qa-hygiene all passed. Hosted checks are fixture-only, not real-provider proof.
- Open the extracted executable under `Documents/HOI4 Companion Development Builds/M7.3.1-155594f9c4d2/acceptance-extracted/win-unpacked/`. Select campaign **M7.3.1 real-provider acceptance**, open Campaign planner, then Saved whole strategies, **Monarchist Portugal: provisional restoration and Brazil reunification · revision 1**. No key is needed to read/edit/save locally. The app is left open on that saved proposal.
- If the proposal is not visible, reopen that saved entry and scroll upward to the editable strategy; do not generate again. The original attempt remains under Request history and local recovery.
- Next: user reviews usefulness and remaining uncertainty. Any additional paid generation requires separate authorization. The correction remains a draft PR; no branch merge, release, native HOI4 test or user acceptance is implied. Project HQ synchronization is pending; a handoff is generated separately.
