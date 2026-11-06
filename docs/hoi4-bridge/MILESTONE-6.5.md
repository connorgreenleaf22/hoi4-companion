# Milestone 6.5 — expanded read-only observation

Branch: feature/hoi4-telemetry-m65, from validated f02b1c5. M6.1 acceptance ZIP and feature/hoi4-bridge remain untouched. This checkpoint implements candidates; native qualification is still pending.

## Selected mechanism

Extend the GER-only on_startup/on_daily_GER mod with one atomic v2 snapshot: PP/stability plus war support, total research slots and civilian/military/naval factory counts. A fixed manifest checks two completed-focus IDs and three known/actively-researched technology IDs. True and false are both emitted; missing fields are unavailable. Eight Boolean checks per daily GER observation, no all-country scan, no per-tick logger. Temporary variables prepare compact fixed vectors; they do not change gameplay values. No vanilla file or replace_path is used.

Manifest ger-m65-1 is pinned to 1.19.4.2 and the declared ordered IDs in src/telemetry-manifest.ts. Atomic terminated records avoid partially published batches. The generator measures quoted string length after UUID substitution (238 characters). The original longer draft was caught by Agent Tools before launch and replaced. Unknown manifest/version, duplicate keys or wrong vector lengths are rejected. Invalid individual values remain unavailable. Schema 1 replay and stored history remain supported; v2 imports preserve the expanded subset and never populate manual completions automatically.

Current focus identity/progress, research progress and complete inventories remain unavailable. Installed documentation supports has_completed_focus, has_tech and is_researching_technology; it does not document has_active_focus. focus_progress is not current-selection proof. The on-action list has no general focus/research completion callback; MIO hooks are not universal completion events. No vanilla focus reward or technology effect is overridden. Daily snapshot differences are not labeled events.

## Pre-native checks

25 focused bridge, telemetry, ownership, history and intelligence tests pass; TypeScript and installed-doc/ID preflight pass. Evidence: .bridge-local/m65-tests.txt and m65-static-validation.json. Agent Tools 4.7.0 at reviewed 3f035b2ffb8fbd4363b2842d5fdde6ff54517ef8 was used through a fresh local stdio client after this chat's stale transport returned closed. No permission or registration change. Trigger validation valid=true; emitter valid=null because native argument blocks are unchecked; custom helper resolution is also unqualified. No static error remains in the shortened emitter. Logs/results: .bridge-local/m65-agent-tools and m65-agent-validation-short-wire.txt. Native testing must establish interpolation and actual semantics.

## Native plan

Maximum two launches total, 25 minutes from first launch, ten ordinary campaign-changing test actions and two unchanged failed attempts. scripts/bridge-observe-native.ts maintains the milestone budget and an owned read-only session; it does not execute the M3 helper or register FocusSelectionAdapter. OS metadata binds PID/creation time/executable/hash, lease, nonce and log generation. Existing normal profiles and running games are refused. Every UI primitive will be counted separately in the evidence; setup/navigation/read-only inspection/exit are distinguished from campaign changes. No console commands, automation adapter, injection or executable changes.

Use a new 1936 GER disposable campaign. Check initial slots, war support, factories and known infantry technology against UI; compare explicit negative checks for the two focuses and target research. Select one ordinary focus and one technology manually through visible UI; inspect active research, then advance at ordinary speed until a daily snapshot and, if budget permits, completion. Pause for independent comparison. Save only within the owned profile if useful. Stop at limits even if a field remains unqualified. Replay after exit and archive the owned profile back to its prior absence. Test plan, raw logs and screenshots stay ignored.

Exact next task: prepare the previously absent laptop profile, write the per-session plan, and execute this bounded read-only validation. No native result is claimed yet. Final report/inventory/roadmap and validated branch push follow evidence review.
