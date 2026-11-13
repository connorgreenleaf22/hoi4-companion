# Milestone 6 desktop acceptance walkthrough

This is an unsigned Windows x64 development build. Laptop engineering checks are recorded in `MILESTONE-6.md`; your main desktop has not yet been tested. No HOI4 launch is required. Allow roughly 15–25 minutes for this review.

## Start and check sources

1. Copy the complete `M6-<commit>-windows-x64.zip` to your desktop and **Extract All** into a new folder. Run `win-unpacked/HOI4 Companion M6-<commit>.exe`. Keep every supporting file together. The milestone/commit appears in the window title. `START-HERE.md` is this walkthrough.
2. No Git, Codex, MCP server, development Node installation or browser server is needed. First indexing may take tens of seconds. The application starts its own loopback service. Normal data lives under `%APPDATA%/HOI4 Companion Development/M6-<commit>/`, outside the extracted files. Existing installed companions and earlier development build data stay separate. Reopen this same build to keep testing the same workspace; builds do not automatically migrate each other's data.
3. Open **Sources & settings**. Check version, source files and installation folder. Steam libraries are discovered locally; if needed enter the actual desktop HOI4 folder and click **Refresh game data**. Missing files should leave the UI usable with a useful error. Game assets are not included. Check detected mods: the planner currently describes **base-game scenarios**, not a verified merged mod load order. DLC ownership/selection and tree applicability remain conditional where unverified.

## History into planning

4. Open **Command center → Your observed campaign**. With no connected game, disconnected/unavailable is expected. Import a previously exported companion **snapshot JSONL** using **Open snapshot recording** (not a `.hoi4` save). It should appear in Saved campaign recording and remain after restart. Choose fixture provenance for synthetic files. The package includes no personal recordings or game saves.
5. Select a snapshot and review country/date, source and freshness. Under **Plan from this snapshot**, choose a German focus tree and a new workspace name, preview, then confirm. Verify the historical baseline stays visible and missing research/completed focuses remain unavailable. If you have no recording, create a manual campaign for Germany and select its German National Focus tree; skip the baseline-specific checks below.

## Explore, save and compare

6. In **Campaign planner → Plan toward an objective**, search `GER_construct_the_reichsautobahn`, select it and choose **Explore prerequisite routes**. On laptop version 1.19.4.1 this produces two routes through Prioritize Economic Growth or The Four-Year Plan. Other patches may differ. Dynamic localization may appear as `[GetAutobahnName]` because live localization is not evaluated.
7. Open **Requirements and source**. Separate prerequisite groups are all required; alternatives inside a group are choices. Conditions can be satisfied/unsatisfied in the stated planning context, unknown from missing information, or unsupported. An apparently valid static route is not proof of current in-game eligibility. Inspect bypass, cancellation and source rules separately.
8. **Draft route 1 as new alternative**, rename it **Economic route**, review the queue, and **Apply reviewed plan**. Explore the objective again, draft route 2, rename it **Four-year route**, and apply. Original alternatives remain. Neither operation completes a real focus.
9. Under **Compare saved alternatives**, select both names and compare. Expect a shared Autobahn objective and a mutual exclusion between the economic starting branches. Inspect each sequence, unresolved requirements and **defined reward**. Durations are nominal source costs under sequential-completion assumptions, not predicted calendar outcomes. No industrial or combat benefit is simulated and no route is declared universally best.
10. Select another goal such as `GER_industrial_expansion` to inspect multiple required groups. Searches are bounded: a partial-result notice must remain visible if the limit is reached. Missing/cyclic/ambiguous/joint structures should explain their limits, never choose a guessed definition.

## Decisions, technologies and persistence

11. In **Decisions and research**, try country-matched decisions, then **All countries and generic**. Country matching uses an identifier or indexed mention, not eligibility. Open costs, conditions and effects, and **Inspect source and relationships**. Category gates and dynamic scripts may remain unresolved.
12. Switch to **Technologies**, search `basic_machine_tools`, and inspect research cost, year, categories, declared paths and benefits. Source links are not a complete dependency/research-speed simulation. Current research, ownership and focus-granted bonuses are not inferred from a historical snapshot.
13. Close the app and reopen the same executable. Check history, historical baseline, saved alternatives and comparison. Switch the plan selector back to Economic route, edit its queue and review/apply. Confirm another alternative and the original recording are intact. Unsaved-draft close protection should still work.

## Report feedback

Send one item per issue using this template; attach a screenshot if useful. Avoid sharing personal saves, secrets or an entire data directory.

```text
Build / commit (window title):
Desktop Windows version; HOI4 version and DLC/mod selection:
Page / feature:
Steps to reproduce:
Expected:
Actual:
Reproducible after restart?:
Impact: blocked / incorrect result / confusing / cosmetic / feature request
Screenshot or exact error:
```

For startup failures retain `data/diagnostics/startup-*.jsonl` inside the build's AppData directory. Record whether the window appears and whether sources load. Do not delete existing saves/data or repeatedly restart an unchanged failure. Formal acceptance and desktop compatibility remain open until your review; this walkthrough does not ask you to perform it during implementation.
