# Visible desktop startup

The November 14 owner-use exercise found that the extracted Windows build could remain without a targetable window while diagnostics stopped at `service-start`. Source inspection established that automatic reference indexing is awaited before `startServer` returns, and the old desktop entry created its window only afterwards. The indexing worker has a five-minute bound; this finding does not establish that the worker was hung.

The desktop now creates its normal sandboxed window first and loads a local script-free startup page before starting the service. It explains the reference scan, possible wait, offline behavior and close-to-cancel option. Once the existing service is ready, that same window opens the normal workspace. Service/indexing and qualification semantics are unchanged. Startup errors retain their diagnostic dialog until acknowledgment; second-instance focus and migration decisions remain in the desktop entry.

Verification: the bundled desktop entry was executed against a deferred fixture service and mock Electron boundary. It proves that the startup page appears before service completion, the same window transitions to the workspace, a second instance focuses it, an error is displayed before window destruction, and a window closed during initialization does not subsequently load a workspace and closes the returned service. This test performs no native launch, game call, provider call or user-data access. It is included in the portable CI allowlist.

Focused startup and existing close-guard checks, typecheck and production build pass. A newly packaged desktop visual check is still required before claiming the startup UX is accepted on Windows.
