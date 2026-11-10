# Real campaign usefulness acceptance

Status: **pending real desktop recording and user comparison**. Infrastructure tests alone cannot pass this gate.

Before collecting answers, pick 3–5 genuine questions. Capture the same wording, model/product/version, relevant user-provided context and date in two separate chats. First collect ordinary ChatGPT advice with no observation attachment or connector. Then ask with the read-only connector or sanitized snapshot. Keep the baseline blind to the grounded answer. Avoid retries/cherry-picking; retain all answers and any failures locally.

Suggested practical questions (the user may replace them):

1. What national focus am I on, and what unlocks next? A missing general live selection must yield unknown; a selected save can only establish persisted state, while unlock rules need a separate installed reference.
2. Which research slots are occupied, and what should I prioritize? A slot count is not an assignment list. Any advice must disclose missing military/production context.
3. How have political power, war support and industry changed during this session? Cite both comparable snapshot IDs/dates and avoid causal claims.
4. What do you actually know about my manpower, resource or supply problem? Report observed values and unavailable details separately.
5. Can I pursue a named focus objective from this campaign? Distinguish installed prerequisites from unavailable eligibility/mod/DLC state; do not certify an optimized strategy.

For each answer, retain the exact baseline and grounded prose, tool responses/export used, source hashes, independent game UI readings, and a row with these scores:

| Dimension | Score / rule |
|---|---|
| Factual correctness | 0 wrong; 1 mixed; 2 all checkable claims supported |
| Practical usefulness | 0 unusable; 1 general help; 2 changes a concrete decision |
| Freshness handling | 0 misrepresents old state; 1 partly clear; 2 dates and limitations explicit |
| Attribution clarity | 0 mixed facts/rules; 1 partial; 2 all categories distinguished |
| Unsupported campaign claims | Count; grounded answer must have zero |
| User outcome | Concrete decision improved, or “no improvement” |

Compare per-question and total score deltas; report successes and failures. One correct unavailable answer can improve honesty, but alone does not prove useful gameplay advice. Acceptance requires at least one specific practical improvement supported by the real captured state, with the user explicitly confirming value, and at least three questions evaluated without invented live facts.

Keep baseline/during HOI4 CPU and frame-time measurements as user assertions with the measurement method. Compare equivalent speed/scene and record confounders. `report.json` supplies companion CPU, sample timing, raw/log volume, field availability and missing-day estimates; it does not measure FPS or causal game slowdown. Attach tunnel-client diagnostics locally to explain transport outages invisible to the server.

Native country gate is independent: at least two different countries must have independently matched country/date/values. Fixture GER/POR parsing does not satisfy it. The actual campaign may be evaluated before general-country support is accepted, provided its individual evidence is adequate and limitations remain visible.

## Historical rehearsal (not this acceptance test)

The existing sanitized real GER fixture has political power 2.324 on 1936.01.01.12 and 16.268 on 1936.01.07.24; civilian factories increase 35 to 37. These records can support a **historical** answer about those changes. They cannot answer what focus is active now, supply status, or the current campaign's complete research assignments. A positive fixed-ID Basic Machine Tools research check is a subset. This rehearsal tests attribution, not a measured comparison with ordinary ChatGPT, and claims no new live success.

## Handoff after recording

Produce a capability report citing the local run IDs, exact build commit, game version/checksum, asserted DLC/playset, duration, captured country coverage, field availability/qualification, freshness/gaps, raw byte totals, connection failures and performance measurements. Include the five-question score table and verbatim user acceptance or rejection. Publish only a sanitized summary; raw logs, saves, account configuration, tunnel credentials and screenshots stay local unless the user explicitly requests sharing.
