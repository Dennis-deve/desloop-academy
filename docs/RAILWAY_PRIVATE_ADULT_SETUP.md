# Railway: private adult/internal engine setup

> **D23 current-state correction (1 November 2026):** The owner reports deleting both Railway app and PostgreSQL with no known backup; this has not been independently inspected here. The Railway runtime/restore steps below are **historical**, not an available service or rollback. Do not reapply old IaC or attempt to recover/credit nonexistent rows. For the separately approved **new empty synthetic-only Neon + gated Render Free** development plan, use [the D23-corrected runbook](RENDER_NEON_SYNTHETIC_STAGE_D22_2026-11-01.md). The public read-only Render guide remains separate. No real users, minors, live AI, spending or production activation is authorised.


**Last verified private configuration, 22 October 2026 (before FND-01 GitHub push):** The owner's existing Railway project **`glorious-inspiration`** had a domainless `desloop-academy` app and a private PostgreSQL service in Amsterdam (`ams`). Recheck its new deployment and domain count after source changes; GitHub success alone is not hosted verification. Its **adult/internal** draft-2 API is enabled only inside Railway's private network; pre-deploy migrations 001–003 and private health/denial checks passed. GitHub `main` carries the IaC and source. **There is no public domain, public database proxy, browser login for testers, enrolled adult, minor account or guardian-consent collection.** The Railway environment is named `production` by default but is limited to **synthetic internal testing**, not an approved public or child release. See [verified checks](RAILWAY_DEPLOYMENT_STATUS.md), [guardian safety hold](GUARDIAN_CONSENT_AND_IDENTITY.md) and [engine runbook](LEARNING_ENGINE_RUNBOOK.md).

## 0. Confirm the scope and source

An owner with Railway account/workspace permissions signs in with `railway login --browserless`; inspect `railway whoami` and the intended project/environment before changing anything. Confirm spending limits, approved region/data residency, backups/restore and operator ownership before real user data. All activity here is for **fictional/synthetic adult records only**. The owner's original root brand JPEGs remain in GitHub. From a clean Node 22 checkout whose HEAD equals remote `main`, run:

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run test:server
npm run build:all && npm audit --audit-level=low
# Dedicated local PostgreSQL integrations/E2E use ONLY disposable local databases.
```

The repository includes a reviewed **`.railway/railway.ts` IaC file** and the `railway` TypeScript SDK. Railway's deprecated `railway.json` is ignored by this **IaC-managed existing** service; it cannot configure its pre-deploy command. The existing service has no active legacy Config-as-Code owner. Use the CLI IaC **plan** before **apply**; do not infer configuration from `railway.json`. See [Railway IaC](https://docs.railway.com/infrastructure-as-code) and its [reference](https://docs.railway.com/infrastructure-as-code/reference).

## 1. First-stage private database migration (completed with adult routes off)

1. Link the trusted CLI checkout to the owner's existing `glorious-inspiration` project and its intended Railway environment. **Before provisioning**, check that `railway status` shows the existing `desloop-academy` app only. Do **not** run `railway init`, generate an app domain or reuse the unrelated project in the same account.
2. Set `PILOT_OPERATOR` as a named authorised operator in the **Railway service variables**, not in the public repository. Set it with `--skip-deploys` so this step does not trigger a partial deployment. The IaC uses `preserve()` to keep its existing value.
3. The first-stage IaC declares one new Railway **Postgres** service in Amsterdam (`ams`) and configures the existing app in the same region. It references only the DB's private `DATABASE_URL`; **no** public domain/TCP proxy, `DATABASE_PUBLIC_URL`, `VITE_` secret or custom ingress is declared. It sets Node 22, build `npm run build:all`, pre-deploy `npm run engine:migrate`, start `npm start`, health `/api/health` and a migration timeout. `APP_ORIGIN=https://no-public-origin.invalid` is a deliberately unreachable closed placeholder. `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false` keep adult endpoints off while migrations are installed; every minor flag stays `false`.
4. Run `railway config plan` from the linked checkout (or `--file` with an approved absolute IaC path). **Expect only one private database to be added and existing app settings/variables to change, with zero resources destroyed and no domain created.** Inspect the plan before `railway config apply`. If there is a delete, unknown region, public networking change, secret exposure or unexpected service, stop. Applying infrastructure can incur Railway charges.
5. Watch the build, pre-deploy and health logs. `engine:migrate` must apply/verify **001 draft-1, 002 draft-2 and 003 hard-disabled guardian groundwork** using private PostgreSQL. Failures block deployment; do not bypass the migration. [Railway pre-deploy](https://docs.railway.com/deployments/pre-deploy-command) runs in a separate private-network container and filesystem changes do not persist. Verify both services deploy in Amsterdam; confirm PostgreSQL volume placement in the Railway dashboard before storing any real records. No public database TCP proxy or app domain should appear. Set up backups and a restore test before storing any real records.

At the time of the *historical* stage-one rollout, disabled `/api/health` returned `demo-only` inside the private container. The **new no-demo source**, if deployed with adult flags off, returns `inactive` instead; its actual Railway deployment after GitHub push has not been reverified. Both mean the adult routes are closed; neither authorises a public browser workspace.

## 2. Enable the private adult engine only after stage one passes (completed)

After stage one passed, **only** `PILOT_ENABLED` and `ENGINE_V2_ENABLED` changed to `true` in `.railway/railway.ts`; both draft acknowledgements stayed `true`, the three minor flags `false`, the database private, **no domains** and the origin closed. The change was tested and pushed to GitHub `main`; the Railway plan showed **0 additions, 2 variable changes and 0 deletions**, then applied. The new deployment passed `engine:migrate` again, returned `adult-internal-pilot` through `/api/health` inside the container and denied anonymous engine/guardian access. See [the measured results](RAILWAY_DEPLOYMENT_STATUS.md). For later changes, always plan and apply the IaC separately from GitHub pushes; a file in Git does not mean Railway has applied it.

With owner-approved [Railway SSH](https://docs.railway.com/cli/ssh) access to the running **app** service, run a non-destructive localhost health probe; the CLI may ask the owner to register an SSH key:

```bash
railway ssh -- node -e 'fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then(r=>r.json()).then(x=>{if(!x.ok||x.mode!=="adult-internal-pilot")process.exit(1);console.log("private adult engine healthy")})'
railway ssh -- node server/dist/cli.js engine-submissions  # expected empty before adult enrolments
```

`engine-submissions` verifies the safeguarding hold and candidate release and writes an operator audit event. Never print DB URLs, invite codes or user records into shared transcripts. `railway run` executes **locally** and may not resolve Railway's private database host. Without a reviewed **private same-origin HTTPS ingress**, browser registration/login is intentionally unavailable and no adult invitation is useful. A generated Railway domain is public exposure, **not** private access. Later private browser ingress must have no bypass Railway domain, use an approved identity-aware access layer and exact `APP_ORIGIN`, then be retested for CSRF/secure cookies before issuing verified-adult invitations out of band. The original draft-1 remains separate; minors remain entirely disabled.

## 3. Stop, rollback and credential hygiene

If a public domain/TCP proxy unexpectedly appears, remove exposure immediately. On migration, origin, privacy or auth failure set `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false`, review a fresh plan and redeploy the same reviewed source. Turning flags off **does not delete the database**; never run disposable local test resets or `TRUNCATE` against Railway. Keep backups, restore/retention and incident procedures under an accountable owner. Sign out of Railway CLI at handoff and remove any local token/session files left in the workspace. Revoke temporary GitHub/Railway tokens after the verified work is complete.
