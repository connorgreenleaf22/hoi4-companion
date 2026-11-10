# Independent integration review

Reviewer: separate read-only agent `independent_review`, independent of the builder. Initial review: `b0e9f15ed9027b5f15aaa67f95d80739c2021ec8`; bounded re-review: **`72c2a27cbc03986b7b237dc08dcb8265374e9c67`**. Compared against baseline `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. [PR #4](https://github.com/connorgreenleaf22/hoi4-companion/pull/4); [readiness report](INTEGRATION-READINESS-2026-11-10.md).

**Disposition: no actionable findings or source-level blockers. Technically suitable for review; desktop/native/user acceptance pending.** Agent review does not constitute a GitHub human approval or acceptance decision.

Inspected actual diff, applicable instructions and transitive runtime/test paths:

| Boundary | Review result |
|---|---|
| MCP permission enforcement | Six strict query schemas and dedicated handler; controls absent, not merely labeled read-only. Browser-local recorder/save controls remain outside the MCP catalog. |
| Credentials and sanitization | Separate random Q&A credential, legacy-token rejection, loopback descriptor validation/cleanup, no redirect, response bound, sanitized fields and diagnostic output. Desktop hidden prompt/profile helpers inspected; no actual key entered. |
| Paths and validation | Tools accept no path/command/URL; exact ID/kind source lookup validates relative paths before joining installation root. Save/log paths require explicit local operator control, not Q&A permission. |
| Attribution and freshness | Country/session/version/source comparison boundaries; future/stale/export live downgrades; historical pilot and save-derived data never gain live ownership from timestamps. |
| Recorder and failure recovery | Monotonic deadline, chunk/source/raw/combined append limits, 200-record query window/10,000-observation cap, generation changes/rollback stop, no auto-resume. Storage failure may leave an incomplete report; retained raw evidence is not a completed session. |
| QA integration | Recommended and re-reviewed only the campaign-Q&A allowlist addition. Exercised imports are inert with respect to native ownership/control/provider work; fake install, disposable data and Node stdio child are portable. Hosted Linux success independently corroborates this. |

Six additional reviewer probe groups passed with disposable temp files, injected clocks and mock metadata: all tools reject unexpected path/command extras; descriptor rejects remote/wrong-route/invalid-port/query-suffix values; future/stale/export downgrade; wrong producer stop; wrong country stop; reopened recorder stays idle while retained observations remain historical. No game, tunnel, provider or native process operation was used.

The final two-file delta adds the allowlist entry and shared-query test only. Reviewer confirmed historical/stale classification, unavailable values, selected session/country behavior, sanitized provenance and export; runtime, schema and catalog unchanged. Review scope excludes real engine semantics, installed override correctness, desktop routing/credentials, performance and usefulness. Documentation added after the tested SHA reports this evidence without upgrading those gates.
