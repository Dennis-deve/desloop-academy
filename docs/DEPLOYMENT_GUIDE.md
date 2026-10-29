# Desloop Academy — safe deployment guide, private to full public

**Planning guide · 22 October 2026, with 23 October Render source addendum.** The separately implemented public-only Render static artifact and non-deployable private-staging template are documented in [Render setup](RENDER_DEPLOYMENT.md); neither has been created or hosted. This document does **not** approve or execute a public launch. The last GitHub `main` verified for this guide is `7c957d081287aff30fc18f6b3ec56b58f1be671c`. Its first no-demo feature commit is `201a1e4`. The **last privately verified Railway deployment** was the older `784b0ed` source; after the newer GitHub pushes, Railway's deployment SHA, state and exposure have **not** been checked. Follow [the authoritative feature register](FEATURE_REGISTER.md) for completion status, [the existing private runbook](RAILWAY_PRIVATE_ADULT_SETUP.md) for prior setup/rollback, and [the blank verification worksheet](DEPLOYMENT_EVIDENCE_TEMPLATE.md) to record actual results. Never turn an unobserved step into a pass.

## 1. Decide which boundary you are operating

| Boundary | What exists | What an operator may do now | Stop condition |
|---|---|---|---|
| Existing Railway `glorious-inspiration` / `production`-named environment | Last verified: private `desloop-academy` adult/internal API + private `Postgres` in Amsterdam, `domains: []`, closed `APP_ORIGIN`, adult draft flags on, child flags off, synthetic data only. | **Read-only verification** of new source, deployment, networking, DB hold and failure gates. | No public domain, DB TCP proxy, real adult/child data or provider activation on this basis. The word `production` is an environment label, not launch approval. |
| Public read-only course guide | Real 44-course metadata/search/detail code exists, with honest unavailable routes. Current build also includes lazy adult-client chunks and uses `/api/pilot/status`. | Implement and test a **separate public-only artifact/service** before public exposure; do not attach a domain to the existing combined private app. | No public site until origin split, copy/privacy review, manual accessibility and public-only bundle/security tests pass. |
| Real adult learning | Genuine but unpublished private PostgreSQL draft-1/draft-2 engine, operator invitations, server-owned ordered gates and assigned human review. | Continue isolated synthetic testing and feature work. | Self-attested age, draft assessments, missing recovery/MFA/backups/identity, legal and ingress reviews prevent real-user or official-credit launch. |
| Full platform incl. schools, billing, AI, community and children | Required scope in M01–M19; most live integrations not built. Migration 003 **hard-disables** child account/data/learning flags. | Implement one registered feature and its real provider/tenant/safety tests at a time. | No one-step public launch; no child release by flipping a variable, browser role or database column. |

**Known architecture constraint:** `.railway/railway.ts` declares the whole current private project: one app, one private database, Amsterdam (`ams`), GitHub `main`, Node 22, `npm run build:all`, pre-deploy `npm run engine:migrate`, `/api/health`, `domains: []`, `APP_ORIGIN=https://no-public-origin.invalid`, adult flags true and child flags false. AI-01's later source branch explicitly adds `AI_GATEWAY_ENABLED=false`, `AI_ADMIN_UI_ENABLED=false`, `AI_LIVE_TESTS_APPROVED=false`; migration 004 is **not** part of pre-deploy and must not be silently applied on this service. **Do not edit `domains`, origin, child or AI flags to obtain a quick launch.** An IaC plan can reveal unintended deletion of resources added elsewhere; always inspect the entire plan before any approved apply. Railway's IaC plan is read-only, but apply changes infrastructure. Railway IaC [1](https://docs.railway.com/infrastructure-as-code).

## 2. First safe action: verify the private Railway source (no public change)

Use a **trusted owner workstation** with access to the existing Railway workspace. The previous one-time GitHub token should be revoked; do not paste credentials, database URLs, invitations or real records into commands, shared logs or this guide. If `railway` is not installed, install its current CLI following official instructions [1](https://docs.railway.com/cli), not a copied binary. These commands are observational; none applies config or deploys:

```bash
# On a clean clone; do not overwrite local work.
git clone https://github.com/Dennis-deve/desloop-academy.git
cd desloop-academy
git switch main
git pull --ff-only
git status --short
git rev-parse HEAD            # compare to the currently approved commit, initially 7c957d0...
node --version                # must be Node 22.x for this repo
npm ci                        # also needed for the tracked railway/iac package
python3 scripts/build_public_catalog.py --check
npm run typecheck && npm run lint && npm test && npm run build:all
npm audit --audit-level=low
# DB integration/E2E resets run ONLY against separate disposable local databases.

railway login --browserless   # approve on your own device
# Older main checkouts may not ignore the local link file yet; protect it without committing:
grep -qxF '.railway/config.json' .git/info/exclude || printf '%s\n' '.railway/config.json' >> .git/info/exclude
railway link --project glorious-inspiration --environment production --service desloop-academy
railway whoami
railway status                # confirm correct project, environment, app, DB and region
railway deployment list --service desloop-academy --environment production --limit 10
railway logs --service desloop-academy --environment production --latest --build --lines 100
railway logs --service desloop-academy --environment production --latest --lines 100
railway config plan           # READ ONLY; do not run apply to fix unexpected drift
```

`railway link` writes **local link context** under `.railway/`. The documentation branch adds `.railway/config.json` to `.gitignore`, but the GitHub `main` baseline named above may not yet contain that change. On an older clone, add that path to **local** `.git/info/exclude` before linking, then check `git status` before any commit. `.railway/railway.ts` is reviewed source; never add CLI sessions, keys, DB URLs or local link metadata to Git.

In Railway's app **Deployments** panel, compare the actual deployment's **source commit SHA** with the approved GitHub `main` SHA, and check build, pre-deploy migration and health result. `SUCCESS` without matching source is not proof. If no new deployment appeared, inspect GitHub autodeploy connection, enabled trigger, watch paths, skipped deployments and repository permissions; do **not** replace this with `railway up` from an unreviewed directory. Owner may choose **Deploy Latest Commit** only after reviewing the exact source, existing project and expected IaC plan. GitHub autodeploy may be disabled or skipped; a push by itself is not a deployment. Autodeploy guide [5](https://docs.railway.com/deployments/github-autodeploys) · CLI deployment list [7](https://docs.railway.com/cli/deployment).

In the Railway dashboard verify **actual**, not just declared, settings: app **zero public/custom domains**, database **no public TCP proxy**, `DATABASE_URL` a **private reference**, both services in approved synthetic region, `PILOT_ENABLED=true`, `ENGINE_V2_ENABLED=true`, both draft acknowledgments true, `APP_ORIGIN` still the closed placeholder, three minor flags `false`, and, **if the reviewed AI-01 source is ever separately pushed/deployed**, its three AI flags still `false`; Node 22 and `NODE_ENV=production`. Check `PILOT_OPERATOR` exists **without printing its value**. If the plan proposes a deletion, new domain, public DB, region change, unexpected variable or added service, **stop and escalate; do not apply**. Record observed values, deployment ID/SHA, UTC time and reviewer in the worksheet. Never use the local disposable test reset against Railway.

Only after checking the SSH target is the **app** in the correct project/environment, run this **GET-only**, no-PII container smoke. It expects the adult flags to remain on and checks the no-demo boundary without creating an account:

```bash
railway ssh -- node -e '
const base = `http://127.0.0.1:${process.env.PORT || 4000}`;
(async () => {
  for (const [path, expected] of [
    ["/api/health", 200], ["/api/pilot/status", 200],
    ["/api/pilot/engine/pathway", 401],
    ["/api/pilot/guardian-readiness", 401],
    ["/api/pilot/ai/admin/access", 404], ["/pilot/ai/admin", 404],
    ["/courses/getting-started-with-learning-and-digital-confidence", 200],
    ["/courses/not-a-real-course", 404], ["/demo", 404], ["/register", 404]
  ]) {
    const response = await fetch(base + path, {headers: {accept: "text/html"}});
    if (response.status !== expected) throw Error(`${path}: ${response.status} instead of ${expected}`);
  }
  const health = await (await fetch(base + "/api/health")).json();
  const status = await (await fetch(base + "/api/pilot/status")).json();
  if (health.mode !== "adult-internal-pilot" || status.enabled !== true || status.engineV2Enabled !== true)
    throw Error("Adult engine mode/flags differ from private plan");
  console.log("Private no-demo boundary: observed expected HTTP statuses and mode");
})().catch(() => { console.error("Private smoke failed; inspect privately"); process.exitCode = 1; });
'
```

Railway SSH may require the owner to register an SSH key; use the official SSH procedure [4](https://docs.railway.com/cli/ssh). If the CLI cannot resolve the **domainless** service, the dashboard command palette's **Copy Service Instance ID** gives the username for `ssh <service-instance-id>@ssh.railway.com`; it is **not** the similarly named Service ID. Use that authorised SSH target for the same read-only commands—never generate a public domain merely to make SSH work. **Do not** treat a green healthcheck as continuous monitoring: Railway healthchecks gate activation but do not continue polling after go-live. Healthchecks [9](https://docs.railway.com/deployments/healthchecks).

Optional **read-only aggregate** database verification inside that same app (never print `DATABASE_URL` or personal rows):

```bash
railway ssh -- node --input-type=module -e '
import pg from "pg";
const client = new pg.Client({connectionString: process.env.DATABASE_URL});
try {
  await client.connect();
  const count = async (sql) => (await client.query(sql)).rows[0].n;
  const courses = await count("SELECT count(*)::int AS n FROM learning.courses");
  const controls = await count("SELECT count(*)::int AS n FROM safeguarding.required_controls WHERE state = $$not_ready$$");
  const adults = await count("SELECT count(*)::int AS n FROM pilot.users");
  const gate = (await client.query("SELECT child_accounts_enabled,child_data_collection_enabled,minor_learning_enabled FROM safeguarding.release_gate WHERE id = $$minor_access$$")).rows[0];
  console.log(JSON.stringify({courses, unapprovedControls: controls, adultAccountCount: adults,
    childFlagsDisabled: !!gate && !gate.child_accounts_enabled && !gate.child_data_collection_enabled && !gate.minor_learning_enabled}));
  if (courses !== 44 || controls !== 8 || !gate || gate.child_accounts_enabled || gate.child_data_collection_enabled || gate.minor_learning_enabled)
    process.exitCode = 1;
} catch { console.error("Read-only DB check failed; inspect privately"); process.exitCode = 1; }
finally { await client.end().catch(() => {}); }
'
```

**Important SQL quoting:** PostgreSQL `$$not_ready$$` is a dollar-quoted text literal; it avoids shell single-quote nesting. The above prints only aggregate counts and booleans. If the observed adult count is not the expected **zero synthetic accounts** from the prior record, do not delete or reset anything: ask the authorised data owner to investigate. If any child flag or required control differs, keep access closed and invoke the incident owner. Store no credential or full response in the worksheet.

After evidence is captured, run `railway logout` on shared machines and remove any temporary SSH key only according to the owner's access policy. No external account should be invited because this private origin has no reviewed browser access.

## 3. Foundation required before any new public or personal-data environment

1. **Ownership, law and money:** name the Ghana legal operator/controller, privacy/safeguarding/security/on-call owners, an approved domain owner, DNS control, contact and policy publisher; get an approved budget, alerts and spending cap. The Data Protection Commission describes controller/processor registration, privacy notices, data-subject rights and organisational controls under Act 843; obtain qualified Ghana advice for this project, especially children and Amsterdam cross-border processing. The previously approved Amsterdam placement covers **synthetic testing only**, not real learner records. DPC organisational guidance [2](https://dpc.gov.gh/for-organisations/).
2. **Recovery before data:** enable appropriate Railway volume backup/PITR and a separately controlled logical export under approved access; run a restore drill into an **isolated** database, test schema/row counts, record RPO/RTO, retention, encryption, access and costs. Never test restore over the only live database; a backup without a restore is unverified. Railway backup/restore guide [2](https://docs.railway.com/guides/postgres-backups-restores).
3. **Isolated staging:** owner approves the extra environment/project and charges, private PostgreSQL, synthetic accounts, no public DB proxy. Keep test database names and URLs separate from Railway; the opt-in server/browser suites truncate disposable local databases. Do not create services or apply `.railway/railway.ts` to a new target until a full-project IaC plan is reviewed for **zero unintended destruction/exposure**.
4. **Release pipeline:** require reviewed PRs/branch protection and a Node 22 CI workflow that runs `python3 scripts/build_public_catalog.py --check`, Python tests, typecheck, lint, frontend tests, build/bundle gate, server integration with isolated disposable PostgreSQL, and desktop/mobile Playwright. The [real work-branch and main CI runs](CONTINUOUS_DELIVERY.md) passed for `62cbf7b…` on 29 October. Future commits still need their own green check, protected main and owner review. Railway **Wait for CI** remains `checkSuites:false` in reviewed source; do not toggle or apply IaC without a live plan and account inspection. Keep `engine:migrate` in pre-deploy so a failed migration blocks rollout. Autodeploy and CI [5](https://docs.railway.com/deployments/github-autodeploys) · pre-deploy [17](https://docs.railway.com/deployments/pre-deploy-command).
5. **Operational controls:** private monitoring/alerts (health, failed auth, migrations, storage, cost), restricted DB role, reviewer MFA, secrets rotation, recovery, incident exercises and external audit retention. `APP_ORIGIN`, cookies, CSRF, `trustProxy`, proxy IP/rate-limit handling, abuse controls and tenant isolation require threat-model review before internet ingress. `VITE_` variables and public assets are **not** secret storage.

## 4. Publish an informational site without exposing the adult API

This is a **new feature gate**, not a request to generate a domain on the existing combined Fastify app. The original combined build contains lazy private adult-client chunks and its Availability page calls `/api/pilot/status`. The **separate Render public-only source build now exists** (`npm run build:render-public`): it excludes `/pilot` chunks, assessment material and all private API calls, and says the internal service status is unknown. The first owner-approved [public Render guide](https://desloop-readonly-guide.onrender.com) was independently verified at `62cbf7b…` on 29 October: hosted 5/5 approved HTTP 200, 9/9 forbidden 404 and desktop/mobile browser 6/6 passed. This remains a **read-only draft guide**, not a public adult application or manual WCAG/legal sign-off. Any different host must preserve that physical isolation and prove it by scanning its actual published assets. Keep the 44-course metadata projection and exact static route allowlist; negative-test `/demo`, `/register`, `/app`, `/pilot`, `/checkout`, unknown course IDs and `/api/*` with the real host. Search/filter must not grant a course.

Place that artifact on a **separate public static origin/service** with approved domain and TLS; keep the adult API on a private origin behind an identity-aware ingress and PostgreSQL on private networking. There must be **no direct public Railway bypass** to the private app. If the public web service is added to Railway, update/review the whole `.railway/railway.ts` resource graph before applying any IaC so it is not removed as an undeclared resource. Owner approves new domain, hosting costs, DNS and actual privacy/contact/terms copy. Do not publish draft answers, fake testimonials, claims of accreditation or a sign-up form that cannot persist. Validate keyboard, screen-reader, 320px/400% reflow, contrast, slow network, errors and representative first-time visitor tasks; automated axe alone cannot certify WCAG 2.2 AA. Railway public networking is deliberate exposure [1](https://docs.railway.com/networking/public-networking).

## 5. Staged real-user and full-platform release (no shortcuts)

| Release slice | Prerequisites before **real** access | Demonstrated acceptance before enabling |
|---|---|---|
| Adult identity + 44-course learning (M02–M04, M07–M08) | DPC/controller/cross-border/legal review; real adult age/email identity and recovery, MFA for reviewers, approved ingress; expert-authored **published** immutable content and protected assessment bank; backup/restore and monitoring. Never sell or award from draft-1/draft-2. | Server-only 01→44 unlock; default quiz ≥80% **and critical safety**, project/overall ≥70% with safety ≥70% and assigned human review; failure/revision/appeal and version migration; browser forgery/direct URLs fail. |
| Tools, portfolio, AI (M05–M06) | Scoped uploads/object ACLs, malware/privacy controls, isolated runner before arbitrary code; approved AI vendor/DPA, moderation, human review, cost caps and fallback. | Real provider sandbox then approved live tests, server-kept keys, output quality/abuse checks; free practice cannot create official credit. |
| Schools and facilitators (M10–M11) | Verified institutional authority and staff, tenant schema/claims and retention, contract and approved school data flow. **No school role implies guardian authority.** | Cross-school read/write denial, import validation, staff permissions, accessibility and account closure tests before any school/student record. |
| Billing and teacher partners (M12–M13) | Owner-approved GHS plans, commercial/legal terms, MoMo/card provider contracts, webhook keys and disputes/refund/payout rules. | Signed idempotent event handling, duplicate/out-of-order/replay tests, reconciliation to provider and ledger, real refunds/chargeback outcomes; never derive entitlement from browser redirect. |
| Child/guardian access and community (SAF-01, M09, M18) | Qualified Ghana legal/privacy/safeguarding sign-off on all **eight** controls; proportionate verified age and guardian authority, purpose-scoped revocable consent, minimised child identity, trained incident response and new independently reviewed migration. No unsupervised child–adult chat. | Database/API fail closed on false/expired/disputed consent; revocation, tenant separation, moderation/escalation, accessibility and safety drills. Current three child flags and DB CHECK constraints stay **false** until that separate approved implementation exists. |
| Notifications, desktop/offline, career, admin, analytics (M14–M17, M19) | Approved sender, consent/quiet hours; signed Electron build/update and local-device policy; verified opportunities; restricted admin MFA/audits; privacy-conscious aggregates. | Provider-confirmed delivery, offline conflict/reconnect with server-authoritative credit, secure updates/IPC, audit/recovery and non-coercive reporting. |

These rows **do not change feature status**. The single source of truth remains [FEATURE_REGISTER.md](FEATURE_REGISTER.md), with a unique ID, acceptance evidence and applicable manual/automated gates for each slice. The [eight-phase delivery plan](DELIVERY_PLAN.md) sequences all 19 modules; a compiled screen or browser simulation never counts as a real integration. Child release is a **legal, operational and data-model decision**, not an `.env` edit.

## 6. Go/no-go, rollback and evidence

**Go/no-go checklist for each approved release:** exact source SHA and signed-off diff; staging and real-provider tests; non-destructive migration/backup and isolated restore; named owners and cost alert; approved content, legal privacy/contact/commercial copy; required human/AT usability and security review; scoped roles, CSRF/cookie/tenant/abuse tests; DNS/HTTPS/no-bypass review; release-window monitoring/incident and rollback plan. Record **expected and observed** values in the [evidence worksheet](DEPLOYMENT_EVIDENCE_TEMPLATE.md), then update the relevant feature entry. If any required gate fails, **do not widen access** or mark `VERIFIED_COMPLETE`.

**If something breaks:** freeze new enrolment/ingress, preserve logs without personal payloads, inform owners and classify severity; for adult-only internal API, a reviewed IaC change can set `PILOT_ENABLED=false` and `ENGINE_V2_ENABLED=false` without erasing records. Do not delete the database, run test `TRUNCATE`, force-push Git or roll back an additive migration blindly. Restore into an isolated database and reconcile before a controlled cutover; revert only to code compatible with the migrated schema. Public static assets can return to a prior approved artifact without routing users to the private API. Child-safety and payment incidents require their trained/legal/provider escalation plans, not a fake success notice. Railway's deploy healthcheck gates startup but is **not continuous availability monitoring**. Railway healthchecks [9](https://docs.railway.com/deployments/healthchecks).

**Immediate next outcome (29 October):** the owner-approved read-only Render guide is live at `62cbf7b…` and real GitHub CI/hosted HTTP/browser checks passed. Complete Section 2's **private Railway dashboard** review for the new SHA: owner removed a briefly added public domain (its former URL now returns edge 404), but other app/DB networking, flags, private health/migrations and backup remain unverified. Remove the expired GitHub deploy key from Settings; protect `main`, configure the GitHub `public-guide` environment and Render deploy-hook secret **in the owner account** for future manual promotion. Finish FND-01 manual AT/usability/security/legal review before calling the full feature `VERIFIED_COMPLETE`. Paid private staging, public adult access, real AI and restoration drills remain blocked, not silently completed. See [Render setup](RENDER_DEPLOYMENT.md) and [CI/CD](CONTINUOUS_DELIVERY.md).
