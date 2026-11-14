# Common integration Windows development review

`M7.4.2i` is an integration package label, not a completed feature milestone or release. Exact evidence: [integration report](../workflow/COMMON-INTEGRATION-2026-11-12.md).

Extract the entire ZIP into a new folder. Keep older builds/data. This unsigned development app uses its own commit-labelled Electron profile and data directory; automated validation overrides data storage with a disposable test profile. Do not point it at a regular user database for acceptance.

Review offline local planning, source preview and saving/reopening a provisional strategy. Provider configuration should be absent after restart. Do not enter an API key or launch HOI4 for this review.

**Known release blocker NAV-01:** unsaved Division Lab templates reset when navigating away and back. Save before leaving. This is not fixed or accepted by a successful package check. Organization/soft attack/hard attack/defense/breakthrough in the partial combat API remain unsupported/null; source inspection is not a combat simulator. No protected promotion or release is authorized.
