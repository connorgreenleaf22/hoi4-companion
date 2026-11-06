# Milestone 6.1 desktop acceptance

This unsigned Windows x64 development build addresses M6 usability feedback. Engineering evidence is in MILESTONE-6.1.md; your desktop review is still pending. Keep HOI4 closed for this review. Allow about 15–20 minutes.

## Open the isolated copy

1. Copy the complete M6.1-<commit>-windows-x64.zip and Extract All into a new folder. Run `win-unpacked/HOI4 Companion M6.1-<commit>.exe`. Keep every supporting file together. Check the milestone/commit in the title. Do not copy its executable over an older app.
2. This build has its own data under `%APPDATA%/HOI4 Companion Development/M6.1-<commit>/`. Older build data, the installed companion, saves and mods stay separate. New-build emptiness does not mean older plans were deleted. Do not set HOI4_DATA_DIR to an older app's data directory. No automatic migration is performed; use existing explicit campaign export/import when needed.
3. Open **Sources & settings**. Confirm the actual desktop HOI4 folder, game version and source counts. Use the path setting and **Refresh game data** if necessary. First indexing can take tens of seconds. Check mod/DLC warnings; this is still a base-game reference index, not verified merged mod state. No Git, Node, Codex, MCP server or browser development server is required.

## Search without the game running

4. In **Search all game content**, try `Indonesia`, `INS`, `Dutch East Indies`, `dUtCh EaSt`, and `Dutch East Indes`. Installed 1.19.4.2 maps Dutch East Indies to Indonesia (INS); another patch may differ. Results show category, prominent name and secondary ID/alias. Arrow down then Enter opens the selected definition; Escape dismisses. Try a focus or technology name too. **Browse all search results** opens the full explorer. Report ambiguous or unexpected results rather than guessing the identity.

## Plan and understand an objective

5. From **Command center → Start here**, choose the planning action. Select/create a German campaign and its German National Focus tree. If you have a previous companion snapshot JSONL recording, Command center's **Your observed campaign → Open snapshot recording** can import it; review **Plan from this snapshot**, preview, then confirm a new workspace. A recording is optional for this review. A `.hoi4` save is not JSONL and cannot be converted merely by renaming it. Do not invent observed values or select live provenance for a manual fixture.
6. In **Find an objective**, type `GER_industrial_expansion`. Suggestions should appear immediately beneath that same input, without opening another dropdown. Press Arrow down then Enter. Confirm the selected objective and its summary. Expand **Requirements and detailed mechanics**: every numbered group is required (AND); alternatives inside a group are choices (OR).
7. Select `GER_prioritize_economic_growth`. In 1.19.4.2 the summary explains a **10 percentage point stability decrease**, while untranslated parts remain visible. Inspect the mutual exclusion with The Four-Year Plan. Open **Effect details and conditions** to see conditional outcomes. **Open objective details** should show readable mechanics. Raw script appears only after **Advanced technical source & provenance → Inspect full source block**. Unknown effects must remain unknown, not invented.
8. Select `GER_construct_the_reichsautobahn` and **Explore prerequisite routes**. On the validated patch two routes pass through the economic or Four-Year branch. Dynamic title text such as `[GetAutobahnName]` can remain unresolved. Open **What this route requires** and distinguish checked, unknown and assumed conditions. A source route is not proof of in-game eligibility.
9. **Draft route 1 as new alternative**, name it Economic route, review, then **Apply reviewed plan**. Draft route 2 as Four-year route and apply. Under **Compare saved alternatives**, select both and compare their shared objective and mutually exclusive branches. Open **rewards explained**. Advanced script is optional; times are nominal and benefits are not simulated. Neither plan issues gameplay commands.
10. Expand **Look up decisions and technologies**, choose Technologies and search `basic_machine_tools`. Inspect the readable research factor, year and named modifier. A source coefficient is not a calculated final campaign benefit. Inspect Advanced technical source only if desired.

## Reopen and give feedback

11. Close and reopen the same executable. Check saved alternatives and any imported history/baseline. An old recording stays historical even if your installed patch changed. Missing research/completed-focus observations stay unavailable. Existing manual plans must remain separate.
12. Report whether tasks are clearer, not just whether buttons work. For each issue include build/commit, HOI4 version, page, exact steps, expected/actual result, restart behavior and a screenshot if useful. Categories: blocked, incorrect, confusing, cosmetic, feature request. Avoid personal saves or whole AppData folders.

For a startup failure retain this build's `data/diagnostics/startup-*.jsonl`, note whether the window and source settings appear, and stop repeated unchanged retries. Do not alter regular playsets or install a mod for these tests. Formal acceptance remains yours to decide.
