# NAV-01 integration development review

`M7.4.2n` is a commit-identified development package label, not a completed mechanics milestone or release. Extract into a new directory and retain prior builds. Never open an original user database for this review.

Template name, unit rows/counts and army size stay in the current window when switching tools or campaigns. Save writes the name and rows to the selected campaign using the existing API; same-name replacement of different rows asks for confirmation. Army size is a window-only calculation input. Dirty saved-template loads and discard actions require an explicit choice. Unsaved templates appear in global draft review/download and close/reload protection.

Normal reload/close offers Stay/review or explicit Leave/discard. In-memory drafts are not crash durable and do not survive forced termination or an explicit discard. Scratch/deleted-campaign drafts remain downloadable/discardable; they are not automatically applied to another campaign. Production-line and equipment-comparison selections are outside this template fix.

Review saved template compatibility, failed/pending saves, navigation, replacement Cancel, reload and restart using isolated fixture data. Automated native-close evidence injects known dialog responses through the actual Electron close handler; it does not certify human OS-dialog acceptance.

Installed 1.19.5.0 is not qualified by retained 1.19.4.2 pins. Legacy Germany/Hungary paths and no-NSB tank fixtures are counterfactual, not all-DLC applicability evidence. PR #11's five numerical combat metrics remain unsupported/null and M7.4.2b remains blocked. No game launch, provider call, protected merge or release is authorized.
