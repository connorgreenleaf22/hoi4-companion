# Release and QA follow-up ledger

Owner disposition, 3 November 2026: **“Go ahead with 0.4, document these issues to be looked at later.”** v0.3 complete acceptance remains INCOMPLETE. Executed checks passed; the disposition permits development with the listed beta limitations. A missing test is not a confirmed defect and has no invented occurrence rate.

Baseline: v0.3 R2 `5F074817927FF7207E14C2C65BF7C63D0AB3DE2E9A43237F9679B99B4608703E`. Source of truth: `C:\Users\conno\Documents\Codex\2026-11-03\task-2\r2-acceptance\HOI4-v0.3-R2-Gate-Clarification.md`; copied unchanged into v0.4 baseline evidence. Historical independent findings are not developer reruns.

| ID | Status | Obligation and follow-up evidence needed |
| --- | --- | --- |
| V03-NATIVE-PENDING | UNTESTED | Genuine native pending-save close dialog and window/service lifecycle. Use a deterministic safe pending response on disposable data without adding production debug/auth bypasses. Unit/headless support and failed-save native recovery do not close it. Risk: lost latest edits, uncertain commit or stuck close interaction. No dialog failure reproduced. |
| V02-OFFLINE | UNTESTED | Physically disconnect networking, then open cached references/planner/guides and save local work. Browser request blocking and renamed source folders are limited simulations. |
| V02-A11Y | UNTESTED | Full accessibility, screen reader and supported high-DPI checks. Narrow browser layouts and semantic labels are partial evidence only. |
| V02-GAME-1 | UNTESTED | First inherited in-game source comparison from original acceptance plan; recover exact fixture and compare matched installed/game/DLC context. |
| V02-GAME-2 | UNTESTED | Second inherited in-game comparison, including planner supported timing/prerequisites as applicable. |
| V02-GAME-3 | UNTESTED | Third inherited in-game comparison, including calculator/designer values as applicable. Do not invent the missing fixture names. |
| V03-ENGINE | UNTESTED | Planner engine parity and relevant v0.4 event/unlock behavior in game. Extracted declarations are not runtime parity. |
| V03-FAULTS | PARTIAL | Native write-during-close choices, repeated close ordering, failed close-state reads, committed/unacknowledged responses and forced termination. Ordinary close recovery passed independently; DRAFT-CLOSE-01 resolved only within that tested scope. |
| V03-COMBOS | PARTIAL | Exhaustive ambiguity/identity migration, last-plan prevention, committed country/tree changes, malformed/deep/limit imports and the two effect-inventory DTO vectors. |
| V03-KEYBOARD | PARTIAL | Complete keyboard/focus navigation, native zoom and modal return focus; do not substitute selected headless journeys for full accessibility. |
| V03-PERFORMANCE | PARTIAL | Maximum-size interactive workloads with quantified performance thresholds. |
| V03-MIGRATION | HISTORICAL | R1 DB migration cancel/confirm/backup/restore/injected failure and installed extraction results supported unchanged R2 code; these are not fresh R2 native passes. |
| V03-PROTECT-02 | PARTIAL | Static packaged security settings are not complete supported-runtime inspection. No security changes authorized for v0.4. |
| V03-MATRIX | NOT INDIVIDUALLY ADJUDICATED | All 152 preparation rows retain this qualification at full-row level. Overlapping 153 source tests, 76 vectors and native groups are not a “152-case pass.” |
| V04-GUIDES-GAME | UNTESTED | Play representative USA civil-war, Elizabeth, Japanese secret-leader, Austrian/Hungarian and Liechtenstein routes under matching patch/DLC. No engine walkthrough passed during content research. |
| V04-COMMUNITY | OPEN | Full recent patch-matched external strategy review and reuse/licensing review. Direct wiki fetch returned 401; links are explicitly unreviewed leads with no copied text. |
| V04-CATALOG | SCOPED | Seven named initial entries. Other legacy cards remain unexpanded and are not represented as verified walkthroughs. Japan is partial and has no planner starter. |
| V04-INDEPENDENT | PARTIAL | R2 independent QA audited all 44 claims (32 bounded script-supported, zero contradicted, 12 unverified) and sampled USA/Hungary native/API behavior. This is not full semantic/engine/route acceptance. R3 qualification and historical-capture warnings require independent retest. |
| V04-PREVIEW-DENSITY | RESOLVED IN TESTED R2 SCOPE | Independent native USA/Hungary checks passed shared-assumption and scoped-warning display, with USA Cancel/Apply/restart/preservation. This does not certify every report shape. Raw reports/checklists/provenance remain retained. |
| V04-USA-NOT | UNVERIFIED; R3 QUALIFICATION RETEST PENDING | USA event .2's two-predicate NOT is not independently resolved. R3 marks the delay claim unverified, adds a manual starter check and flags older USA r1 captures without rewriting them. Four isolated completion-combination checks or an independently reviewed authoritative specification are still needed before certifying its interpretation. |

This ledger must be carried into later release handoffs until each obligation has evidence and an explicit disposition. Do not relabel an accepted beta limitation as a pass. New failures should receive a separate reproducible defect record and severity assessment.

R1 independent report: `C:\Users\conno\Documents\Codex\2026-11-03\task-4\QA-REPORT-v0.4-R1.md`, retained in R2 evidence. Its successful native USA save/restart and sampled claim comparisons are scoped observations, not full acceptance. It also records a possible normal Electron cache write on its first launch; only the three production companion database files were baseline-hashed. R2 development does not launch a native app or operate the running game.

R2 independent continuation: `QA-REPORT-v0.4-R2.md`, `GUIDE-CLAIM-AUDIT-v0.4-R2.md` and `QA-SEMANTIC-ACCEPTANCE-v0.4-R2.md` in task-4, retained in R3 evidence. R3's presentation review is [GUIDE-QUALIFICATION-v0.4-R3.md](GUIDE-QUALIFICATION-v0.4-R3.md). No new native/game run is claimed by the builder.
