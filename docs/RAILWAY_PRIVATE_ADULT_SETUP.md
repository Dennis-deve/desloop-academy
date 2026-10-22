# Railway: private adult/internal engine setup

**Status, 22 October 2026: instructions only. No Railway account, project, PostgreSQL service, migration or deployment has been accessed or created by this workspace.** This is an operator checklist for the adult/internal **unpublished** draft-2 engine; not a public demo launch or permission to enrol children. See [guardian safety hold](GUARDIAN_CONSENT_AND_IDENTITY.md) and [engine runbook](LEARNING_ENGINE_RUNBOOK.md). Stop if the reviewed source has not been pushed to GitHub `main` and verified first.

## 0. Authorise and review privately

- An authorised owner signs into their Railway workspace (interactive `railway login --browserless` is supported). Creating a new project needs account/workspace permissions; a project-only token is insufficient. **Do not paste Railway, GitHub or database credentials into commits, screenshots or chat.** Confirm budget, billing, operator ownership, region/data residency, backup/restore policy and privacy review before storing even adult records.
- Use **Node 22** (`.node-version` and `package.json`); from a verified clean Git checkout run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:server`, `npm run build:all` and `npm audit --audit-level=low`. Database integration/E2E tests must point only at separate disposable local databases; they reset account data.
- Review `railway.json`: its legacy-service `preDeployCommand` is `npm run engine:migrate`, **not** the older draft-1-only migration. Railway [IaC guidance](https://docs.railway.com/infrastructure-as-code) says new services ignore this deprecated file, while legacy services still read it and override dashboard settings until **1 December 2026**. For the new service, set commands explicitly in the dashboard or create a reviewed `.railway/railway.ts` via `railway config init`, `plan`, `apply`; do not blindly import decrypted variables with `--include-variables`.

## 1. Create an isolated project and private PostgreSQL

1. In Railway, create a **new internal project/environment**, owned by the approved workspace. The current Desloop pilot data should not share a database with public/demo apps. The [CLI](https://docs.railway.com/cli) supports `railway login --browserless`, `railway init` and `railway add --database postgres`; alternatively use the dashboard **+ New → Database → PostgreSQL**. Check the selected workspace and environment before any creation.
2. Keep PostgreSQL on the project's **private network**. In database **Settings → Networking**, do **not** enable Public Access/TCP Proxy or use `DATABASE_PUBLIC_URL`. Arrange backups and a restore exercise; Railway's [PostgreSQL guide](https://docs.railway.com/databases/postgresql) describes the private `DATABASE_URL` service reference.
3. Add one **Node app service**, not a publicly reachable website. Its source is the reviewed `Dennis-deve/desloop-academy` GitHub **`main`** only after that commit has actually been verified. If Railway's GitHub integration is not authorised, use an owner-approved local checkout with `railway up` instead; do not deploy an older checkout. **Do not generate a Railway domain, attach a custom public domain or enable public networking for either service.** The private engine can be inspected from an authorised Railway runtime, but without approved private HTTPS ingress there is **no browser login for testers yet**.

## 2. Configure before starting the app

On the app service (not the database), create a Railway **reference variable** `DATABASE_URL=${{Postgres.DATABASE_URL}}` (adjust `Postgres` to the actual database service name in the dashboard). Set:

| Variable | Value / purpose |
|---|---|
| `NODE_ENV` | `production` |
| `RAILPACK_NODE_VERSION` | `22` |
| `PILOT_ENABLED` | `true`, for invited **adults only** |
| `PILOT_DRAFT_ACKNOWLEDGED` | `true`, after responsible internal draft review |
| `ENGINE_V2_ENABLED` | `true`, for the separate draft-2 adult engine |
| `ENGINE_DRAFT_ACKNOWLEDGED` | `true`, after operator review of the unpublished candidate |
| `PILOT_OPERATOR` | Named authorised operator, for auditable CLI actions |
| `APP_ORIGIN` | Initially `https://no-public-origin.invalid` (**closed placeholder**, not a real URL); this deliberately denies browser mutation/login until approved private HTTPS ingress exists. Replace with the **exact** approved same-origin HTTPS URL before tester browser access. |
| `CHILD_ACCOUNTS_ENABLED`, `GUARDIAN_EVIDENCE_COLLECTION_ENABLED`, `MINOR_LEARNING_ENABLED` | Omit or set each to `false`; any other value fails startup. |

Never use `VITE_` variables for secrets. Keep `PILOT_LOCAL_E2E_AUTH_LIMIT` **unset**. Do not set `DATABASE_TLS=verify` for the private Railway DB unless a separately validated CA/TLS mode is configured. `APP_ORIGIN` must not end in `/` and must be HTTPS when `NODE_ENV=production`.

Set build command **`npm run build:all`**, pre-deploy **`npm run engine:migrate`**, start **`npm start`**, healthcheck **`/api/health`**, and a migration-appropriate pre-deploy timeout. The server binds `0.0.0.0:$PORT`. The pre-deploy command applies 001, 002 and the **003 safeguarding hold** and verifies content hashes; if it fails, stop rather than bypass it. [Railway pre-deploy](https://docs.railway.com/deployments/pre-deploy-command) runs in a separate private-network container, has service variables and blocks deployment on failure; filesystem writes there do not persist. Avoid enabling automatic GitHub deployment until these variables/commands are configured and reviewed.

## 3. Deploy and verify **without public exposure**

- Start/redeploy only when the app and DB are private and source SHA matches the reviewed GitHub `main`. Read build, pre-deploy and startup logs, looking for Node 22, successful migration/healthcheck, no secrets/PII, and no public domain. A healthcheck is deployment readiness, not continuous monitoring. `engine:migrate` is repeatable for identical content; mismatched hashes or changed safeguarding policy must fail closed.
- With owner-approved [Railway SSH](https://docs.railway.com/cli/ssh) access to the running **app** service, execute a **non-destructive** localhost health probe inside its container. Example after selecting the linked service (the operator's CLI may prompt for SSH key registration):

  ```bash
  railway ssh -- node -e 'fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then(r=>r.json()).then(x=>{if(!x.ok||x.mode!=="adult-internal-pilot")process.exit(1);console.log("private adult engine healthy")})'
  railway ssh -- node server/dist/cli.js engine-submissions  # expected empty before real adult enrolments
  ```

  `engine-submissions` requires `PILOT_OPERATOR`/acknowledgement, verifies the 003 hold and release, and writes an operator audit event. Do not print database URLs, invite codes or user records into a shared transcript. `railway run` runs on the **local** machine and may not resolve private PostgreSQL hostnames; use the private deployed container for operator commands. No adult invitation is useful until a reviewed private browser ingress exists.
- Negative checks: the app service and PostgreSQL must have **no** public domain/TCP proxy; direct requests to private endpoints from the public internet must not connect. The static browser demo remains separate and local. A production-suitable private HTTPS access path (e.g. approved identity-aware ingress/VPN with no bypass origin) must be designed and audited before testers use `/pilot` from browsers. Only then change `APP_ORIGIN`, retest exact-origin CSRF and secure cookies, invite verified adults out of band and run the full quiz → project → assigned human review → next-course smoke test. **Never route minors through this pilot.**

## 4. Stop/rollback

If an unexpected public domain appears, remove ingress immediately and pause deployment. On any content, migration, privacy or auth failure, turn `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false` and redeploy the same reviewed source; this disables account/progression routes but **does not delete the database**. Restore only from a tested private backup under an incident plan. Do not force-push, truncate or rerun destructive local tests against Railway. Keep the safeguarding gate blocked until a future separately approved implementation and migration.
