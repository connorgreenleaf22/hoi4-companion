# HOI4 Companion

- Work on the explicitly requested milestone branch. M7.1 uses `feature/hoi4-ux-m71`, from validated M7 `0620369`; preserve earlier feature branches and acceptance artifacts. M7.1 is offline explanation/UI work, with no HOI4 launch or gameplay commands.
- Use `.agents/skills/hoi4-game-bridge/SKILL.md` for game discovery, bridge work and native testing. Read `docs/hoi4-bridge/STATUS.md` before repeating an investigation.
- Extend the existing Node service, parser and SQLite infrastructure. Preserve release gates and the unresolved obligations in `QA-LEDGER.md`.
- Never write installed game files, personal saves or a regular playset. Use explicit disposable data directories for tests. Do not attach experimental controllers to an unrelated game.
- Separate extracted declarations, fixtures, observed telemetry and independently verified native outcomes. Input dispatch is not command success; telemetry is not a control API.
- Test the smallest affected component first. Native sessions need a written budget: at most two launches, twenty control actions, twenty minutes, and two attempts per unchanged failure. Stop and retain diagnostics at a limit.
- Keep raw telemetry, saves, secrets, game assets and generated evidence out of Git. Commit concise evidence summaries and status at validated milestones; no release, push or merge is implied.

- Major application milestones require an isolated, milestone/commit-identified runnable Windows development build plus a packaged launch/service/resource check. Use `npm run package:development -- M5` (substitute the milestone); never overwrite older builds or publish implicitly.

- M7 platform: one application-owned bridge/gateway/receipt store; MCP is a thin authenticated loopback adapter. Keep save-derived, historical, live-qualified and manual planning state distinct. Gameplay execution is not exposed. Native test plans require independent deadline supervision and retained evidence.
