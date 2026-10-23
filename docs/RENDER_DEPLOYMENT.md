# Render setup — public guide + separate private adult staging

**Source-only instructions, 23 October 2026. No Render service or database was created, deployed, billed, or verified by writing this guide.** The owner chose GitHub `main` and **both** a public course guide and an isolated private adult/internal path. This is **not** approval for new paid resources, personal data, external adult/child access, real AI calls, or public full-platform launch. [Feature register](FEATURE_REGISTER.md) remains authoritative; [AI runbook](AI_GATEWAY_RUNBOOK.md) describes separate provider gates. The last known Railway source must be checked separately: a push to `main` can trigger its existing auto-deploy, even though all AI flags stay false.

## 1. What is actually safe to look at

| Render component | Artifact/endpoint | Audience and status |
|---|---|---|
| **Public guide** | Root `render.yaml` → static `dist/render-public` from `npm run build:render-public` | A real branded read-only guide to 44 **draft** course outlines. No account, lesson unlock, answers, `/api` request, private `/pilot` chunk or child flow. Render assigns a **public** `onrender.com` URL after an owner actually creates the site; the URL is not a private preview. Copy/legal/AT review still applies before exposing it. |
| **Adult/internal** | `docs/RENDER_PRIVATE_STAGING.example.yaml` → optional **private service** (`pserv`) + distinct PostgreSQL | The template is deliberately non-deployable until paid plan and lawful data region are approved. It is **not** in root `render.yaml`. Even after approval, a private service has **no public browser URL**: the internal dashboard cannot be viewed in a normal browser without a separately approved identity-aware, same-origin HTTPS ingress. All adult/AI/child flags begin false; synthetic-only. |
| **AI-01** | Optional migration 004 and model verification (neither automatic) | No live provider. Leave `AI_GATEWAY_ENABLED`, `AI_ADMIN_UI_ENABLED`, and `AI_LIVE_TESTS_APPROVED` false. See the [AI runbook](AI_GATEWAY_RUNBOOK.md) before any approved synthetic call; do not paste a provider key into chat or source. |

Render documents static sites as public CDN services, while private services have no external address; static-site bandwidth and build minutes count against the workspace's included amounts, and private compute/databases can incur charges: [1](https://render.com/docs/static-sites) [8](https://render.com/docs/private-services) [1](https://render.com/docs/blueprint-spec). A free database is short-lived; it is not an approved backup policy: [18](https://render.com/docs/free).

## 2. GitHub source handoff (main requested)

1. Have a trusted repo owner review the exact pending commit(s), the unchanged child holds and the `render.yaml` diff. The earlier shared GitHub token must be revoked and **never reused**. Use your own GitHub browser/SSH/credential manager; never paste a token in this chat, shell transcript or README. If the workspace has no authenticated GitHub client, **the push has not happened**.
2. Confirm the remote main branch has not moved; fetch rather than force-push. On the reviewed local checkout, after authentication on your own device:

   ```bash
   git remote -v                               # expect Dennis-deve/desloop-academy
   git fetch origin main
   git merge-base --is-ancestor origin/main HEAD || { echo 'Main changed: review/rebase; do not force'; exit 1; }
   git status --short
   git log -1 --oneline
   git push origin HEAD:main                   # non-force, only after owner review
   git ls-remote origin refs/heads/main        # compare the SHA with HEAD
   ```

3. **Existing Railway impact:** GitHub `main` is connected to a domainless Railway app. A push may trigger a build/deploy there; its exact outcome is unknown until observed. Before and after pushing, check Railway deployment SHA, zero app domains/public DB proxies, closed `APP_ORIGIN`, child flags false, three AI flags false, status/404 smoke and any IaC drift per [deployment guide](DEPLOYMENT_GUIDE.md). This GitHub push is not proof of a Railway or Render deployment.

If you cannot authenticate in the Arena workspace, download the accompanying **`/home/user/desloop-ai-render-handoff.bundle`** (not tracked in Git), which contains the two unpublished commits and requires the last published `main` commit. On an **authenticated** computer, in a fresh clone of `https://github.com/Dennis-deve/desloop-academy.git`, after reviewing the bundle and source:

```bash
git fetch origin main
git fetch /path/to/downloaded/desloop-ai-render-handoff.bundle refs/heads/work/ai-gateway-v1
git log --oneline origin/main..FETCH_HEAD
git merge-base --is-ancestor origin/main FETCH_HEAD || { echo 'Remote moved: stop and review'; exit 1; }
git push --dry-run origin FETCH_HEAD:refs/heads/main
git push origin FETCH_HEAD:refs/heads/main   # non-force, triggers a possible Railway auto-deploy
git ls-remote origin refs/heads/main         # compare with the bundle's latest SHA
```

A changed `main`, rejected push or failed Railway deploy requires review; never force-push or interpret these commands as Render deployment. The bundle is a handoff, **not** a backup of any private database.

## 3. Owner-only Render public static-site setup

1. Review public wording and contacts (currently no public operator/contact confirmation), brand rights, draft labels, Ghana legal/privacy/accessibility obligations, Render workspace owner, included usage/charges and public visibility. A Render `onrender.com` address can be visited by anyone, even if shared with only one person. Do not connect the private adult service or database to that address. The public-only build intentionally provides an honest **unknown** private-service status rather than fetching it.
2. In Render, connect your GitHub account to **only the reviewed repository** if possible. Choose **New → Blueprint** and select `Dennis-deve/desloop-academy`, branch `main`, root `render.yaml`; review the proposed changes before applying. It must create **only one Static Site** named `desloop-readonly-guide`, **no** Postgres, web service, private service, public proxy or wildcard rewrite. The Blueprint sets auto-deploy **off**, so new pushes do not silently republish. Render automatically reads root `render.yaml` when you link a Blueprint; it can apply changes and redeploy if updated, so review every sync: [2](https://render.com/docs/infrastructure-as-code).
3. Before clicking **Apply/Create**, confirm Node **22** (`.node-version` and package engines), build command `npm ci --ignore-scripts && npm run build:render-public`, publish path `./dist/render-public`, 47 **exact** deep-link rewrites plus the automatic root index, security headers, and no `/* → /index.html`. Render recommends exact redirect/rewrite rules for client routing; broad `/*` would falsely serve `/pilot` and other unavailable routes: [22](https://render.com/docs/redirects-rewrites) [1](https://render.com/docs/blueprint-spec). Do not add API URL or `VITE_` credential variables.
4. **Only after the owner approves public visibility, copy and account/usage limits**, manually create/sync and deploy the static service; open its actual `https://...onrender.com` URL from the Render Dashboard. If Render refuses 47 exact rules, **stop** rather than switching to a wildcard. Before any custom DNS, verify the exact Render URL, published commit SHA and build output; leave the Railway private app without public domains. Render handles TLS for static sites: [1](https://render.com/docs/static-sites).
5. Use a trusted terminal for read-only HTTP acceptance. Substitute the actual Render-provided URL in your own shell; **do not invent a URL or claim success without responses**:

   ```bash
   SITE_URL='https://ACTUAL-OWNER-APPROVED-NAME.onrender.com'
   for path in / /courses /how-it-works /availability /courses/getting-started-with-learning-and-digital-confidence; do
     printf '%-73s' "$path"; curl -sS -o /dev/null -w '%{http_code}\n' "$SITE_URL$path"
   done
   for path in /pilot /pilot/ai/admin /api/pilot/status /api/health /register /checkout /demo /courses/not-a-real-course; do
     printf '%-73s' "$path"; curl -sS -o /dev/null -w '%{http_code}\n' "$SITE_URL$path"
   done
   # Expect 200 for the five guide paths, 404 for every private/unknown path.
   # Record actual response headers, commit SHA, time, owner and failures privately.
   ```

6. Check desktop/mobile branding, logo, 44 ordered outlines, course deep links, search/reset, age examples, keyboard navigation/skip link, 200–400% zoom and representative screen-reader tasks. The public page must **not** imply enrolment, credit, provider status or accreditation. If a forbidden route responds 200, a bundle leaks private chunks, or a status looks fabricated, stop and roll back/review. Automated checks are not a WCAG 2.2 AA sign-off. Render lets you redeploy a prior commit but rewrite/config differences still need inspection: [13](https://render.com/docs/rollbacks).

### Local checks before any Render change

```bash
# Node 22 for the actual Render build. Python 3 is optional for an independent local check.
# Use disposable loopback databases only for DB suites.
npm ci --ignore-scripts
python3 scripts/build_public_catalog.py --check      # optional independent check
python3 scripts/generate_render_routes.py --check   # optional generator check
npm run typecheck && npm run lint && npm test
npm run build:all                              # existing private build and safety gate
npm run build:render-public                    # physically separate static artifact
npm run test:render-public                     # exact-route local HTTP assertions
npx playwright install chromium               # optional browser install
# If Chromium lacks system libraries: npx playwright install-deps chromium (may require sudo)
npm run test:e2e:render-public                 # local public artifact, desktop/mobile Chromium
npm audit --audit-level=low
# Optional owner-authenticated Render CLI: render blueprints validate ./render.yaml
```

`render blueprints validate` requires a working Render CLI/workspace to check schema, plans and conflicts; source-only YAML generation and local tests do **not** constitute Render account validation: [1](https://render.com/docs/cli-reference).

## 4. Separate private staging setup — **not a browser link**

1. Name the Ghana legal/privacy/security/budget owner and explicitly approve another region and spend. Previous Amsterdam approval was for **Railway synthetic testing only**; Render does not provide an Amsterdam Postgres region in its listed regions. Choose and document a Render-supported region and paid compute/DB plan with the owner before changing the `REPLACE_...` values in a **separately reviewed copy** of `docs/RENDER_PRIVATE_STAGING.example.yaml`. Do not point Render at Railway's database, add an external DB allowlist entry, enable a public Render Web Service for the adult API, or run the disposable test TRUNCATE against any hosted database. The template uses `ipAllowList: []` to prevent external DB connections: [1](https://render.com/docs/blueprint-spec).
2. Create the **second** Render Blueprint explicitly from that reviewed private file (do not replace the root static one). Check the plan shows exactly one `pserv` plus a private-network database, on the same approved region, with auto-deploy off, Node 22, `HOST=0.0.0.0`, `PORT=10000`, closed `APP_ORIGIN`, and all adult, child and AI switches **false**. Public static and adult service must not share a build, domain or API proxy. The private service is testable from Render's owner-controlled Shell/internal network, not from an ordinary browser: [8](https://render.com/docs/private-services) [7](https://render.com/docs/private-network).
3. **Do not enable adult accounts yet.** First complete backups+isolated restore, verified same-origin identity-aware HTTPS ingress with no direct Render public bypass, reviewer MFA, age/privacy/legal and accepted origin/proxy/rate-limit threat review. Only then apply reviewed 001–003 migrations from an authorised private Shell/one-off operation with `PILOT_OPERATOR` and `ENGINE_DRAFT_ACKNOWLEDGED=true` (e.g. `npm run engine:migrate`); never reset an existing DB. After checking guardian controls remain closed, deliberate adult staging settings may be approved (`PILOT_ENABLED=true`, `PILOT_DRAFT_ACKNOWLEDGED=true`, `ENGINE_V2_ENABLED=true`, `ENGINE_DRAFT_ACKNOWLEDGED=true`, exact private HTTPS `APP_ORIGIN`). Any actual invited adult access remains **synthetic** until broader identity, content and legal gates pass. A private Render service on its own offers **no browser URL**, so do not promise that its UI is already viewable.
4. AI is a **later, separate** change: obtain each provider's account-specific lawful commercial/age/privacy/retention, exact model, quota/price and budget approval. Review and explicitly apply migration 004 in isolated synthetic staging (`AI_SCHEMA_MIGRATION_APPROVED=true ... npm run pilot:admin -- ai-migrate`) only after backup and approval. Grant AI admin only to an existing authorised adult reviewer; keep `AI_LIVE_TESTS_APPROVED=false` and models/budgets disabled by default. Provide `NVIDIA_API_KEY` and any other approved provider credential **only** through Render server-side secrets, never a static site, chat or GitHub. A separately approved charged synthetic authenticated result is required before any model can be treated as operational. Review 429/outage/fallback, costs, privacy and safeguarding, independent security and manual AT before any real adult AI exposure. No child access. See [AI runbook](AI_GATEWAY_RUNBOOK.md).

## 5. Other setups still outstanding

- A real, reviewed contact, privacy notice, Ghana controller/transfer position and publication copy; no fabricated GES/Cambridge/Oxford accreditation.
- Reviewed immutable 44-course curriculum, assessment question protections, verified identity/recovery, teacher/guardian authority and safety; no public sign-up yet.
- Future separate approved payment/MoMo-card, schools/tenant isolation, moderated community, notifications and offline/Electron mechanisms; this Render guide does not magically enable them.
- Evidence: use a restricted copy of [deployment worksheet](DEPLOYMENT_EVIDENCE_TEMPLATE.md) and update **only** [FEATURE_REGISTER.md](FEATURE_REGISTER.md) after actual hosted observations. Do not claim Render deployed because `render.yaml` or a Git commit exists.
