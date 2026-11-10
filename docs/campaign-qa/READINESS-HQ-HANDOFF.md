# Project HQ handoff — laptop integration

November 10, 2026: live-Q&A integrates with verified baseline `bdb8a488`. Isolated candidate **`72c2a27cbc03986b7b237dc08dcb8265374e9c67`** on `workflow/live-qa-readiness-20261110` passed all four [hosted QA jobs](https://github.com/connorgreenleaf22/hoi4-companion/actions/runs/42924450500), focused fixtures/build/built MCP smoke, and separate read-only review with no actionable source blockers. Only merge conflict was STATUS documentation; added bounded Q&A coverage to the existing CI allowlist. Six tools/schema, credentials and recorder limits are unchanged.

[PR #4](https://github.com/connorgreenleaf22/hoi4-companion/pull/4) is technically ready for code review against this candidate, remains draft/unmerged on its original branch, and needs the reviewed integration delta adopted before merge readiness. Existing desktop ZIP/manifest and all 20 inventory files verified unchanged; no replacement. Fixtures were historical, with supported values and unavailable fields kept distinct.

**Pending:** gaming-desktop transfer/runtime/tunnel, real engine boundary/values, two-country qualification, 30–60 minute capture, HOI4 performance and 3–5 paired questions with explicit user value acceptance. **Next:** run the existing user-controlled two-minute desktop smoke, then inspect its sanitized report/UI comparisons before one separate longer capture. No game launch, paid call or tunnel reconnection occurred on the laptop.

[Technical report](INTEGRATION-READINESS-2026-11-10.md) · [manifest](../milestones/LIVE-QA-READINESS.json) · [five-question scorecard and exact checklist](DESKTOP-ACCEPTANCE-SCORECARD.md) · [independent review](READINESS-REVIEW-2026-11-10.md).

Prepared for [Project HQ](https://chatgpt.com/space/page_6af25f0e983c81918c96a2fa075d2901); current Page read access was verified. No Page edit or automatic synchronization is claimed. Preserve product acceptance and roadmap decisions when applying this handoff.
