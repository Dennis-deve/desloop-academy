# Retired browser-only test fixtures

These are the exact historical tests and helper from the previously labelled browser simulation. They were moved here **without deleting Git history** when the owner superseded demo permissions with the 22 October 2026 no-demo directive. They do not validate the released product and must not be counted as passing production tests. No prior user data or database record was deleted.

The release now uses `src/app/ReleaseRouter.tsx` and has its own frontend tests; the adult pilot keeps its separate server/database tests and opt-in browser integration tests. If a former preview feature is later implemented with real persistence, permissions and a verified integration, create fresh tests against the authoritative feature ID rather than silently restoring these local-state fixtures.
