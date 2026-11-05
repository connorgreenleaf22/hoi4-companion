# Deferred native adapter feasibility

This note preserves the option of adapting [saslifat-gif/hoi4-mcp](https://github.com/saslifat-gif/hoi4-mcp); it authorizes no implementation. The pinned review in `COMMUNITY-TOOLS.md` remains the source audit. No new reverse engineering, loader, DLL, patch or injection was executed in Milestone 3.

The existing adapter expects an executable hash beginning `7dc947`; the laptop's 1.19.4.1 executable is `cf781ed178cd801643b233b7e3fcd1c0efd19bd01aecd24bf07a35f69f10476f`. Its injection/process-write mechanism and patch-specific structures cannot be made compatible by disabling that check. No license granting reuse was established. Upstream claims do not independently validate this installation.

A future technical review must resolve licensing, map the exact executable/ABI/offsets and calling conventions, assess loader permissions and crash/cleanup behavior, and specify readback independent of a dispatched native call. Preserve strict version/hash refusal and an isolated disposable environment. Any invasive prototype requires separate explicit authorization. No achievement or anti-cheat bypass belongs in this path.

Recommendation: defer. Finish ordinary-input focus qualification and reliable observation first. The present blocker is OCR title recognition before input; it does not establish that native injection is necessary or preferable.
