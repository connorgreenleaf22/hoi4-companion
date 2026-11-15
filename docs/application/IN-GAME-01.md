# IN-GAME-01 — compact game companion

November 15, 2026. [Manifest](../milestones/IN-GAME-01.json) · [Issue #21](https://github.com/connorgreenleaf22/hoi4-companion/issues/21) · [Draft PR #22](https://github.com/connorgreenleaf22/hoi4-companion/pull/22).

The full strategy desk obscured the game during play. Three compact modes now expose the same existing application, with one renderer, campaign store, service and draft registry. Runtime: `8b0aa27688e6491798a7a76f563752ebdd419199`, branch `feature/in-game-companion-20261115`, baseline `6f0762a892efce1575834abb34fc49c52dbeeca1`. Later evidence-only commits do not change the packaged runtime identity.

## Using the modes

| Mode | Interaction |
| --- | --- |
| Side panel | Narrow desk beside the map; tool selector, search and editable work remain in the panel |
| Field HUD | Small radio bar; Open tools expands the same workspace, Collapse returns to the bar |
| Quick Intel | On-demand panel that focuses reference search when shown; every other tool remains available |
| Full workspace | Original broad strategy workspace, retained in the same mode menu |

Use **Integration mode** to choose a layout, and **Companion tool** to choose any of the seven existing tools. **Ctrl+Shift+Space** toggles visibility; **Ctrl+Shift+M** cycles modes. The pin keeps compact windows above other windows without automatically taking keyboard focus. The tray can recover a hidden panel if shortcut registration fails. Mode, expansion and pin preference persist; drafts retain their existing in-window durability limits.

Compact windows reserve the game's top controls on normal displays. They retain a standard draggable title bar, clamp to the current display work area and accommodate negative monitor coordinates. Use borderless or windowed HOI4. Exclusive fullscreen is not qualified. Browser access previews layouts, with native-only functions labeled; it does not claim to overlay the game.

## Feature and visibility boundaries

All modes retain Command center, Campaign planner, Encyclopedia, Campaign ideas, Division & production, Field manual, and Sources & settings, including their current dialogs, AI configuration/spending controls, history, editable strategies, notes and draft review. Mode changes and HUD collapse do not remount the application or replace its data. This is feature access parity through the same implementations, not a claim that every pre-existing feature received a new end-to-end acceptance run.

Expanded compact views expose the existing bridge status and field availability. They distinguish manual planning context, historical/save-derived records, native qualification, capture/check times, unknown fields and version mismatches. Refreshes serialize; failed refreshes clear the preceding status. They never merge records from different campaigns to manufacture coverage.

Quick Intel is an external companion panel. **Game-object hover detection, injected native tooltips and complete process-memory observation are not implemented.** [The assessment](IN-GAME-BRIDGE-ASSESSMENT.md) records current coverage and the staged path for deeper observation. No memory read/write or injection was performed. Current-patch observation qualification, complete game-state visibility, combat metrics and final-release gates remain unresolved.

## Validation and changes from play-testing

Three sub-agents built the native layer and shared UI, assessed the bridge, and independently reviewed the code. The independent reviewer approved exact runtime `8b0aa27688e6491798a7a76f563752ebdd419199`; 13 overlapping native/model/startup/close tests passed independently. The reviewer did not certify their own assessment document or claim game acceptance from fixtures.

- TypeScript/Vite/Node production build passes. Native model/IPC/startup, readiness and close fixtures pass; draft suites preserve planner, template and strategy protections. Portable CI passes 213 fixtures plus three workflow guards without expanding its allowlist.
- Eight source Electron groups pass at the final runtime. The final extracted Windows build passes the same eight groups, covering 21 compact-mode/tool combinations, no document overflow, actual sandboxed preload, unique app/database profiles, retained edits through modes/hide/collapse, modal recovery, browser fallback, saved-template persistence and full process/service restart. Renderer errors: zero. Fixture runs do not call the game or a provider.
- Actual over-game testing uses the already-running HOI4 1.19.5.0 borderless campaign and an isolated Companion database with installed references and an explicitly manual test profile. No new game launch, campaign time advance, save/playset/mod change or provider request was made.
- Play-testing found that the original side panel obscured the clock/speed controls. Compact defaults now reserve 88 DIP above the panel on normal displays. It also found that the game could cover a pinned panel on focus regain. Pinned compact windows now reassert Z-order without show/focus calls, while hidden/minimized/unpinned/workspace windows and native dialogs are protected.
- The final extracted HUD, Quick Intel and Side panel remain visible after activating HOI4 and waiting beyond the 750 ms reassert interval. Hidden panels stay hidden beyond that interval. The mode/tool popups remained open for more than two seconds; an in-bounds native tool selection worked. The native close dialog remained usable for more than two seconds, Stay retained the test draft, and Save persisted it. The test app then closed cleanly; the original game process remained running at the same displayed date/time.
- Installed reference lookup and a technology drawer were exercised inside Quick Intel during the preceding placement candidate; the final runtime retains those implementations and adjusts compact dialog/drawer colors to olive. Broader game-state semantics and exclusive-fullscreen/multiple-physical-monitor behavior are unqualified.

Earlier findings and unsuccessful runs are retained locally. Early smoke attempts also exposed two harness assumptions about HUD entry state and Escape closing an open dialog; those were corrected rather than weakening product behavior. Previous packages remain preserved.

## Build and retained evidence

Final unsigned isolated development artifact: `M8.0b-8b0aa27688e6-windows-x64.zip`, under the local `Documents/HOI4 Companion Development Builds/M8.0b-8b0aa27688e6` directory. SHA-256: `3abc4db90ae9166f524b64f3d9c228b42f15c6a0a054905f742f5a3048044ed3`. Fresh extraction has 74 matching files with no unexpected members. This is a review build, not a final release or replacement of an existing installation.

Local-only evidence, deliberately excluded from public Git:

- Final source run: `artifacts/qa/in-game-modes-2026-11-15T11-11-43-718Z-5f259f3b/run-record.json`.
- Final extracted run: `artifacts/qa/in-game-modes-2026-11-15T11-14-27-485Z-4e6ef108/run-record.json`.
- Over-game captures: `artifacts/native-playtest/screens/03-final-hud-after-game-focus.png`, `04-final-intel-after-game-focus.png`, `05-final-hidden-stays-hidden.png`, `06-final-side-panel-after-game-focus.png`.
- `ACCEPTANCE-BUILD.json` beside the ZIP records the runtime SHA, archive hash and extracted member hashes. Raw game/installed-source evidence remains local.

Reproduce focused source checks with `npm run build` and `npm run test:in-game`. Pass the fresh extracted executable after `--` for packaged checks. The harness uses both `HOI4_DATA_DIR` and `HOI4_ELECTRON_DATA_DIR` to avoid writing a candidate's normal preferences or campaign data. Existing personal and older development profiles were not migrated or overwritten.

The four hosted checks passed for runtime `8b0aa27` in [run 43707834292](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/43707834292). Final evidence-head checks are recorded in the PR. Owner usefulness/acceptance and merge approval remain pending; main and release promotion were not changed. Project HQ update pending; the generated handoff is supplied without claiming Page synchronization.
