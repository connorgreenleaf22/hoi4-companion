# HQ handoff — live campaign Q&A pilot

**Status: implementation candidate; real gameplay usefulness not yet demonstrated.** Branch `feature/hoi4-live-qa`, implementation `2a11db9`, base M7.3.1 `49ccb29`. Work was coordinated with the bridge task; the concurrent GitHub QA workflow and legacy bridge core were left alone.

Delivered one shared versioned Q&A interface, six-tool read-only stdio adapter with a separate credential, sanitized historical export fallback, player-country telemetry successor, and visible bounded local recording controls. The monitor keeps raw records, observation/source hashes, freshness, gaps, volume and companion CPU metrics locally. Source inspection supports an early `is_ai=no` guard; native support for two countries is not yet claimed. Full focus/research detail remains dependent on supported plaintext-save inspection; production, resources, supply and detailed diplomacy remain unavailable.

Evidence: 15 focused tests, TypeScript/build, built six-tool MCP smoke, current installed Portugal source hash and fixture UI Start/read/Stop. No new HOI4 session, paid inference, gameplay automation, normal-profile/save edit, public endpoint or raw-data publication. Detailed findings and limitations: EVIDENCE.md.

Account decision: user confirms Tunnel is available; none is configured. Next steps are restricted tunnel setup and one real ChatGPT status call, a user-controlled 2-minute telemetry smoke, independent checks in two countries, then a 30–60 minute recording and 3–5 paired practical questions. User gameplay/credentials remain under user control. Setup and evaluation instructions are in SETUP.md and EVALUATION.md.

Acceptance remains: an attributed answer based on a real campaign materially improves a practical decision versus ordinary ChatGPT advice, and the user explicitly confirms that value. A working connection or fixture answer does not pass.
