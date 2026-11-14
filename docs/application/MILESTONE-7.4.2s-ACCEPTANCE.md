# Whole-strategy draft protection — isolated development build

The M7.4.2s label identifies STRATEGY-DRAFT-01 only. This is an unsigned isolated development build, with current mechanics/release limitations retained.

1. Extract into a new folder. Older builds and personal profiles should remain intact. The development application uses its own data directory; verify Sources & settings before entering private data.
2. Open a campaign in Campaign planner. Enter a strategy objective and optional manual context; choose Start local draft and edit its name, advice and assumptions.
3. Visit Division & production, then return. The whole-strategy fields must remain. Switch to another campaign and back; each campaign's draft must remain separate.
4. Open global unsaved-draft review. Download the strategy draft or return to its editor. Cancel replacement/discard when prompted and confirm the edits remain.
5. Save and recheck the strategy. This uses local source validation; it must not generate a provider request. Reopen the saved strategy and verify content. Close the application normally, reopen it and reopen the saved strategy again.
6. With unsaved edits, close/reload must warn. Stay/Review retains edits. Explicit discard/Leave ends the in-window draft. Pending writes must prevent an uncertain close.

Unsaved drafts are kept in this window only. Save and recheck persists a strategy; download preserves a local copy. Crash, forced termination or explicit Leave/discard can lose unsaved edits. Provider keys, transmission consent and spending approval are not retained in the draft cache. No provider account is needed for these checks.

This fix does not certify strategic usefulness, all-DLC/current-patch mechanics, numerical combat formulas or native gameplay. Existing QA-LEDGER, QUAL-195 and final explanation-coverage gates remain open.
