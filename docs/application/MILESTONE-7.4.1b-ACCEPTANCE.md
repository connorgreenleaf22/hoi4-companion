# M7.4.1b offline player review

Use the separate commit-labelled M7.4.1b development ZIP in the milestone report. Extract into a new directory; keep its files together. This is a Companion build, with separate development storage; it does not qualify native HOI4 behavior.

Read the three briefs in `M741B-PLAYER-BRIEFS.md` alongside the route matrix. Confirm the selected DLC/tree scenario before applying advice. Source statements, rules-based advice and unknown campaign facts are distinct. No provider configuration or game launch is needed to review them.

For a backend consumer, submit the usual valid version-1 `POST /api/v1/strategy/review` request with `includePathSummary: true`. Read `pathSummary` alongside the unchanged `coverage`; the response remains provisional. Rank/optimize requests still reject. Do not infer applicability from an installed tree or event.

Owner review remains pending: are the next steps and branch consequences useful, understandable and more practical than the previous focus/event cross-references? Report unclear fields with the source version and selected route. This bounded candidate does not cover all countries, complete event closure, live state, combat preparation or optimality.
