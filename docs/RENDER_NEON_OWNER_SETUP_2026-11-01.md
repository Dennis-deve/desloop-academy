# Owner setup: Render public guide + closed development web + Neon PostgreSQL

**1 November 2026 — plan, not a deployment receipt.** The owner chose to **reuse** the existing [read-only Render static guide](https://desloop-readonly-guide.onrender.com), create **one new public Render web service with all adult/project/child/AI features off**, and copy the **verified-synthetic-only** Railway PostgreSQL data into a **new development-only Neon PostgreSQL project**. The owner chose **free/synthetic-only** resources and **Frankfurt** for the new web service and Neon project. Railway stays intact until a separately approved, verified cutover. No service, Neon project, backup, database copy, new GitHub push or web activation has been performed by this plan. See [decision D21](DECISIONS.md).

## Important boundaries before creating anything

- A Render **web service has a public `onrender.com` URL**, even with no custom domain; do not mistake a difficult-to-guess URL, closed `APP_ORIGIN`, or a disabled API for private networking. A Render **private service** is a different service type with no public browser URL. The owner specifically selected an **inactive public shell** for the first web deployment, not adult login. [2](https://render.com/docs/web-services)
- The existing static guide is already public, keeps its **manual public promotion**, and intentionally excludes `/pilot`, `/api` and private bundles. It cannot serve as a ready-made interactive frontend for the new web API. Do **not** add a browser `DATABASE_URL`, `VITE_` credential, wildcard rewrite, CORS workaround or static-site redirect to the adult service.
- The old Railway PostgreSQL was last independently inspected at an earlier date. Before a copy, the owner must **freshly inventory** it and reconfirm that **no real adult/child/personal records** exist. If that is untrue or uncertain, **stop before copying**: obtain a privacy/retention/transfer plan and qualified review. Even synthetic dumps can contain password/session/invitation hashes; keep dumps and credentials out of chat, Git, build logs and shared drives.
- Both Render and Neon list **Frankfurt**; verify the options in the owner's dashboards. Neon fixes a project's region at creation. Frankfurt is a development/synthetic choice, **not** a finding that future real Ghanaian data transfers or final production are lawful. [1](https://render.com/docs/regions) [1](https://neon.com/docs/introduction/regions)
- Confirm **Free** on both dashboards, monitor quotas and billing, and **stop before any upgrade/charge**. Render Free web services can sleep and lack shell/one-off jobs; Neon Free has storage/compute/egress limits. Free is not a final-production, availability or backup guarantee. [1](https://render.com/docs/free) [2](https://neon.com/docs/introduction/plans)

## 1. Static site: reuse, do not duplicate

Keep `desloop-readonly-guide` and its static-only root `render.yaml` unchanged. Do not manually promote the latest `main` SHA just to create the development stack. In Render, check this service still has **auto-deploy Off** and only the reviewed guide routes; record its current deployed SHA separately. The guide is the public informational site, **not** an authentication or API proxy. Render can auto-deploy services on commit by default, so explicitly review settings rather than assuming they inherited the static site's settings. [1](https://render.com/docs/deploys)

## 2. Neon: create a development-only target, not a second application

1. On an owner-controlled account, check Railway's **PostgreSQL major version**, schema list/extension use, approximate DB size, and aggregate row counts **without exporting personal rows**. Confirm the present data is synthetic-only and that a separately stored backup/restore path exists. Do not temporarily publish Railway's Postgres TCP proxy for convenience; Railway documents a private CLI tunnel for owner-side dumps. [2](https://docs.railway.com/guides/postgres-backups-restores)
2. In the **Neon Console → New Project**, choose a clearly labelled development project, **Frankfurt**, a PostgreSQL major version compatible with the inspected source (ideally the same), and only **Postgres**; do not enable optional Auth, Data API, AI, storage or realtime just because they are offered. Verify Free plan and quotas **before** clicking Create. Neon creates a root branch and a default database; make a **separate empty target database or branch** for the synthetic copy so existing data cannot be overwritten. [5](https://neon.com/docs/manage/projects)
3. In Neon **Connect**, choose the exact branch/database/role and save its **direct, unpooled** connection string in an owner-controlled secret store for restore. Plan a separate least-privilege runtime role/connection string later; never paste either connection string here. Neon requires TLS and recommends verifying server identity. Do not put a URL in a static-site or browser variable. [1](https://neon.com/docs/connect/connect-securely) [1](https://neon.com/docs/connect/connection-pooling)

## 3. Render: create one disabled web service

In **Render Dashboard → New → Web Service**, connect `Dennis-deve/desloop-academy` using the owner's GitHub integration. Use branch `main` (currently independently verified at `14f02d92ea0f04bccd3a90b7ab1ca9f8f1dc4fe1`; check again at creation), root repository directory, runtime **Node 22**, region **Frankfurt**, and **Free** if available. Configure **Auto-Deploy Off before creating**; creating the service starts its first public build/deploy, so set all holds first. Use the **Web Service** flow, not a sync that changes the existing static-only Blueprint. [2](https://render.com/docs/web-services) [1](https://render.com/docs/deploys) [1](https://render.com/docs/node-version)

| Render setting | Initial value |
|---|---|
| Name | `desloop-closed-dev` or another honest development-only name |
| Build | `npm ci --ignore-scripts && npm run build:all` |
| Start | `npm start` |
| Health check | `/api/health` |
| `NODE_VERSION`, `NODE_ENV`, `HOST` | `22`, `production`, `0.0.0.0`; let Render supply `PORT` unless it requires an explicit value |
| `APP_ORIGIN` | `https://no-public-origin.invalid` — **do not** point it at the public web or static URL yet |
| `PILOT_ENABLED`, `PILOT_DRAFT_ACKNOWLEDGED`, `ENGINE_V2_ENABLED`, `ENGINE_DRAFT_ACKNOWLEDGED`, `PROJECT_CORE_ENABLED` | each exactly `false` |
| `CHILD_ACCOUNTS_ENABLED`, `GUARDIAN_EVIDENCE_COLLECTION_ENABLED`, `MINOR_LEARNING_ENABLED` | each exactly `false` |
| `AI_GATEWAY_ENABLED`, `AI_ADMIN_UI_ENABLED`, `AI_LIVE_TESTS_APPROVED` | each exactly `false` |
| `DATABASE_URL`, `DATABASE_TLS`, Neon role/credentials | **Do not set on the first deployment.** With `PILOT_ENABLED=false`, the current server does not connect to a DB; a green health check would not validate Neon. |

After creation check the **exact deployed commit** in Render, `GET /api/health` returns `ok: true` with `mode: inactive`, `/api/pilot/status` reports adult disabled, private/account/AI APIs cannot create/read data, and the site's public root is an honest read-only/inactive surface. Do not invite accounts. An inactive web service is not a verified private pilot. Render's Free service may cold-start and does not offer a shell/one-off jobs, so do not rely on a Render shell for the database migration. [1](https://render.com/docs/free)

## 4. Owner-controlled Railway → Neon **copy**, only after the fresh inventory

1. Preserve Railway unchanged as rollback. From a **trusted owner machine**, use Railway's documented **private `railway connect postgres --tunnel-only`** instead of enabling the DB public TCP proxy. Make a protected, encrypted, custom-format `pg_dump` backup and check that the archive lists the expected `pilot`, `learning` and safeguarding objects. A current Railway inventory may contain other schemas: review before transferring. Do not place the archive under this workspace/repository or send it here. [2](https://docs.railway.com/guides/postgres-backups-restores)
2. Restore **only to a fresh empty Neon development target** with a **direct/unpooled** Neon connection, using `pg_restore` with `--exit-on-error --no-owner --no-acl`. Do not add `--clean`, `--create`, `DROP`, reset scripts or a pipeline that can silently discard source data. First test and document schema/role/extension compatibility; if a restore fails, **stop**, inspect, and decide whether a new empty target is required—never retry blindly over a partial restore. Neon's migration guide covers `pg_dump -Fc` and `pg_restore`; pooled connections are not appropriate for migrations. [1](https://neon.com/docs/import/migrate-from-postgres) [1](https://neon.com/docs/connect/connection-pooling)
3. Compare source/target database versions, schema and table counts, catalog/content hashes, safeguarding flags, constraints and triggers; check no child gates open and no unreviewed 004/005 migration appears. Test a **restore into another isolated destination** and record who can access the backup, its expiry and rollback steps. Do not point E2E suites or test fixtures at Railway/Neon: those tests can truncate tables. Do not delete Railway or switch its app to Neon as a side effect of a successful copy.

## 5. What the new resources **will not yet do**

The existing `server/src/db.ts` uses a `pg.Pool` with TLS enabled only by `DATABASE_TLS=verify`; its 5-second connection timeout and Neon TLS/role/idle behavior have **not** been tested on Neon. `PILOT_ENABLED=false` means the Render web service makes **no DB connection** at startup. **Do not set the Neon URL and enable the pilot as a shortcut.** Review and test a secure TLS connection, role separation, startup/health and errors on an isolated synthetic Neon target first.

Most importantly, `server/src/config.ts` and `server/src/cli.ts` **deliberately reject** `PROJECT_CORE_ENABLED=true` and migration 005 on a remote/production DB. Creating Render and Neon does **not** make the private project editor or save flow usable on the public site; never bypass the local-only guard. Later adult browser access needs a separate approved identity-aware HTTPS architecture with no bypass public origin, independent privacy/security/backup/retention/cost review, migration plan, CI and owner authorisation. Neither the static guide nor this inactive web deployment is final production.

## Owner handoff — only non-secret facts

After the setup/inventory, report the **service names/URLs**, web plan/region/auto-deploy mode/deployed SHA and **inactive** health status; Neon project region/Postgres major/branch/database names (not connection strings); and Railway's **aggregate** schema/table counts, Postgres version, data-classification result, and whether the private backup/tunnel succeeded. **Never send** DB URLs, passwords, `.env`, dump files, deploy hooks, PATs, private SSH keys, real account records or screenshots containing secrets in chat. I can then prepare and test the Neon/TLS and private-stage changes locally; any future GitHub push/deployment or later feature activation needs a fresh, specific owner approval and secure access method.
