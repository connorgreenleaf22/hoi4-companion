# v0.4 R1 independent QA handoff

Candidate, not an accepted or published release. Portable `HOI4-Companion-0.4.0-r1.exe`, 111,406,835 bytes, SHA-256 **6035763E4BE5B8EB2A7F0DB6D3554E444BA833829E65257275F975AB5E7040B9**. Target project: `C:\Users\conno\OneDrive\Documents\Hoi4\companion`; frozen delivery is `release\v0.4.0-r1`. The implementation workspace and durable disposable reference index are under `C:\Users\conno\Documents\Codex\2026-11-03\task-3\implementation`.

The owner explicitly authorized continuing with documented v0.3 QA gaps. Read [QA-LEDGER.md](QA-LEDGER.md) and the unchanged independent `HOI4-v0.3-R2-Gate-Clarification.md` in QA-evidence. This does not convert incomplete acceptance into a pass. Baseline R2 remains `5F074817927FF7207E14C2C65BF7C63D0AB3DE2E9A43237F9679B99B4608703E`; earlier source, runtime and portable snapshots are preserved.

## Scope to assess

Seven entries contain 44 narrow claims and 36 exact-source indexed links. Five offer early political starter sequences. Japan has no queue because its complete event chain remains partial; Scandinavia is a decision guide without a focus starter. The remaining legacy cards were audited and retained in source history, not represented as expanded verified walkthroughs. `CONTRACT-v0.4.md` and `server/discovery-content.json` are the implementation/content contract.

Script facts are separated from mechanics, strategy and unverified wiki leads. Sources retain file SHA-256, reviewed lines, patch, author, DLC context, limitations and reuse metadata. Full external wiki fetches returned 401; no page text is reused, no fully reviewed external guide is claimed, and patch-matched community strategy curation remains open. No full in-game campaign was played. Source matching certifies a cached declaration, not engine parity or live campaign eligibility.

Critical factual boundaries to independently inspect:

- USA: both Silver Shirts and Voter Registration can dispatch the warning chain. Neither is an unconditional immediate war button.
- Elizabeth: distinguish the .999 predecessor and the autonomous .1000 timed conditions/mean-time event. The suggested two-focus preparation does not guarantee succession.
- Japan: SEA versus WTT tree; Yasuhito flags versus promotion; Nobuhito event flags versus ruling leadership; Tokugawa's emergency modifies an existing leader. Do not infer a completed unlock from an isolated character/event.
- Austrian/Hungarian Habsburgs: competing Otto flags, alternate monarch outcomes, sibling Austrian focuses and Hungary's separate AND prerequisite blocks.
- Liechtenstein: every Swiss core owned by ROOT, three focuses, doubled-improved flag older than 175 days, neutrality and Otto. No advisor-hiring prerequisite was invented. It is a cosmetic-tag/leader transformation, not a separate playable country claim.
- Scandinavia: WTT OR AAT; required territory differs from rewarded territory.

## Developer evidence (overlapping levels, not an acceptance total)

| Level | Executed result | Evidence |
| --- | --- | --- |
| Source/SQLite/HTTP | 161 tests passed, including 8 new discovery groups | `QA-evidence/developer/all-tests-final.log`, `tests/discovery.test.ts` |
| Installed-source audit | Seven guides' hashes/ranges, claim-source IDs and 36 exact links checked; five starter references resolve | `QA-evidence/installed-source-audit.json`, research reports in `QA-evidence/developer` |
| Discovery renderer | Six groups passed on the packaged first-party renderer, zero page errors | `QA-evidence/renderer/results.json` and PNGs; headless, not native |
| Existing recovery renderer | Seven groups passed, including held committed response and late response/newer draft | `QA-evidence/developer/recovery-renderer.log`, regression run records |
| Compiled runtime | Two groups passed under Electron Node; no native window | `QA-evidence/developer/compiled-runtime.log`, regression run record |
| Build/package | TypeScript/Vite/esbuild and portable build passed | `build.log`, `package.log` |
| Package provenance | Direct NSIS container extraction; builder and actual portable ASAR hashes match. Every runtime member checked; first-party runtime linked separately | `candidate.json`, manifests and package contents-check evidence |
| Production protection | Three named production DB files hashed before/after and copied to a workspace-only backup; no app/game/save writes during development | `QA-evidence/data-protection.json`; no whole-disk claim |

Initial harness-only failures (top-level await, ephemeral sandbox index path and a missing default Playwright browser) were corrected by wrapping the harness, retaining the index in the workspace and selecting the already installed Chromium explicitly. Their corrected executed results are identified above; no product fix was required. The final source and runtime manifests identify the exact inputs. Source build snapshots are intended for review/rebuild, not to copy over personal databases.

## Suggested independent journeys

1. Verify executable SHA and ASAR/source linkage before launching. Use a new QA data directory, never production. Clone the disposable installed index at `implementation\artifacts\v04\installed-data\companion.sqlite` into your own directory, or reindex independently. Launch with `HOI4_DATA_DIR` set only in the child environment. Do not weaken authentication or enable a debug port.
2. Default overview/catalog: search Elizabeth, Alois/Liechtenstein and Japanese secret titles with secrets hidden. Inspect returned catalog payloads and DOM. Reveal, read claims/sources, then hide again. Exercise late read responses, source links, tags, bookmarked-guide filtering, tab changes and preview cancellation. Secret content must disappear. Saved personal checklists/notes and the raw encyclopedia are not erased/redacted.
3. Raw Formations & restorations: no records load while hidden; reveal explicitly, search/page/open exact records, then hide. These candidates include cosmetic transformations, not just new nations.
4. With USA/AUS/HUN/ENG campaigns, capture raw saved payload and selection. Request preview, inspect unsupported/blocked/conditional requirements and Cancel; both must remain unchanged. Apply once: new alternative/checklist only, original alternatives, notes, bookmarks, templates, actual completion and checklist ticks survive. Double-click and replay, stale campaign, stale source and tampered fingerprint must not overwrite work.
5. Try wrong-country campaigns, existing dirty planner drafts, 20-plan/50-checklist boundaries, missing/duplicate references, absent source coverage, changed dependency hash and patch mismatch. No silent selection or guessed reference is permitted. Download failed drafts, navigate away, restart after successful Apply, and inspect captured sources after refresh.
6. Check exact guide reference/note/bookmark behavior in the encyclopedia and returned detail drawer. Guide bookmark keys must not masquerade as unavailable raw references or expose secret titles in that list.
7. Inspect desktop and narrow layouts, keyboard modal use and native close protection. These samples cannot close the full accessibility/high-DPI/screen-reader obligation. Re-test ordinary DRAFT-CLOSE-01 recovery and attempt genuine pending-save native lifecycle only with a safe deterministic fixture.

## Untested, partial and blocked work

Independent v0.4 native acceptance is pending. No native v0.4 window was launched by this implementation owner. A read-only attempt to bind the already-running HOI4 window (`cua.getApp`, window 197702) timed out waiting for Computer Use app approval; it did not execute and was not retried without new evidence. The game and other user applications were not operated or terminated.

Physical offline, full accessibility/high-DPI/screen-reader, the three inherited in-game comparisons, planner engine parity, genuine pending-save native dialog, exhaustive combinations/identity migration/fault ordering and quantified maximum-load performance remain at their recorded untested/partial levels. No native dialog defect was observed or assigned an invented severity. No critical unknown full unlock condition is labeled game-verified.

All owned source/headless/runtime test services and child processes are closed before handoff. There is no v0.4 native desktop window to release. The unchanged existing game remains the user's. This candidate adds no AI feature, live access, save editing, publication, schema migration, dependency or security change.
