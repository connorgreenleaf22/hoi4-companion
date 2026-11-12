# Prepared PR — UXD-02 adaptive strategy prototypes

The current interface separates conversation, campaign context and military tools, and the UX audit reproduced loss of unfinished strategy work across navigation. This change adds an isolated React/TypeScript prototype under `prototypes/uxd02` with chat-first and campaign-first launch views over a shared editable workspace, local revision library and deterministic synthetic responses.

Production frontend/service code, provider configuration, bridge, game data and existing PRs are unchanged. No candidate backend merge is required. The prototype provides all three acceptance scenarios, comparisons in three presentations, priority editing, an advisor override flow, incomplete-observation recovery and opt-in alert concepts.

Validation and reviewed SHA: see [completion report](UXD-02.md) and [independent review](UXD-02-REVIEW.md). Scope is browser prototype behavior. Owner selected Variant B — Campaign-first on November 12, 2026; acceptance covers launch direction, not native game qualification or numerical correctness. Project HQ and its linked decision pages were updated and verified on that date; see [decision record](UXD-02-DECISION.md).

Prepared locally only. No push, GitHub PR, public hosting or merge was performed. Intended base: `feature/hoi4-ai-m731` at `bdb8a4887522b38f5110f3900bbf1655cc5fd600`; proposed head branch: `prototype/uxd02-adaptive`.
