# Tool navigation orientation — isolated development candidate

M7.4.2e identifies the bounded document-scroll fix, combined with the already reviewed visible-startup baseline. This package is a development candidate. Native orientation acceptance is pending until the following checks are observed.

1. Extract into a new folder and use a disposable Companion profile. Preserve older builds and personal data.
2. In Campaign planner, scroll well below its heading. Open Division & production. The new tool should begin at its heading and template controls, rather than inheriting the previous page's vertical position.
3. Enter a recognizable unsaved template name and unit counts. Navigate to Campaign planner and back to Division & production. Each destination should open at its top, and the template draft should remain.
4. On one page, open and close a reference. Return to the original document position. From a reference, use an action that navigates to another tool; the queued reference restoration must not move that destination away from its heading.
5. If using the planner map, retain its internal viewport/zoom while switching tools. The document reset must not reset planner graph state, campaign choice or saved/draft content.

Focused source-fixture tests do not certify renderer/native behavior. This change does not alter game mechanics, observations, provider spending, final-release gates or the in-window draft durability policy. No HOI4 launch or provider call is needed.
