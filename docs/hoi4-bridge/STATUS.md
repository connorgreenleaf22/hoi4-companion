# HOI4 bridge status

## Milestone 5 source checkpoint — Windows package qualification next (2026-11-04 EST)

- Persistent campaign history and reviewed snapshot-to-new-workspace planning implemented in the existing Command center/planner. SQLite storage stays separate from live state; duplicate imports, session separation, explicit removal and unavailable values covered.
- 20 focused Node tests passed, including all 15 bridge tests; retained real recording restart/baseline/planner journey and four M4 UI journeys passed. TypeScript/build passed. Details: `../application/MILESTONE-5.md`.
- Telemetry inventory in `TELEMETRY-INVENTORY.md`: no current regular playset detected; prior owned test profiles archived. PP/stability/country/date remain the native verified mod scope; current-focus OCR is separate. No HOI4 launch/input or mod expansion for M5.
- Added existing-toolchain isolated Windows development packaging. Exact next step: package this committed source, launch the actual unpacked executable with disposable companion data, verify embedded service/resources/restart, then record artifact path/results and final checkpoint. Do not overwrite the old packaged app or use its database.
- Control remains blocked at M3 OCR title recognition; MCP permissions unchanged. No push, merge or release. Broad QA/release gates remain open.

## Milestone 4 checkpoint — application integration complete (2026-11-04 EST)

Branch remains `feature/hoi4-bridge`, from `3851fe7`. The existing Command center now includes **Your observed campaign**, a read-only Campaign Intelligence panel. See [application report](../application/MILESTONE-4.md), [feature inventory](../application/FEATURE-INVENTORY.md), [full MCP matrix](MCP-CAPABILITIES.md) and [application roadmap](../APPLICATION-ROADMAP.md).

- Implemented typed local intelligence/replay endpoints over the existing bridge, installation/version diagnostics, separate bridge/game connectivity, snapshot history and comparison, installed-reference links, unavailable values and separate telemetry/focus freshness. Imports are historical and origin-unverified; explicit fixtures are labeled. Ordinary app startup has no owned-game attachment or gameplay grant.
- Verified 18 focused Node tests (including all 15 existing bridge tests), three offline OCR diagnostic tests, four deterministic rendered UI journeys and one retained-native-recording UI journey. `npm run build` passed. Desktop/mobile screenshots reviewed; no full release QA recertification.
- Evidence: `artifacts/qa/campaign-intelligence-2026-11-05T03-22-18-319Z-1fda0ae3/`, `artifacts/qa/campaign-intelligence-2026-11-05T03-25-43-210Z-5368430f/`, `.bridge-local/m4-build.txt`, `.bridge-local/m4-mcp-inventory.json`, `.bridge-local/m4-ocr/`. Raw evidence stays ignored. See report for commands and scope.
- Audited all 28 standard pinned Agent Tools definitions plus two private opt-ins and protocol surfaces. Ten analysis tools remain enabled; only three implementations were independently exercised in prior milestones. No new permissions or production dependency changes. Recommended additions require their own focused qualification.
- Offline M3 diagnosis: spatial sorting removes interleaved neighboring text, but title-only OCR still reads Economic incorrectly. Unique Start recognition does not authorize input. Added deterministic diagnostics and negative tests; native adapter and its safety checks unchanged.
- Blockers/limits: native focus selection and active-focus/research readback remain unverified. No automatic app owned-session attachment, persistent recording library or automatic planner baseline import. Existing Electron lifecycle/release QA obligations remain open. Older packaged executable is unchanged; run this checkout to view the feature.
- No native launches or game inputs this milestone. Temporary UI services/browsers closed by their test harness; no personal saves, playsets or installation files changed. No push, merge or release.
- Exact next application step: add a persistent, explicitly labeled recording library to this panel, then a reviewed snapshot-to-planner baseline preview with field provenance and explicit user apply. Keep it separate from control qualification.
- Exact next control step: qualify a reliable title/target recognizer with negative offline cases and capture-to-input mapping before writing a separate bounded native plan for one action plus independent active-focus readback. Do not retry the unchanged M3 OCR matcher.

## Historical checkpoints

## Milestone 3 checkpoint — native action blocked (2026-11-04 EST)

Branch remains `feature/hoi4-bridge`, resumed from `2854940`. Owned-session observation and offline safety/replay work are implemented; **Milestone 3 native action acceptance is NOT complete**. See `MILESTONE-3.md` for design, commands and evidence. The earlier milestone sections below are historical.

- Fresh actual Codex app-server connection rediscovered all ten restricted Agent Tools tools and passed real source lookup, documentation, validation and mutation rejection. Registration/permissions unchanged.
- Added owned process identity (PID + creation FILETIME + executable hash), exclusive profile/producer-token/log-generation binding, monotonic observation sequences, disconnected/quarantined status, separate focus freshness, and an opt-in Live Tools Python adapter behind the existing gateway. No production API controller is enabled.
- Native session `.bridge-local/native-HN3JuU`: one launch, 20 input reservations (19 UI inputs; one adapter reservation failed before dispatch), 6m05s to stop. HOI4 1.19.4.1, GER, 1936.01.01.12, PP 2.324 (UI 2), stability .81 (UI 81%). Owned startup telemetry and idle-focus OCR verified. Candidate prerequisites confirmed in the UI.
- Focus request `m3-first-focus` returned `uncertain`: detail-title OCR split/reordered text and read Economic as EcoNomrc. No selection input was dispatched; no active-focus readback or native control success is claimed. Same-request retry returned the exact stored receipt without another reservation. The native input budget is exhausted: no further launch/test in this milestone.
- 15 bridge tests, TypeScript noEmit and installed-script preflight pass. Two real owned snapshots replay exactly offline (startup anchor + idle-focus observation at the same game date). This is not two dates or a successful post-action state. Existing full QA/release gates were not rerun or relabeled.
- Game exited through UI; stop latched; live status null; owned profile archived; normal profile restored to absent. No game/adapter/OCR helper remains running. Raw diagnostics/assets remain ignored.
- Exact next step: use saved `focus-evidence/1793847876982934500-detail.png` and `.ocr.json` to implement and fixture-test spatial title/button recognition with negative cases, without launching HOI4. Then qualify capture-to-input mapping and active-focus readback in a separately budgeted future native session. Research-state access remains deferred.

## Earlier milestones


Milestone 1 complete within the verified scope below (2026-11-04); follow-up community integration sprint complete. Branch: `feature/hoi4-bridge`; baseline `ba4c3c9`, initial bridge checkpoint `9017453`, native/skill checkpoint `e83d6a2`. No push, merge or release authorized/performed.

Actual checkout: `C:/Users/conno/Documents/Codex/2026-11-04/s/hoi4-companion`. Open Codex in this repository to discover its skill; the original chat directory was empty.

## Completed and verified

- Existing Electron/React/TypeScript/Node HTTP/SQLite architecture preserved. Reused ordered script parsing, installed-reference indexing, source provenance, ambiguity resolution and HTTP host/origin protection. No dependency versions or campaign database schema changed.
- Typed v1 local bridge API/CLI; Observer default; environment/configuration/descriptor discovery; reference queries and conservative mod override detection; durable telemetry snapshots/cursors and deterministic replay. Bridge persistence is a separate `bridge.sqlite` in the configured application data directory.
- Codex `skills/list` discovers `.agents/skills/hoi4-game-bridge/SKILL.md` as enabled, repo-scoped, with no errors. Its workflow was used to resolve real installed data. YAML/frontmatter/invocation metadata validated with the already installed js-yaml dependency. The bundled Python validator was unavailable because PyYAML is absent; no dependency added just for it.
- Real focus `GER_prioritize_economic_growth` resolved to `common/national_focus/germany.txt:124`, version 1.19.4.1, source hash `ac730be5ccc9095fb400e58b2f7d44501288a94186beb148dbbb0b32cf8ea03c`. Existing index revision: `844a2339f0c1651caffabf1dc4ebacae162740b7301e054f34887b3785afe5a0`.
- Standalone additive GER daily telemetry mod emitted TWO real snapshots on Windows HOI4 1.19.4.1. Country and game date matched the campaign; political power matched the displayed integer precision and stability matched 81%. Fractional PP precision is log-only, not independently measured by the UI.
- Action gateway rejects Observer/Telemetry commands, unauthorized and unsupported requests, wrong session/version/state and conflicting controllers. Durable receipts distinguish rejection, confirmed success/failure, timeout and uncertainty; retry IDs do not automatically redispatch. Adapter execution/readback paths were tested with a simulated adapter only. No native adapter/grant is registered.
- All 174 tests passed, including seven bridge/profile tests. `npm run build` passed (TypeScript, Vite, service/Electron bundle). Installed-script preflight passed. No repeated broad cycles after those passes.

## Native evidence and cleanup

Successful session: `.bridge-local/native-vCXJuK`, 2026-11-04 21:05:08–21:10:29 EST, owned PID 42652. One launch, sixteen UI inputs, approximately 5m21s; all within the two-launch/twenty-input/twenty-minute budget. No unchanged failed operation was attempted more than twice. The game exited through its UI. Offline replay then reproduced both persisted snapshots exactly with no HOI4 process running.

| Engine date | Country | Political power (log / UI) | Stability (log / UI) |
|---|---|---|---|
| 1936.01.01.24 | GER | 2.324 / 2 | 0.81 / 81% |
| 1936.01.02.24 | GER | 4.648 / 4 | 0.81 / 81% |

Engine midnight is logged as hour `24`; retain it as engine text. The first date comparison was observed in the chat screenshot; `paused-1.jpg` was taken later at Jan 2 07:00. The second exact-date screenshot is `daily-2.jpg`. Do not describe the later first capture as an exact-date match.

The standard game profile was initially ABSENT. The revised helper exclusively created it with an ownership marker and directory identity, refusing all existing profiles. After the game exited, it moved only that owned directory into `owned-game-profile/` and verified the normal profile path was absent again. No pre-existing save or regular playset was changed. The installed executable's SHA256 is `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`; no executable modification or injection was used. No native game, bridge daemon or indexing process remains active.

Local evidence (ignored; may contain machine/account diagnostics): `.bridge-local/reference-query.json`, `skill-discovery.json`, `full-tests.txt`, `build.txt`, and `native-vCXJuK/{plan.json,result.json,snapshots.jsonl,replay.json,telemetry-lines.txt,daily-2.jpg,owned-game-profile/}`. Concise hashes and validation scope are in `EVIDENCE.md`. Never commit raw logs, saves or game assets.

## Known blockers and limits

- Historical isolation failure retained in `.bridge-local/native-IxwG5O`: both `-userdir=<path>` and `userdir=<path>` were ignored. Its two-launch budget was exhausted and both processes stopped; no campaign was started in that session. Do not retry those arguments without new evidence. The successful session used a different, guarded absent-profile approach. Machines with an existing profile are explicitly refused by this helper and need a separately reviewed isolation workflow.
- Keyboard `space` and `Escape` dispatch had no observed effect in this session. Pointer controls worked. Do not treat successful telemetry or manual test navigation as gateway/native-control acceptance.
- Native action adapter remains unsupported. No memory writes, hooks, executable edits or achievement bypass. Achievement eligibility has not been verified.
- Freshness is qualified log-file age, not process liveness; host version metadata comes from installed launcher settings. Telemetry is GER-only, daily, one campaign/two dates tested. No save mapping, merged mod index, automatic poller, live-process binding or strategic controller.
- Existing `QA-LEDGER.md` release obligations remain unresolved unless already qualified there. The bridge smoke test does not certify planner parity, accessibility, packaged Electron lifecycle or a full campaign. No new installer/release was created.
- `npm ci --ignore-scripts` left Electron postinstall unrun; npm reported six moderate advisories. No forced dependency upgrades performed.

## Previous next task (superseded by Milestone 3 checkpoint)

Implement M2A from `COMMUNITY-TOOLS.md`: bind observations to an owned process/session and add qualified active-focus/research readback, adapting reviewed Live Tools telemetry generation/manifest patterns. Then qualify ONE ordinary focus or research selection through its Windows input path behind ActionAdapter. No native memory integration is authorized. Follow the explicit pass/fail gates there; do not repeat the community survey. Any native session needs a new bounded plan and must preserve an existing normal profile; the current helper intentionally cannot use one.

## Community integration sprint

- Reviewed actual source at seven pinned revisions, compared with Milestone 1 code/evidence; no broad companion regression/build rerun. Detailed matrix, installation, risk assessment, use and next milestone are in `COMMUNITY-TOOLS.md`.
- Installed/built HOI4 Agent Tools 4.7.0 at `3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8` using upstream shrinkwrap and disabled lifecycle scripts. Companion dependencies and production service unchanged. Added reusable pin, setup/diagnostic scripts and skill routing.
- User Codex config now contains one `hoi4_agent_tools` stdio registration, fixed to this repository's mod and local game; ten analysis tools allowed, mutations excluded. Existing trust/permission settings preserved. Initial project-scoped registration was ignored because this checkout was not trusted; replaced only our generated config with the user MCP table. Reconnect existing desktop clients to load their catalog; a fresh actual Codex app-server connection was verified.
- Codex discovered ten tools and invoked real focus lookup, installed documentation search, supported-effect validation and unresolved-command validation; disabled rewrite rejected. No mock MCP server or model turn. Source matches existing germany.txt:124 provenance. Unknown command correctly remained `valid=null`; parameters remain unchecked. The first test script misread the response envelope; corrected once, then passed. Raw evidence under ignored `.bridge-local/agent-tools/`.
- One new recorded-format regression passed (sanitized original native lines, hour 24, values and stale replay). This is offline coverage. No native launch or game action this sprint; existing two-snapshot evidence remains the only native telemetry gate.
- Dependencies: upstream production audit reported three moderate findings (Hono HTTP path, glob cancellation, minimatch amplification), zero high/critical. Stdio only, no forced upgrades; review before updates/HTTP exposure. All caches/checkouts stay ignored; retain the pinned Agent Tools directory because the registration depends on it.
- Native control blocked: saslifat requires executable `7dc947...` versus local `cf781e...`, DLL injection/process writes and unresolved license. No binaries/loaders executed. Live Tools' Rust Windows allowlist is empty; ordinary-input Python implementation is the next candidate, with upstream 1.19.2 evidence but no local 1.19.4.1 qualification. Harness README's stub label contradicts implemented input code; corrected in audit, not treated as native success.
