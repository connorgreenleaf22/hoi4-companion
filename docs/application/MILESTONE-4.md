# Milestone 4 — Campaign Intelligence in the application

Completed within the scope below on 2026-11-04 EST, from `3851fe7`, on `feature/hoi4-bridge`. No push, merge, package release, native HOI4 launch, game input, executable change or personal save/playset change.

## What to open

Use this checkout's application build; the older running portable executable is not silently replaced. From the repository root, `npm run browser` builds the renderer/service and prints its local URL (normally `http://127.0.0.1:39436`). Open that URL and choose **Command center**. `npm start` uses the same renderer in Electron when its development runtime is installed; M4 did not install or qualify a new Electron runtime. Existing application migration/close gates still apply.

For an isolated preview without changing normal companion data, set PowerShell `$env:HOI4_DATA_DIR = Join-Path $PWD '.bridge-local/app-m4'` before `npm run browser`. Initial indexing reads the installed game into that disposable app database. The installation remains untouched. Close the developer service with Ctrl+C. An existing packaged app continues to show its own older build until a separately authorized package/update.

The new **Your observed campaign** panel is part of the existing Command center. It shows the installation/version as static information, local bridge versus owned-game connectivity separately, available snapshot values, timestamps, focus recognition, source provenance and unavailable fields. It links to the existing country/focus reference drawer and compares political power/stability/focus between compatible snapshots. Manual campaign plans are neither filled nor overwritten automatically.

Use **Open snapshot recording** for exported JSONL. Choose **Offline test fixture** for synthetic data; ordinary imported recordings are explicitly origin-unverified and historical. For the retained local M3 evidence, open `.bridge-local/native-HN3JuU/owned-snapshots.jsonl`. It contains a startup log anchor and an idle-focus capture at the same game date. It is not a successful post-action recording. **Return to bridge history** exits the imported view. Imports live only in the viewer, are size-bounded (700 KB file), are lost on navigation/reload, and do not alter bridge storage, manual plans or action authorization.

## Interfaces and files

- `src/CampaignIntelligence.tsx`, `src/intelligence.ts`, `src/intelligence.css`: actual React feature, evidence/freshness/comparison rules and responsive styles; mounted in `src/App.tsx`. Existing navigation, profile handling and reference drawer reused.
- `src/bridge-types.ts`: `CampaignIntelligence` response and optional `dataOrigin` on snapshots. Existing v1 snapshots without that optional marker still replay. Explicit fixtures cannot be promoted to live status.
- `server/bridge/service.ts`: read-only intelligence projection over existing environment/status/history. Returns the latest 200 stored snapshots. Only independently checked owned-session data can receive a live snapshot ID, with field freshness still separate. Ordinary application startup intentionally has no owned-session attachment or gameplay grant; it reports disconnected game state even if a recent log exists.
- `server/api.ts`: local-only `GET /api/v1/bridge/intelligence`; local-only `POST /api/v1/bridge/replay` with `{text, origin: "recording" | "fixture"}`. Replay validates JSONL and returns data without importing into live DB. Existing host/origin/body-size protections apply. Paired phones receive a clear desktop-only UI explanation.
- `server/bridge/telemetry.ts`: optional data-origin preservation/validation. No timestamp refresh or live ownership promotion during replay.
- `tests/intelligence.test.ts`, `scripts/intelligence-ui.ts`: focused model/API and real rendered app journeys, using existing QA harness, isolated temp stores and Chrome headless.
- `scripts/bridge-community-inventory.mjs`: pinned 28-tool metadata inventory; no permissions changed or tools invoked.
- `scripts/bridge-ocr-diagnose.py`, `tests/bridge_ocr_test.py`: deterministic offline spatial OCR diagnosis. It never authorizes input or changes the native adapter.
- `docs/application/FEATURE-INVENTORY.md`, `docs/APPLICATION-ROADMAP.md`, `docs/hoi4-bridge/MCP-CAPABILITIES.md`: accurate feature state, dependency-aware app roadmap, complete pinned MCP evaluation. Skill workflows/status updated; settings roadmap copy no longer says all telemetry is merely planned.

No new production dependency, companion database schema migration, duplicate service or MCP runtime was introduced. Python bytecode and generated captures remain ignored.

## Evidence and tests

- Eighteen focused Node tests passed: three new intelligence tests plus all fifteen existing bridge tests. They cover historical/live/fixture distinction, stale/future timestamps, missing values, session-safe comparison, read-only replay, API origin rejection and preserved gateway safety.
- Four deterministic rendered UI journeys passed: existing navigation/empty state; fixture upload/staleness/unavailable focus/comparison/reference navigation; malformed import and bridge outage; mobile layout and navigation. No horizontal overflow at 390x844; desktop reviewed at 1440x1100. This is developer headless evidence, not full accessibility or native Electron lifecycle acceptance.
- An additional rendered journey used the retained actual native JSONL and two installed-reference records copied read-only into the temporary store. It displayed GER, 1936.01.01.12, PP 2.324, stability .81 and no selected focus, labeled imported/historical/stale; the country link opened the static Germany definition. No live game was running. This is recorded-data integration, not a new native telemetry result.
- Three Python diagnostic tests passed: spatially reordered real OCR remains rejected, a synthetic exact title still does not authorize input, missing/duplicate Start is refused.
- `npm run build` passed: TypeScript noEmit, Vite renderer and service/Electron bundles. Skill frontmatter validated with existing js-yaml. No full application QA or release suite was repeated.

Local evidence: `artifacts/qa/campaign-intelligence-2026-11-05T03-22-18-319Z-1fda0ae3/` (four deterministic journeys, screenshots, run-record); `artifacts/qa/campaign-intelligence-2026-11-05T03-25-43-210Z-5368430f/` (recorded-data journey and screenshot); `.bridge-local/m4-build.txt`, `m4-mcp-inventory.json`, `m4-ocr/`. Raw game-derived images/data are not committed. Evidence screenshots precede the final text-only change from the internal focus verification label to “Recognized UI text.”

The new test harness initially failed on CommonJS top-level await, then an ambiguous text locator matching both an option and evidence label. Both were isolated harness defects and corrected. The optional installed-reference journey initially expected the in-game name German Reich; the static definition is Germany. Its corrected targeted assertion passed. No unchanged failure was repeatedly rerun, and no game launch was used to debug UI tests.

Reproduce focused checks:

```powershell
npm run test:intelligence
npm run test:bridge
python tests/bridge_ocr_test.py
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:intelligence-ui
```

Build before renderer checks after source changes. The optional retained-data journey uses `HOI4_INTELLIGENCE_RECORDING`, `HOI4_UI_REFERENCE_DB` (opened read-only) and `HOI4_UI_GAME_ROOT`; `--recorded-only` runs just that additional case. Fixtures and source rows are copied only into a disposable test store. The ordinary UI test never requires those machine-local files.

## Offline OCR outcome and separate control track

The target title matches installed localization. The original detail crop also included the focus-tree heading, search field, target node, duration and prerequisites. Windows OCR emitted words in interleaved line order and substituted `EcoNomrc` for Economic. Sorting words within the observed title region removes unrelated text/order ambiguity but does not fix recognition. On the saved image, a title-only crop still read `PRIORITIZE EcoNomrc GROWTH`; contrast adjustment read `Ecoxomrc`. The Start crop read Start. This evidence does not point to a changed localization, focus identifier, unavailable target or game timing as the primary blocker. DPI padding/layout remain separate calibration constraints.

The diagnostic returns `titleExactMatch: false`, `uniqueStart: true`, `inputAuthorized: false`. No fuzzy substitution was added to the action precondition, and no uncertain request was retried. The native adapter is unchanged and unverified.

Potential next approaches: source GUI inspection for stable window/element geometry; tightly scoped visual template matching qualified for scale/localization (still needs false-positive/occlusion cases); improved title-only recognition or independent OCR; targeted ordinary input after verified identity/target; keyboard navigation only after observed focus/input behavior is qualified. None supplies structured active-focus state by itself. A compatible save/telemetry semantic readback may be more robust long term than accumulating UI heuristics. Preserve independent post-action verification regardless of recognition method. No broad automation or native memory implementation was started.

## Limits and next milestone

The dashboard consumes persisted bridge history and imports now; it does not attach to arbitrary running HOI4, continuously poll mod logs, persist an imported recording library, infer current research, certify focus success, or offer gameplay controls. Recent log writes are never labeled live solely on age. Imported provenance is a declaration, not independently authenticated origin. Existing `QA-LEDGER.md` obligations stay open.

Next product milestone: persistent explicitly historical recordings and reviewed snapshot-to-planner baseline transfer. Next control milestone: solve/fixture-test target recognition, qualify capture-to-input mapping and active-focus readback, then one bounded native action. Follow `docs/APPLICATION-ROADMAP.md`; native control is not a dependency for continuing useful companion work.
