# HOI4 Companion

- M7.3.1 works on `feature/hoi4-ai-m731`, forked from validated M7.3 fc60182. Zero paid/provider calls during implementation; the user must separately approve and initiate the one real acceptance request. Preserve user AppData read-only during diagnosis.
- M7.3 baseline works on `feature/hoi4-ai-m73`, from validated M7.1 46b0206 with M7.2.1 f39f96d integrated. Preserve all older branches, evidence and builds. No HOI4 launches or gameplay/control experiments in M7.3; earlier native budgets are exhausted.
- Use `.agents/skills/hoi4-game-bridge/SKILL.md` for game/source/bridge work. Read `docs/hoi4-bridge/STATUS.md` before repeating investigations.
- Extend the existing Node service, ordered parser, SQLite, planner workspace and history infrastructure. Preserve existing QA-LEDGER/release gates.
- Never modify installed game files, personal saves or regular playsets. Keep static definitions, native-qualified captured facts, parsed-unqualified saves, historical recordings and manual assumptions distinct. Freshness does not prove ownership; input dispatch is not success.
- Recommendations must use `server/planner/coverage.ts` and `POST strategy/review`. Provider prose cannot certify mechanics, confidence, rankings or optimization. Plans stay editable/provisional; observations never overwrite assumptions automatically. Preserve the final-release explanation coverage contract.
- Test the smallest affected component first; use deterministic fixtures, no repeated unchanged failures or broad regression loops. Record actual versus inferred/unverified results and retain useful evidence.
- Keep credentials, raw saves/telemetry/diagnostics, personal account metadata and unnecessary game assets out of Git. The user explicitly permits audited M7.3 source pushes to the intentionally public origin. Push only the intended feature branch; no force push, main/develop merge or release.
- Major application milestones require a commit-identified isolated Windows build, fresh extraction and launch/service/persistence checks. Never replace older builds or installed apps.
- The model-independent AI planner must disclose provider costs/data transmission, keep raw private saves local, and work offline when unconfigured. User chose configure-later for M7.3: no real-provider success claims from test fixtures or Codex's own access.
- Phase 0 integration must build and pass packaged smoke checks before AI implementation starts. Keep one application-owned bridge/gateway/store and the existing authenticated read-only MCP adapter.

## Workflow and review rules

- PR #3 is integrated into `feature/hoi4-ai-m731`. Future milestones use a new isolated branch from the explicitly named baseline, a bounded PR, CI, independent review, versioned manifest, completion report and Project HQ handoff. Read `docs/workflow/README.md` and `docs/workflow/PROJECT-HQ.md`. Preserve existing autonomy and native limits; substantial merges require explicit approval. Workflow rollout work uses `workflow/qa-integration-rollout`.
- Builder and independent reviewer must be separate agents/sessions or people. Record the reviewed full SHA and findings; no merge without user/maintainer approval. Fixture CI cannot certify native behavior, complete mechanics coverage or user acceptance.
- Review hosted CI changes for game launches, process control, provider calls, secret access and test-allowlist expansion. Hosted CI must remain fixture-only. Preserve runtime provenance and qualification boundaries.
- Review manifests/reports for consistent SHA, evidence, artifact hash, blocker links and acceptance state. Reject promotion based solely on fresh data, dispatch success or AI assertions. Generate a Project HQ handoff at completion; verify actual Page access before claiming synchronization.
