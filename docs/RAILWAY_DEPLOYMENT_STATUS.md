# Railway private adult engine — verified deployment record

> **D23 current-state correction (1 November 2026):** The owner reports deleting both Railway app and PostgreSQL with no known backup; this has not been independently inspected here. The Railway runtime/restore steps below are **historical**, not an available service or rollback. Do not reapply old IaC or attempt to recover/credit nonexistent rows. For the separately approved **new empty synthetic-only Neon + gated Render Free** development plan, use [the D23-corrected runbook](RENDER_NEON_SYNTHETIC_STAGE_D22_2026-11-01.md). The public read-only Render guide remains separate. No real users, minors, live AI, spending or production activation is authorised.


**22 October 2026 · internal/synthetic use only.** This records an actual Railway configuration and private runtime smoke test, **not** a public product launch or a browser-ready tester portal. A later documentation-only deployment on GitHub `main` at `784b0ed16675186ee20d9c7400ba4541853a15e1` was also reported `SUCCESS`. The new FND-01 no-demo source commit `201a1e4` was later pushed to GitHub `main` and independently confirmed, but its Railway rollout is **unverified**: no Railway CLI/session was available for new private health, domain or denial checks. This earlier deployment record must **not** be used as hosted verification for the new source.

| Item | Verified state |
|---|---|
| Project | Owner's existing `glorious-inspiration` project; **not** a newly created duplicate |
| Environment | Railway's `production`-named environment, used here **only for synthetic internal rehearsal** |
| App | `desloop-academy`, GitHub `Dennis-deve/desloop-academy` `main`; first verified engine deployment used commit `b07f7de731a5b3bc1a6799936a5782df654e45e6` |
| Database | New Railway `Postgres` service, private `DATABASE_URL` reference, no public TCP proxy or `DATABASE_PUBLIC_URL` |
| Location | Both services reported `ams` (Amsterdam); check the database volume's precise residency in Railway before real records |
| Public access | **Zero** app public/custom domains and **zero** database public domains; no approved private HTTPS ingress for tester browsers |
| Build/deploy | Node 22, `npm run build:all`, pre-deploy `npm run engine:migrate`, `npm start`, `/api/health`; deployment status **SUCCESS** |
| Runtime | `PILOT_ENABLED=true`, `ENGINE_V2_ENABLED=true`, both draft acknowledgements enabled, `APP_ORIGIN=https://no-public-origin.invalid` (closed placeholder) |
| Child boundary | All three minor-account/data/learning flags `false`; database constraints also reject activation. **No guardian consent collection or child account route exists.** |

The owner explicitly selected reuse of this project and Amsterdam for **synthetic** tests. The `production` environment label is Railway's name, **not** a statement of privacy, curriculum, security, accessibility, commercial or child-safety approval. The app has no public host: `APP_ORIGIN` deliberately prevents normal browser registration/login until separately reviewed private, same-origin HTTPS access with no bypass domain is installed.

## Checks actually performed

1. The reviewed GitHub `main` matched the local clean checkout before infrastructure changes. The private setup was applied through the checked-in `.railway/railway.ts` after `railway config plan` showed **one database added, app settings/variables changed and zero resources destroyed**. A second plan enabled **only the two adult flags** (0 add, 2 change, 0 destroy); `railway config plan` then reported up to date.
2. Railway's pre-deploy log printed `Installed unpublished adult-only release draft-2-candidate; no learner is enrolled automatically.` The app startup log and healthcheck showed a running service and HTTP 200. The final adult-engine deployment reported **SUCCESS** on the verified source commit above; both services reported Amsterdam and no public domains.
3. A private SSH check inside the deployed app returned `/api/health` mode `adult-internal-pilot`, while `/api/pilot/status` reported both adult flags enabled. Anonymous engine pathway and guardian-readiness requests returned **401**, a guardian-consent POST returned **404**, and registration from a non-approved origin returned **403**.
4. A read-only private SQL check found **44 courses, 176 modules, 176 lessons**, **eight** safeguarding controls still `not_ready`, **zero** adult tester accounts, and all child account/data/learning gates **false**. No invitation, personal record, guardian proof or child record was entered into Railway.
5. Before deployment, local Node 22 verification passed **32 frontend tests, 16 server tests** (including separate disposable PostgreSQL integrations), **five** curriculum-builder tests, full typecheck/lint/build, `npm audit --audit-level=low` with **0 vulnerabilities**, and **49 Playwright desktop/mobile passes with one intentional skip**, including the draft-1 and draft-2 browser flows. These are regression checks, not a security, legal, assessment or WCAG certification.

## Not enabled / next controlled gate

- **Tester browser access remains closed.** An owner-approved private HTTPS access path (identity-aware ingress/VPN, no public Railway bypass), exact `APP_ORIGIN`, secure cookie/CSRF retest and a private end-to-end adult invitation flow are still needed. No real adult has been invited or enrolled. Do not generate a public Railway domain as a shortcut.
- Arrange a PostgreSQL backup, a tested restore, data retention/erasure policy, region/transfer review and cost monitoring **before real personal data**. Add reviewer MFA, recovery, abuse controls, incident procedures, accessibility and independent security review before widening internal participation.
- The `003_guardian_groundwork.sql` hold is **planning metadata, not a consent system**. Qualified Ghana-first legal/privacy/safeguarding review, verified adult age and guardian authority, purpose-scoped revocable consent, child identity minimisation, safety operations, tenant isolation and a reviewed future migration are required before **any** minor account or real child information. See [guardian design](GUARDIAN_CONSENT_AND_IDENTITY.md).
- Curriculum strategy tags, unreviewed lessons, browser demo roles, payments, AI, partner earnings and the unbuilt programming/robotics tools are not official or live services. Draft-1 and draft-2 completions remain separate and unpublished.

For a reproducible operator procedure and rollback without exposing the service, use [the private Railway setup/rollback runbook](RAILWAY_PRIVATE_ADULT_SETUP.md). Turning adult flags off closes account/progression routes but **does not delete database records**. This record names no secrets, invitation codes or public endpoint.
