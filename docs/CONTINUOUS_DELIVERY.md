# CI/CD and real hosting handoff — read-only public guide first

**29 October 2026 · source/runbook until remote execution is independently observed.** The owner selected the genuine searchable 44-course **read-only** site as the first public release, continuous verification on changes, and **human-approved public promotion**. There is no invented enrolment, saved progress, adult login, AI result or course certificate on this static host. The working database-backed adult pilot remains private; paid private staging and a secure browser ingress were deferred. A personally held device does not make a GitHub secret, Render host or public web page private. Do not post tokens, deploy hooks, AI keys or database URLs in chat. Later rotation cannot undo earlier disclosure.

## What the new pipeline does (and does not do)

| Stage | Trigger / boundary | Proof required |
|---|---|---|
| Source integration | PRs targeting `main`, pushes to `main` and `work/**`, or owner dispatch | GitHub Actions job **`verify`** runs Node 22 install, Python catalogue/route checks, Zod/advisory audit, typecheck/lint, frontend 25 tests, both release-build isolation gates, local static HTTP and deploy-hook **stub** tests, server integration against **three different ephemeral PostgreSQL 17 databases**, and default + isolated-public desktop/mobile Chromium. CI has no Render/AI/Railway credentials. A green local run is **not** a hosted service. |
| Private adult staging | **No hosted stage yet.** CI uses only ephemeral synthetic databases; it never exposes the adult app or migrates Railway/Render. | Paid region, budget, lawful adult-data/access decisions and identity-aware private ingress need separate owner approval before creating any private service. |
| Public promotion | Only `workflow_dispatch` on **`main`** with explicit `publish_public=true`, after `verify`; optionally require the `public-guide` environment reviewer. Root `render.yaml` keeps auto-deploy **off**. | Environment-owned Render hook is checked against the exact static service ID and requested **full commit SHA**. A hook's 200/202 is only a *request*. The job waits for an independently fetched public `/release.json` SHA, checks real 200/404 boundaries and headers, then runs browser checks against the hosted site. A failing/queued build is **not** a release. Manual accessibility/copy/legal approval remains a separate gate. |

**Security maintenance on 29 October:** a fresh advisory affected Zod 3. The source now uses audited Zod 4.6.7+, adapts only the affected v4 validation shapes and reruns the connected permission/response suites. `npm audit --audit-level=low` found 0 vulnerabilities locally after the change. New advisories intentionally fail CI; they must be assessed, not suppressed by turning off the gate.

## 1. Before publishing to GitHub

1. Owner reviews the pending branch and source diff; GitHub `main` must be fetched and confirmed an ancestor before a **non-force** push. The previously shared GitHub PATs must not be reused; revoke them. For a temporary write-enabled repository deploy key, add **only its public half** in GitHub → repository **Settings → Deploy keys → Add deploy key → Allow write access**. Its private half stays out of Git/chat and is destroyed after use; remove the deploy key from GitHub after the push. If branch protection rejects a direct push, use a reviewed PR from the work branch; do **not** bypass protections or force-push.
2. Enable/check GitHub Actions and quotas in the owner's repository. After the new workflow has a **real green remote run**, protect `main` with required check **`verify`**, restrict direct updates/require owner review, and inspect workflow permissions (`contents: read`; no secrets on PR). YAML parsing and local tests alone do not prove Actions ran. Refer to [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [secure Actions use](https://docs.github.com/en/actions/reference/security/secure-use).
3. **Existing Railway:** its GitHub `main` source currently has `checkSuites: false` in `.railway/railway.ts` and may deploy **before** CI completes. It is a domainless, private, synthetic-only app but still needs independent health/config/rollback verification after any main push. The owner can pause Railway auto-deploy before the push or, **after** Actions is proven green and a reviewed Railway plan shows no destructive changes, separately approve/configure Railway's Wait for CI. Merely editing the IaC file is **not** applying it. The current source push never creates a public adult URL.

## 2. Create the public Render static site (owner's dashboard)

After source is actually on reviewed GitHub `main`, check the public wording, brand permissions, operator/contact decisions, Ghana-first privacy/legal obligations, included Render usage and public visibility. See the [detailed Render guide](RENDER_DEPLOYMENT.md) and [blank deployment evidence sheet](DEPLOYMENT_EVIDENCE_TEMPLATE.md).

1. Owner signs into Render and connects only the approved repository. Choose **New → Blueprint**, `main`, root `render.yaml`; inspect the proposed resources before applying. It must show **one static site**, `desloop-readonly-guide`, and **zero** adult services, databases, paid resources or wildcard SPA rewrites. A first site creation may start a public deployment immediately; create it **only after** approving public exposure. Root `render.yaml` leaves later auto-deploy **off**.
2. Copy the Render-provided **service ID** and the exact `https://...onrender.com` **origin** into the GitHub repository's **Settings → Environments → `public-guide`** as variables `RENDER_PUBLIC_SERVICE_ID` and `RENDER_PUBLIC_SITE_URL`. If the account plan permits, configure owner required reviewers and restrict the environment to `main` before adding secrets. A newly referenced GitHub environment can be created without protection: check its settings yourself ([1](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)).
3. In Render → that static site's **Settings**, find its deploy-hook URL. Add it **in the `public-guide` GitHub environment only** as secret `RENDER_DEPLOY_HOOK_URL` (not a repo file/chat message, not the adult service's hook). The workflow refuses a URL for another service and pins the Git SHA using Render's `ref` parameter; rotate the hook in Render if exposed ([1](https://render.com/docs/deploy-hooks)). No AI, Railway, billing or PostgreSQL key belongs in a static build or GitHub PR job.
4. To publish a reviewed later commit: GitHub **Actions → Verify source and approve public guide → Run workflow → branch `main` → `publish_public=true`**. The verify job must pass first. The promotion job then checks that remote `main` is still the dispatched SHA, submits the pinned hook request and confirms the actual hosted artifact and desktop/mobile 404/axe checks. Check the Render Dashboard's deploy ID, final state, exact commit, build log, URL, headers and billing separately. A GitHub **green** job is not a manual WCAG 2.2 AA or legal sign-off.

The public receipt contains only the source SHA and product kind. It is not a credential, access token or fabricated progress. For owner-run read-only verification after initial site creation:

```bash
RENDER_PUBLIC_SITE_URL='https://YOUR-ACTUAL-SITE.onrender.com' \
EXPECTED_PUBLIC_SHA='THE-FULL-PUBLISHED-GIT-SHA' npm run smoke:render-hosted
# After Chromium installation, with the same exact site URL:
RENDER_PUBLIC_SITE_URL='https://YOUR-ACTUAL-SITE.onrender.com' npm run test:e2e:render-hosted
```

Never substitute a guessed URL or call a deploy successful because a hook replied 200. If the source receipt never matches, private paths return 200, a browser test fails, or public copy is unapproved: stop promotion, inspect Render logs and roll back to a **previously verified** public commit using Render's owner dashboard; recheck exact routes and published SHA. No auto retry or hidden pass.

## 3. Repeat safely for each genuinely finished feature

Record its unique feature-register ID, acceptance/security/role criteria, migrations and tests; implement on a work branch; let `verify` run without real-user data; obtain an owner review before merging to protected `main`. The public static service does **not** auto-deploy when the branch changes; manually dispatch only when its public content and applicable quality gates pass. Private Railway may still auto-deploy on `main` until the owner changes that setting; inspect it independently. Do not turn on child accounts, AI providers, payments, schools or public adult access as a side effect of shipping a guide. The next private or public module needs its own real integration and approvals; a UI, CI receipt or future plan is not working functionality.

### Evidence still blank until owner action

| Gate | Actual remote evidence, not a planned result |
|---|---|
| GitHub branch and green `verify` run | **Not observed**; add SHA, run URL, time and reviewer after push. |
| Existing Railway after main push | **Not observed**; add deployed SHA, health, domain/proxy and disabled-flag verification. |
| Render account, Blueprint and public URL | **Not created/observed**; add owner, approved cost/visibility, service ID, URL. |
| Public hosted receipt + 200/404 + browser | **Not run**; add SHA, actual statuses and accessibility limitations. |
| Private staging / real AI / adult ingress | **Not authorised/deployed** under the current no-paid-staging decision. |
