# HOI4 Companion

- Work on the requested branch; bridge development stays on `feature/hoi4-bridge`.
- Use `.agents/skills/hoi4-game-bridge/SKILL.md` for game discovery, bridge work and native testing. Read `docs/hoi4-bridge/STATUS.md` before repeating an investigation.
- Extend the existing Node service, parser and SQLite infrastructure. Preserve release gates and the unresolved obligations in `QA-LEDGER.md`.
- Never write installed game files, personal saves or a regular playset. Use explicit disposable data directories for tests. Do not attach experimental controllers to an unrelated game.
- Separate extracted declarations, fixtures, observed telemetry and independently verified native outcomes. Input dispatch is not command success; telemetry is not a control API.
- Test the smallest affected component first. Native sessions need a written budget: at most two launches, twenty control actions, twenty minutes, and two attempts per unchanged failure. Stop and retain diagnostics at a limit.
- Keep raw telemetry, saves, secrets, game assets and generated evidence out of Git. Commit concise evidence summaries and status at validated milestones; no release, push or merge is implied.

- Major application milestones require an isolated, milestone/commit-identified runnable Windows development build plus a packaged launch/service/resource check. Use `npm run package:development -- M5` (substitute the milestone); never overwrite older builds or publish implicitly.
