# KGE-01 delivery — experimental campaign design adviser

November 16, 2026. This is the first useful slice of the owner-selected knowledge-engine direction, not near-complete game understanding. [Contract and continuation](KNOWLEDGE-ENGINE.md), [manifest](../milestones/KGE-01.json), [verification](KGE-01-VERIFICATION.json), [draft PR #24](https://github.com/connorgreenleaf22/hoi4-companion/pull/24). Main remains unchanged; owner usefulness/merge acceptance is pending.

## Delivered behavior

Division & production now contains an experimental campaign design adviser. The player supplies research, selected doctrine/spirit/MIO blocks, country/date, candidates, objective and constraints. It constructs divisions/modular tanks, assigns designed tanks to divisions, explains supported stat contributions and eligibility gaps, compares candidates and searches declared battalion counts or tank-module alternatives. Search enumerates 2–128 candidates without silent truncation; the UI varies one dimension and the service supports multiple dimensions.

Comparison inputs save separately by campaign in existing SQLite with CAS revision checks. Same-origin navigation/reload restores local drafts. Explicit Load saved comparison reopens canonical inputs after a desktop restart. Sharing a saved study with the AI adviser is off by default; an explicit opt-in supplies a bounded, re-evaluated estimate summary through the existing preview/fingerprint/payload/spending flow. No real provider request was made.

The service, ordered parser, canonical resolver and existing index are reused. All numbers are experimental estimates and manual campaign assumptions. By default, incomplete candidates do not rank. Opting into partial-effect estimates never waives failed research, incompatible slots, count limits, source mismatch or unresolved eligibility. Existing five null qualified combat totals, planner coverage, QUAL-195 and final-release gates are preserved.

## Identity and validation

- Base: `6f0762a892efce1575834abb34fc49c52dbeeca1` (verified current main at execution start).
- Implementation: `67a90892d492e2b6a5f47e4a28c21118dffdf27a`; final runtime: `7c9b7e7d13e0fc997db1cf2ce6bfea671af9cd23`.
- Independent reviewer `/root/knowledge_review` approved the final runtime for isolated development packaging, after reviewing the actual base diff and final support-speed delta. This is separate-agent evidence, not GitHub human approval or owner acceptance.
- Final focused engine/HTTP/existing-AI suite: **43 passed**. Includes modifier layers, tank composition, categories/counts/research, source invalidation, unsupported metrics, bounded search, draft schemas, save conflicts, campaign isolation, restart persistence, slow request concurrency, paired-remote refusal and exact opt-in AI wire budgeting. Hosted CI adds only the pure engine tests.
- Browser journey: **8 passed, zero renderer errors**. Extracted Windows journey: **9 passed, zero renderer errors**, including real shutdown/service refusal/full restart and explicit load of canonical inputs. Narrow layout inspected visually with no adviser overflow.
- Four hosted checks succeeded at runtime SHA: `qa-typecheck`, `qa-test-ci`, `qa-schemas`, `qa-hygiene`, [run 43988586991](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43988586991). Final evidence-head checks are recorded separately in the PR.
- Installed **1.19.5.0** isolated-index probes exercised two infantry compositions and a modular light tank. Each retained nine explicit research-effect omissions and `partial` status. A partial-effect-opted-in comparison produced a bounded result, not a claim about actual Siam or engine parity.
- Independent source-index counts include 107 doctrines, 44 milestones, 474 rewards, 308 equipment definitions, 6,515 ideas, 312 modules, 553 real MIO organization roots, 552 technologies, 158 units and 37 upgrades. These counts are indexing observations, not percentages of interpreted or validated mechanics.

## Windows candidate

Package label `M7.4.4a-7c9b7e7d13e0` is only a development artifact identifier. It does not complete a broader M7 milestone.

Local package root: `Documents/HOI4 Companion Development Builds/KGE-01/M7.4.4a-7c9b7e7d13e0`. The ZIP is `KGE-01-7c9b7e7d13e0-windows-x64.zip`, SHA256 `762bf82a0ad2901709e3e2fe19d5035fa65596b20749a13271fa3a3d7ba6b8ac`. A fresh `review-extracted` directory contains the executable. **74 files** match the unpacked build; **six application bundle files** match generated source build bytes, including service, Electron entry, index worker, HTML, JavaScript and CSS.

The fixture used a disposable application database, synthetic campaign/content and the new development-label Electron profile; it did not open the regular Companion database or launch/control HOI4. Temporary synthetic test preferences remain confined to that development profile; no regular user preferences were cleaned or replaced. No binary is published in the public PR.

## Findings and corrections retained

Independent review identified and the builder corrected shared SQLite transactions spanning body awaits, silently omitted speed/piercing modifiers, turret-enabled gun categories validated too late, stale UI results, malformed/incomplete draft restoration, optional studies blocking AI context, empty count ranges, search-parameter response races and support companies incorrectly slowing divisions. Regressions cover these behaviors. Browser exercise also caught an initial undefined-result dereference; it was corrected before freezing.

The first extracted restart assertion expected localStorage drafts to survive a new loopback port. The canonical SQLite workspace was intact; the harness assumption was wrong. The external harness was corrected to exercise explicit Load saved comparison, and nine checks then passed on the unchanged approved artifact. The contract now distinguishes same-origin draft retention from canonical saved-work recovery. This harness/documentation correction did not require a repackage or new game test. Initial script module-format and archive path-separator harness errors were diagnosed locally; no game/provider calls were used.

## Remaining scope and acceptance

No engine-parity claim is made. Organization/support weighting, equipment normalization, modifier ordering/caps and essential/transport behavior remain approximate. MIO inheritance/equipment groups/progression, doctrine prerequisites and general country-specific effects are incomplete; selected numeric bonuses are not a complete doctrine adviser. Aircraft, ships, production deadlines/stockpiles, multiobjective opponent/terrain analysis, battle simulation and near-complete focus/event interpretation remain future slices.

Existing independent combat qualification remains tracked by [Issue #10](https://github.com/connorgreenleaf22/hoi4-companion/issues/10). Owner acceptance should exercise an actual manual scenario, compare the explanation with the game and record usefulness/changes. Tests cannot supply that acceptance. No main merge, final release, automatic HQ edit or real provider call occurred. A generated Project HQ handoff is provided separately; synchronization is pending.
