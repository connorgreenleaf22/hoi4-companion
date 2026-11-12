# UXD-02 — Shared design system and launch comparison

This is a design exploration, not a production redesign or owner selection. Both launch variants use the same React state, five destinations, fixtures, strategy workspace, evidence controls and storage. The URL query selects the starting view only. Switching variants does not discard the conversation.

## Evidence used

The approved [product brief](https://chatgpt.com/space/page_1796a0d6d2608191855ae01cf559acfd), [Project HQ](https://chatgpt.com/space/page_6af25f0e983c81918c96a2fa075d2901) and [protocol](https://chatgpt.com/space/page_0b88523e013c8191ad68670ed056673e) were read through the connected Pages tool on November 12, 2026. HQ and the remote integration ref agreed on `bdb8a4887522b38f5110f3900bbf1655cc5fd600`. HQ's UXD-01 handoff status lagged the local evidence; it was not treated as proof the audit was unfinished.

The actual UXD-01 audit, independent review and handoff were read from local `audit/uxd01` at `3696be9`; its retained screenshots were available in the separate audit checkout. Visually inspected captures included the 1920 command center, 1100 planner and saved strategy editor. The audit's 31-image collection, browser-renderer provenance, no native rerun limit and independent critique were retained. UXD-01's observed draft loss, 180K context refusal, disconnected strategy/design path, technical state wording and short text editors informed the design. This prototype does not fix production retrieval or certify game knowledge. Audit evidence remains local-only and is not republished here.

## Design system

| Element | Decision and purpose |
|---|---|
| Typography | Windows Segoe UI, Arial fallback; 15px base, 1.55 line height. Main headings 35–60px depending on context; section headings about 21px. Short uppercase eyebrows establish hierarchy; prose uses sentence case. No remote font dependency. |
| Palette | Canvas `#101615`, sidebar `#131b17`, panel `#19211f`, primary text `#e6e9e5`, secondary text `#acb9b0`, sage action `#b1c9a4`, restrained gold `#dac38c`, divider `#34423b`. Gold is an accent, not a general warning color. |
| Spacing | Main area 48px desktop / 28px narrow; cards 22–28px; 16–26px grid gaps; rounded panels 10–14px. One document scroll, with no fixed-height nested prose containers. |
| Navigation | Five destinations; 220px sidebar, 180px at the tested narrow width, optional 68–76px icon rail. Icon-only controls retain accessible names and titles. Main route changes restore top-of-page focus. |
| Cards | Actionable cards use explicit actions: “Explore campaign,” “Open strategy workspace,” “Reopen strategy.” Informational cards have no false click affordance. The same comparison has numerical, visual and matchup presentations. |
| Iconography | Existing `lucide-react`: compass, shield, factory, plane, research, rail, bookmarks and conversation. Country markers are original CSS geometry. Germany uses a neutral black/red/gold country marker, not a claimed 1939 regime flag. Portugal is a simplified color marker; no licensed game artwork is copied. |
| Verification | Text labels accompany color. Conditional = assumption-dependent draft; Estimated = demonstration/input-only treatment; Unavailable = no qualified data; Source verified appears only as a future-state legend example. Every gameplay recommendation stays provisional. |
| Progressive disclosure | Concise reply → reasoning → full editable workspace. Human-readable assumptions/sources remain in normal mode; raw fixture/integration details appear only after Developer Mode is enabled. |
| Attention | Inline feed separates Attention and Opportunity. Quiet by default. Opt-in interruption/chime controls demonstrate preferences but never trigger actual notifications or audio. |
| Keyboard | Native buttons, labels, selects, numeric inputs and disclosures. Skip link, visible focus ring, route focus, keyboard ordering controls, Enter/Shift+Enter composer semantics and a live status message. No custom modal/focus trap. |
| Workspace | Six preparation cards, sidebar editing, sticky section links and direct advisor access. At smaller widths columns stack. Editable notes grow vertically; source/reasoning text remains readable. |

Default strategic preferences are Fun → Winning → Efficiency. Reordering changes new fixture recommendations and the editorial country ordering. Existing conversations retain their submitted response text. This is not a numeric utility model or a performance ranking.

## Identical evaluation scenarios

The automated matrix uses a fresh browser context for each of A/B × 1920×1080/1100×900. It exercises the same Germany question, alternate-history choices, missing-context fixtures, edits, saves and reloads. An action is an explicit click/select or question submission, not a human completion time. Counts below exclude scrolling and reading; keyboard/typing cost depends on the chosen input method.

| Scenario / useful endpoint | A: Chat-first | B: Campaign-first | Fair interpretation |
|---|---|---|---|
| Germany: concise answer | 1 suggested-action click | 1 hero-action click | Both put the primary sample within immediate reach. |
| Germany: full strategy | 2 clicks via answer | 2 clicks via answer; sample workspace also directly reachable | Same expansion, unchanged conversation and controls. Direct sample browsing skips the conversational context. |
| Germany: explanation then workspace | 3 clicks | 3 clicks | Reasoning is optional and does not force the player to repeat the prompt. |
| Alternate history: ranked cards | 1 suggestion | 1 browse action, below the campaign panels | Same capability, but B's discovery action requires more scrolling, especially at 1100px. |
| Alternate history: plan / saved idea | 2 clicks / 2 clicks | 2 clicks / 2 clicks | Filters and requirements are optional extra actions. |
| Missing observations: guided fallback | 1 suggestion | 1 “Review available context” action | A treats uncertainty as a conversation; B makes its existence visible before a question. |
| Discover design tools | Tools → Military design comparison (2) | Same (2) | Label is explicit; workspace section link brings the comparison into view. |
| Save and reopen | Save → library → reopen (3) | Same (3) | Revisions retain snapshots, with identical storage and recovery. |

### Variant A — Chat-first

The quiet center gives the question and three example tasks a clear hierarchy. It is the stronger starting point for exploratory questions, an unconnected game, or a player who already knows what to ask. It avoids implying a live campaign dashboard exists when observations are missing. The compact header provides context without displacing the task.

Its weakness is that passive intelligence is secondary. Returning players must enter Campaign to inspect observations, and the empty conversation can feel less useful without suggestions. The large heading adds atmosphere but uses vertical space. After substantial conversation history, reaching a new prompt requires the visible “Ask another question” action or scrolling.

### Variant B — Campaign-first

The hero objective, near-top composer and quiet feed explain what the companion can help with before the player formulates a question. It better supports returning to a second-monitor campaign, where the next task often follows an existing objective. The disconnected label and context action keep the missing-observation case honest.

Its weakness is the stronger Germany framing and more content before alternate-history browsing. At 1100×900 the intelligence and objective cards begin near the bottom of the initial viewport; the alternate-history action sits below them. The page is useful as a campaign entry, but is less direct for an open-ended new campaign. The synthetic objective must never be mistaken for detected readiness or live state in production.

### Shared limitations and recommendation

The workspace deliberately exposes a substantial plan. At 1100px the six priorities stack, increasing document height; the sticky section links reduce travel but do not remove the reading load. At 950px and below, editing moves above the plan. A future production layout should consider a compact plan outline and task-specific editing without creating tiny scroll containers. Physical second-monitor DPI, screen readers and human task timings were not established by this CSS-viewport inspection.

My preference is **B for returning campaign play**, because it presents the objective and a useful context action while keeping the composer prominent. **A is preferable for discovery and disconnected first use.** This is an expert recommendation, not a user-study result or automatic winner. The owner retains the launch decision; a configurable startup screen remains a future option.

See the [independent review](UXD-02-REVIEW.md) and [completion report](UXD-02.md) for the exact candidate, final findings and evidence boundaries.
