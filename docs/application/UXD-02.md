# UXD-02 — Adaptive Strategy Workspace completion report

**Delivered November 12, 2026: two functional local prototypes; offline-tested and independently reviewed. Owner selected Variant B — Campaign-first on November 12, 2026; launch-design acceptance recorded.** [Manifest](../milestones/UXD-02.json) · [launch instructions](../../prototypes/uxd02/README.md) · [design and comparison](UXD-02-DESIGN.md) · [integration assessment](UXD-02-INTEGRATION.md) · [independent review](UXD-02-REVIEW.md) · [prepared PR](UXD-02-PR-DRAFT.md).

## Identity and isolation

- Branch: `prototype/uxd02-adaptive`.
- Exact starting SHA: `bdb8a4887522b38f5110f3900bbf1655cc5fd600`, verified against Project HQ and the remote `feature/hoi4-ai-m731` ref before implementation. This includes the reviewed [PR #5 baseline correction](https://github.com/connorgreenleaf22/hoi4-companion/pull/5); the manifest's GitHub link identifies that baseline, **not a new UXD-02 PR**.
- Tested/reviewed implementation SHA: **`fb7201d15b2554f5033c9aa2e46dc9581b80e4a3`**. Delivery documentation is committed afterward; `git rev-parse HEAD` identifies the final documentation head.
- Isolated worktree: `C:/Users/conno/Documents/HOI 4 Test and Development/hoi4-uxd02`.
- Product changes are confined to `prototypes/uxd02`. Other changes are milestone/design documentation and roadmap/status notes. Production frontend, backend, lockfile, database, bridge, telemetry, provider and CI allowlist are unchanged. PRs #4/#6/#8/#9 are untouched.

## Launch and interact

From the isolated worktree:

```powershell
npm --prefix prototypes/uxd02 run dev
```

Open [Variant A — Chat-first](http://127.0.0.1:4178/?variant=a) or [Variant B — Campaign-first](http://127.0.0.1:4178/?variant=b). The local preview was started during delivery; if already running, use the links rather than starting another process. The top control switches variants while preserving demo state. Stop the serving terminal with Ctrl+C. Full clean-checkout dependency/build instructions are in the prototype README.

Both include campaign browsing, concise answers, expanded reasoning, six-part military planning, editable division/tank concepts, three comparison modes, simulated recalculation, advisor challenge/override, typed saved strategies/designs, revision recovery, conversation history, disconnected/stale/incomplete observation examples, supplied context, preferences, quiet feed and Developer Mode. All responses are authored synthetic fixtures. No AI provider or game access is needed.

The numerical table contains **editable composition counts only**. It does not claim calculated combat performance, cost, supply or a winner. A “Source verified” legend describes future treatment and is attached to no gameplay assertion.

## Visual evidence

Local gallery: `artifacts/uxd02/index.html`. Final captures: `artifacts/uxd02/2026-11-12T08-19-02-734Z/`.

There are **32 unmodified viewport PNGs**: A and B at 1920×1080 and 1100×900, each showing launch, expanded explanation, workspace, numerical/visual/matchup comparison, campaign ideas and missing context. Filenames begin `a-1920`, `a-1100`, `b-1920` or `b-1100`. `results.json` records the tested SHA and assertions; `screenshot-hashes.json` identifies all captures. These are retained local-only, not uploaded or publicly hosted. The gallery annotates their synthetic/browser scope.

Actual UXD-01 documents and local captures were located and read before implementation. Its native/physical-monitor limitations remain intact. No audit result was invented and no production screenshot was represented as a prototype result.

## Verification

| Check | Result and scope |
|---|---|
| Prototype TypeScript + Vite build | Pass. The prototype compiles independently; built assets are under its ignored `dist`. Harmless existing Zod comment-annotation warnings appear during bundling. |
| Browser scenario matrix | **182 assertions pass** at the exact runtime SHA across A/B × 1920×1080/1100×900. Includes all three scenarios, edits, three comparison views, save/reopen, older revisions, unsaved draft recovery, reload, maximum-length notes, unsupported questions, manual context, unique IDs, default alerts, preferences, Developer Mode, keyboard skip/focus and no horizontal overflow. |
| Isolation checks | Zero page runtime errors and external requests in the four matrix contexts. Storage is a dedicated browser key; corrupt-state recovery preserves the original until explicit replacement. No production service is used. |
| Built static preview smoke | **4 assertions pass** against the actual built assets: A launch, saved strategy after reload, B launch and no runtime errors. Temporary loopback server and browser closed afterward. Asset hashes in local `artifacts/uxd02/compiled-smoke.json`. |
| Independent review | **22 additional targeted assertions pass**, no blockers at the final runtime. Initial four defects were fixed and re-reviewed. See the review record. |
| Repository TypeScript | Pass; production sources unchanged. |
| Required fixture test command | `npm run test-ci`: **123 fixture tests + 3 workflow guards pass**. Existing allowlist unchanged; no full wildcard/native suite. |
| Schema and hygiene | Local schema validation and staged hygiene pass. No hosted CI claim: this is a local-only branch and prepared PR. |

Early test runs are retained, not hidden. The first harness exposed initial skip-link focus placement, which was fixed. A subsequent selector needed an explicit Scenario accessible name. Corrupt JSON initially received an inaccurate storage-unavailable message; recovery now distinguishes these conditions. The independent review then exposed the four defects in its table. Final matrix and targeted independent reruns cover those changes. No unchanged broad regression loop or full Companion repackaging was performed.

## Evaluation and remaining decisions

I prefer **B for returning campaign play**, because an explicit objective and quiet intelligence feed help orient a second-monitor session while conversation remains close. A is stronger for discovery and disconnected first use, and reaches the same primary strategy equally quickly. This was the reviewer recommendation. The owner subsequently selected **Variant B — Campaign-first** on November 12, 2026. See the [decision and follow-through](UXD-02-DECISION.md); this accepts the launch design without qualifying production or game behavior.

No technical blocker remains for local prototype exploration. Known limits are a lengthy narrow workspace, B's below-fold discovery, simplistic keyword routing and simulated recalculation, browser-local storage rather than production conflict/migration handling, and untested screen-reader/physical-DPI/native behavior. This milestone qualifies interactions, not game mechanics or actual campaign success. The separate knowledge candidates retain their own review/integration decisions.

No push, public hosting, new paid service, provider call, HOI4 launch, gameplay action, process-memory access, user-save change or protected-branch merge occurred. Project HQ, the approved brief, preferences and decision register were updated and read back successfully on November 12, 2026. See the [Rook/HQ handoff](UXD-02-HANDOFF.md) and [decision record](UXD-02-DECISION.md). No UXD-03 or production rebuild started.
