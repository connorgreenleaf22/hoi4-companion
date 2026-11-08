# HOI4 Companion

- Work on the explicitly requested milestone branch. M7.2 uses `feature/hoi4-native-m72`, isolated from M7 `0620369`; preserve earlier feature branches and acceptance artifacts.
- Use `.agents/skills/hoi4-game-bridge/SKILL.md` for game discovery, bridge work and native testing. Read `docs/hoi4-bridge/STATUS.md` before repeating an investigation.
- Extend the existing Node service, parser and SQLite infrastructure. Preserve release gates and the unresolved obligations in `QA-LEDGER.md`.
- Never write installed game files, personal saves or a regular playset. Use explicit disposable data directories for tests. Do not attach experimental controllers to an unrelated game.
- Separate extracted declarations, fixtures, observed telemetry and independently verified native outcomes. Input dispatch is not command success; telemetry is not a control API.
- Test the smallest affected component first. Native sessions need a written budget: M7.2 at most one launch, eight ordinary gameplay actions, twenty minutes, and two attempts per unchanged failure. Stop and retain diagnostics at a limit.
- Keep raw telemetry, saves, secrets, game assets and generated evidence out of Git. Commit concise evidence summaries and status at validated milestones; no release, push or merge is implied.

- Major application milestones require an isolated, milestone/commit-identified runnable Windows development build plus a packaged launch/service/resource check. Use `npm run package:development -- M5` (substitute the milestone); never overwrite older builds or publish implicitly.

- M7 platform: one application-owned bridge/gateway/receipt store; MCP is a thin authenticated loopback adapter. Keep save-derived, historical, live-qualified and manual planning state distinct. Gameplay execution is not exposed. Native test plans require independent deadline supervision and retained evidence.

- Do not merge/reimplement M7.1 planning coverage here. Observations cannot automatically change manual assumptions, plan confidence or ranking eligibility. M7.2 commits stay local if origin is public or visibility unverified.

- M7.2.1 recovery has a separately authorized `m721-native-budget.json`: one launch, four gameplay actions, twelve wall-clock minutes, paired deadline at 540 seconds, at most sixty recorded setup/inspection inputs and no unchanged-failure retry. Require production-lifecycle offline tests before launch; preserve all older stopped budgets. No package unless application-facing behavior changes.
