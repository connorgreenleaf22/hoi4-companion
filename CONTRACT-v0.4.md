# v0.4 Discovery and Verified Campaign Guides

Approved scope implemented on 3 November 2026. The release owner explicitly authorized v0.4 despite incomplete v0.3 QA. This is acceptance of documented beta limitations, not a full v0.3 QA pass. Baseline v0.3 R2 SHA-256: `5F074817927FF7207E14C2C65BF7C63D0AB3DE2E9A43237F9679B99B4608703E`.

## Initial catalog and evidence

The named initial set is Fascist USA, Elizabeth II, Japanese secret leaders, Austrian Habsburgs, Hungarian Habsburgs, Liechtenstein and Scandinavia. Existing short cards were audited and retained in source history; they are not all expanded or presented as verified walkthroughs. Stable IDs `austrian-restoration`, `hungary` and `scandinavia` are retained. This deliberately bounded set follows the owner's priority countries. Expansion to every old card is later work.

`src/discovery-types.ts` defines stable guide identity and revision, supported patch, country, spoiler flag, author/review/reuse metadata, DLC context, source dependencies, claim type and verification method. `server/discovery-content.json` contains original summaries. Script-extracted means a narrow declaration was inspected; it never means an entire campaign was played or the engine reproduced it. Strategy and difficulty are editorial. Mechanics explanations remain separate. Wiki links whose full pages returned 401 are explicitly unreviewed research leads; no copied external walkthrough or unverified wiki unlock becomes a scripted fact. Full patch-matched community strategy curation remains open.

Each installed dependency has its whole-file SHA-256 and a reviewed line range. Guide freshness compares supported version and source hashes with the cached index, not a live game state. `guideSourceHashes` captures dependencies outside semantic importer roots without claiming those roots are semantically extracted. Missing coverage, changed hashes, patch mismatch, or unresolved/ambiguous exact links requires review and blocks starter handoff. This checks the last indexed installation; refresh Sources after updating the game. Old captured checklists are never rewritten.

Important factual boundaries include both USA warning-dispatch focuses, Elizabeth's conditional mean-time event, Japanese flags versus actual leader promotion, Austria/Hungary's race for Otto, Hungary's AND prerequisites, and Swiss core ownership rather than advisor hiring for Liechtenstein. Japanese alternate leader chains remain partial and have no starter queue. Sources establish only their stated claims.

## Spoilers and reading

`GET /api/v1/guides` excludes secret guides before applying search or country filters. `spoilers=show` is an explicit reading choice. Hidden guides produce no title, source path, claim, tag, image, snippet, count, preview or direct detail response in this catalog. The overview uses the default safe catalog. Hiding clears open guide/preview content. Ordinary encyclopedia reference data remains a source browser with its existing unredacted game records; this spoiler boundary applies to curated discovery and its search/previews, not all raw game scripts.

All guide assets are bundled locally. Reading and previewing require no external request. External links open only by explicit click. App security, authentication, phone access, game files and save handling are unchanged.

## Planner handoff and persistence

`POST /api/v1/discovery/preview` takes guideId, profileId, expectedProfileRevision, expectedIndexRevision and spoilers (`show` or `hide`). The server uses current saved data, checks exact source-specific definitions, requires a matching campaign country, and proposes a NEW alternative plus a captured sourced checklist. It does not select a country, persist a profile, activate a plan or write selection. Suggested sequences are limited preparations, not completed unlocks. The independent v0.3 planner evaluates prerequisites, exclusions, applicability and unknown conditions.

Explicit Apply uses the existing `/plan/apply` contract, including profile/index CAS and fingerprint verification. Existing alternatives, completion history, notes, bookmarks, templates and checklist progress remain present. The new plan becomes active only on this reviewed write. Cancel is write-free. Failed writes retain a downloadable/global planner draft; pending writes use the existing close protection. The genuine native pending-save dialog remains untested (QA ledger below).

Guide bookmarks/notes, where provided, use `guide:<stable-id>` in existing profile stores. No database or profile schema migration is added: schema stays 3. Existing v0.3 data must remain unchanged during build and developer tests. Development, renderer, package and native checks are recorded separately; only an independent QA owner can grant independent acceptance.

See [QA-LEDGER.md](QA-LEDGER.md) for inherited obligations and release limits. No AI feature, live capture, save edit, external publication or security change is included.

R2 presentation correction: shared assumptions are displayed once, while distinct step-only assumptions stay under their focus. Repeated warning text is grouped with affected step positions; different diagnostic types/IDs remain retained in the display model. No raw report, captured checklist, source wording/hash, preview fingerprint, plan or saved profile is rewritten by this grouping. Full semantic and in-game QA remain partial.

R3 qualification correction: USA guide revision 2 labels the event-delay compound NOT interpretation unverified, retains its source references and captures the uncertainty as a manual check. New starter provenance refers to each claim's own verification status. Older USA guide r1 captures receive a read-only editorial correction notice based on stored origin metadata; their original wording, sources, ticks and exports remain intact. This is separate from installed-source freshness. No game-engine NOT interpretation or whole-route success is newly certified.
