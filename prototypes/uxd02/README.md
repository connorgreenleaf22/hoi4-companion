# UXD-02 · Adaptive Strategy Workspace

Two local React/TypeScript launch variants over one shared mock workspace. No production application code, API, database, provider, bridge or game is used.

## Launch on Windows

From the repository root (Node 24 recommended):

```powershell
# Only needed if this checkout does not already have dependencies:
npm ci --ignore-scripts
npm --prefix prototypes/uxd02 run dev
```

Open **http://127.0.0.1:4178/?variant=a** for Chat-first or **http://127.0.0.1:4178/?variant=b** for Campaign-first. The top switch changes the launch presentation while retaining your demo plans and conversations. Stop the local server with Ctrl+C. The server binds only to loopback, with no proxy or backend.

Dependencies come from the unchanged repository lockfile. On the development laptop only, the isolated worktree has an ignored `node_modules` junction to the existing dependency installation; no installation or dependency mutation was needed.

```powershell
npm --prefix prototypes/uxd02 run build
npm --prefix prototypes/uxd02 run preview
```

Build and preview operate only on this prototype. Do not run the production packaging command for this milestone. No API keys, live game, hosting or subscription are needed. Browser localStorage key `hoi4-uxd02.synthetic.v1` is isolated from the production store. It holds drafts, saved snapshots, preferences and conversation history. A failed write falls back to session state with a visible warning. Corrupt storage is preserved until explicit recovery in Settings. Clearing this one key resets the demo; never clear production data.

## Try the same journeys in each variant

1. Ask or select “Prepare Germany for 1941.” Read the concise answer, expand its reasoning, then open the strategy workspace. Inspect the six preparation priorities. Use the section links to compare divisions as numbers, visual compositions and matchup explanations.
2. Change military emphasis to cheaper tanks, edit battalion counts and notes, then simulate recalculation. Select heavy tanks to see the advisor challenge the choice; accept the alternative or explicitly keep heavies. Save a strategy and a design. Edit and save again; reopen an earlier revision from the library after a browser reload.
3. Browse alternate-history recommendations. Change the style filter, expand requirements, save an idea and explore its campaign outline. Settings can reorder Fun, Winning and Efficiency; new recommendations use the order.
4. Ask “What should I do next?” Switch between disconnected, stale and incomplete examples. Add a player statement or continue with general advice. Known fixture state, assumptions and unavailable fields remain separate.
5. Navigate to Tools and back with unfinished work. Collapse the sidebar. Use Tab/Shift+Tab, Enter, native selects and the skip link. Toggle Developer Mode; alerts and chimes start off and never produce actual notifications in this prototype.

The input is a deterministic fixture router, not a language model. Unsupported questions receive an explicit explanation and sample choices. All gameplay suggestions, rankings, timing and difficulty are illustrative. Numerical comparison shows editable composition counts only; it does not calculate combat, IC or supply. A “Source verified” example appears only in the Settings legend and certifies no gameplay claim.

## Focused verification

With the local server running, and installed Google Chrome:

```powershell
npm --prefix prototypes/uxd02 test
```

The Playwright harness uses a temporary browser context per variant/viewport, blocks external requests, checks all three scenarios at 1920×1080 and 1100×900, and writes screenshots and `results.json` under ignored `artifacts/uxd02/<timestamp>/`. It does not launch HOI4 or Electron, access a real browser profile, call the production service, or repackage the Companion.

See [design and evaluation](../../docs/application/UXD-02-DESIGN.md), [integration contracts](../../docs/application/UXD-02-INTEGRATION.md) and [completion report](../../docs/application/UXD-02.md).
