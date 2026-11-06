# HOI4 bridge status

## Milestone 6.5 — offline telemetry checkpoint (2026-11-06)

- Isolated branch feature/hoi4-telemetry-m65 from f02b1c5; M6.1 artifact/branch unchanged. GER-only v2 emitter, fixed subset manifest, typed reader/replay/history, observational capabilities and minimal diagnostic UI implemented. No M3 adapter modification or execution.
- 25 focused tests, TypeScript and installed-doc/ID preflight pass. Agent Tools 4.7.0 fresh stdio validation: triggers supported; temporary argument blocks/custom helper unresolved, native qualification pending. Original overlong string corrected to 238 characters before game launch. See MILESTONE-6.5.md.
- Native budget: two launches, 25 minutes, ten ordinary campaign actions. Desktop automation is reachable; no running HOI4 or existing default/OneDrive profile detected. Exact next step: prepare exclusively owned profile, record plan, then bounded native field/readback verification. No new field is yet labeled native verified.

## Milestone 6.1 — portable build ready for desktop review (2026-11-06)

- Implemented categorized local name/ID/alias search, immediate keyboard objective suggestions, clearer navigation/context and deterministic mechanics summaries with advanced source. Existing service/parser/schema, history, saved alternatives and indexing worker preserved. Report: `../application/MILESTONE-6.1.md`; bundled walkthrough: `../application/MILESTONE-6.1-ACCEPTANCE.md`. Confirmed future preferences recorded in APPLICATION-ROADMAP.md; no deferred system implemented.
- Installed game is now 1.19.4.2. Verified Dutch East Indies maps through INS_HOL to INS; a focus has the same name, and categories remain explicit. Retained recordings stay 1.19.4.1 historical evidence. No HOI4 launch/input, save/mod/playset changes or telemetry expansion.
- 32 focused tests, five overlapping final parser checks, final TypeScript and build passed. Initial rendered source workflow passed four checks. Actual freshly extracted Electron workflow passed three checks covering startup, full installed-source search/strategy/history and service shutdown/restart; missing-installation recovery also passed. Evidence: `artifacts/qa/development-package-2026-11-06T06-57-44-113Z-ad717dec/` and `artifacts/qa/package-missing-installation-2026-11-06T06-59-47-580Z-792c1a3d/`. Targeted desktop/mobile captures reviewed; owned processes stopped.
- Artifact/source `71c12039b67f`: `C:/Users/conno/Documents/HOI4 Companion Development Builds/M6.1-71c12039b67f/M6.1-71c12039b67f-windows-x64.zip`. All 73 extracted files match; SHA256 and run instructions in report. Older apps/builds/data remain separate. Later changes are evidence and test-harness corrections only, not packaged runtime edits.
- Failed first launch: 60-second first-window timeout, exact cause unresolved because early diagnostics were not retained. Harness now preserves them. Instrumented launch succeeded, then exposed a test selecting the first ambiguous result; category-aware keyboard selection fixed that test. Full subsequent run passed. These failures and evidence are retained in the report; do not repeat unchanged investigations.
- MCP reference transport closed; installed documentation/parser fallback used without permission expansion. Unsupported script scopes, dynamic localization, merged mod authority, broad QA-LEDGER gates and desktop acceptance remain open. No claim of native gameplay success.
- Exact next task: user desktop acceptance with the bundled walkthrough, beginning Sources & settings, then country alias search and objective/reward review. Engineering checkpoint concludes with an audited normal push to the unchanged private feature branch; final remote-equality receipt stays ignored locally. Do not start another milestone until feedback or a new instruction.

## Milestone 6 — planning and portable build validated on laptop (2026-11-05)

- Goal routes, grouped prerequisites/exclusions, conservative condition display, saved strategy comparison and decision/research references extend the existing planner/API/schema. Base-game source context and unresolved mod/DLC/campaign conditions stay explicit. Report: `../application/MILESTONE-6.md`; user walkthrough: `../application/MILESTONE-6-ACCEPTANCE.md`.
- 116 focused planner/history/strategy tests, TypeScript/build, and retained-real-recording/installed-Germany rendered workflow plus restart pass. Evidence: `artifacts/qa/strategy-planning-2026-11-05T05-09-45-380Z-b45489b1/`. No HOI4 launch or control action; MCP permissions unchanged, existing registration diagnostic passed.
- Source/artifact `7e33b512da9c`: complete ZIP at `C:/Users/conno/Documents/HOI4 Companion Development Builds/M6-7e33b512da9c/M6-7e33b512da9c-windows-x64.zip`. All 73 freshly extracted files match. Two actual packaged workflow/restart checks passed with developer PATH removed and CWD outside checkout. Separate missing configured installation check passed. Evidence: `artifacts/qa/development-package-2026-11-05T05-18-26-656Z-faa75779/` and `artifacts/qa/package-missing-installation-2026-11-05T05-19-13-329Z-39f43f7c/`. Owned test processes stopped; older apps and personal data preserved.
- Archive module autoload was environmental; helper now uses built-in .NET ZIP support. No Electron recovery loop or new native game test. Full-history audit and normal feature-branch push follow the final documentation checkpoint; exact remote receipt stays ignored locally.
- Exact next task: user desktop acceptance using the bundled START-HERE.md / `MILESTONE-6-ACCEPTANCE.md`, then prioritize reported issues. Merged mod authority, dynamic/joint script interpretation, research scheduling and verified current campaign conditions remain unsupported or partial. Do not claim tested desktop compatibility or completed broad release gates. No M7 work begun.

## Milestone 5.1 — Electron recovery validated (2026-11-04 EST)

- Private repository verified; all existing history audited and pushed normally to `origin/feature/hoi4-bridge` at `744f74c`. Main/develop unchanged. Full review and diagnostic matrix: `../application/MILESTONE-5.1.md`.
- Cold indexing in Electron main reproduces the launch failure; cached indexing, minimal runtime and minimal ASAR package load. A 22-second pause alone does not reproduce it. Same importer in a short-lived worker now passes a fresh development launch; lower-level Chromium cause remains unproven.
- Worker/startup diagnostics and isolated dotted-milestone packaging implemented without dependency/security changes. Thirteen focused tests and TypeScript pass. No HOI4 launch, gameplay action, or M6 work.
- Code/artifact commit `b1b036bdcd53`: M5.1 standalone Windows build passed fresh indexing, actual Command center/history import, reviewed snapshot-to-planner transfer, saved focus queue, embedded-service shutdown and restart persistence. Both runtime checks passed; sandbox unchanged. Evidence: `artifacts/qa/development-package-2026-11-05T04-53-43-140Z-cea6ac1e/`. Temporary companion data/processes cleaned; older app and browser preview retained.
- Run `C:/Users/conno/Documents/HOI4 Companion Development Builds/M5.1-b1b036bdcd53/win-unpacked/HOI4 Companion M5.1-b1b036bdcd53.exe`. Keep its entire folder together. Normal storage is isolated under `%APPDATA%/HOI4 Companion Development/M5.1-b1b036bdcd53/`. Report includes troubleshooting and historical import instructions. Packaging acceptance is closed for this laptop; broader release gates and M3 native control remain open.
- Exact next task, after a new M6 instruction: inspect existing source-backed focus/decision/research planning and qualify the smallest path-comparison extension with explicit unknown conditions. Do not repeat Electron diagnosis or start M6 in this recovery task. Formal user acceptance is after M6, with another stable Windows development build. Final audit/normal feature push follows the documentation checkpoint; no other branches or releases.

## Milestone 5 checkpoint — app workflow delivered; Electron launch blocked (2026-11-04 EST)

- Persistent campaign history and reviewed snapshot-to-new-workspace planning implemented in the existing Command center/planner. SQLite storage stays separate from live state; duplicate imports, session separation, explicit removal and unavailable values covered.
- 20 focused Node tests passed, including all 15 bridge tests; retained real recording restart/baseline/planner journey and four M4 UI journeys passed. TypeScript/build passed. Details: `../application/MILESTONE-5.md`.
- Telemetry inventory in `TELEMETRY-INVENTORY.md`: no current regular playset detected; prior owned test profiles archived. PP/stability/country/date remain the native verified mod scope; current-focus OCR is separate. No HOI4 launch/input or mod expansion for M5.
- Source committed as `d9e31e7`; Electron build produced outside Git, but two distinct launch methods failed with Chromium network-service crash and `ERR_FAILED (-2)` loading loopback. Embedded service/index worked. Owned failed processes stopped; no third unchanged attempt. Browser alternative from `99c5b25e8ae8` passed compiled launcher/renderer/service/restart/history/baseline tests with exit code 0. Run `C:/Users/conno/Documents/HOI4 Companion Development Builds/M5-99c5b25e8ae8/browser-preview/Start Companion Browser.cmd`. Exact next task: isolate the Electron Chromium network-service failure with a bounded minimal reproduction and child-process exit diagnostics, without weakening security or repeating unchanged full application launches. See M5 report for diagnostics. Packaged Electron acceptance remains open; do not repeat this failure without new evidence.
- Final browser-artifact evidence: `artifacts/qa/browser-development-build-2026-11-05T04-21-03-402Z-be2cbcf1/`. Initial cleanup race resolved by awaiting owned-process exit; temporary processes/databases cleaned. Build is outside Git and older app untouched.
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

Cleanup note: automatic approval review rejected the final command containing deletion of the owned `.bridge-local/m5-direct-data` directory (no specific reason returned). That ignored diagnostic database is retained. All identified owned development-test processes were stopped; other temporary UI-test stores were cleaned by their harness.
