# Deployment verification worksheet — blank template

**Do not commit a filled copy to this public repository.** Copy it to a restricted operator record before entering deployment IDs, screenshots, domain details or names. Never paste tokens, database URLs, invitation codes, personal rows, raw request bodies or guardian evidence. This is an **unexecuted template**, not proof of a pass; [FEATURE_REGISTER.md](FEATURE_REGISTER.md) is the only feature-status register. Procedure: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## A. Scope and provenance (fill before touching a service)

- UTC observation time: ______
- Operator / second reviewer (record privately): ______ / ______
- Target account/project/environment/app: ______ / ______ / ______ / ______
- Purpose: ☐ read-only private verification ☐ approved staging ☐ approved public release
- Source repository and reviewed commit SHA: ______ (guide's initial baseline: `7c957d081287aff30fc18f6b3ec56b58f1be671c`)
- GitHub `main` SHA actually observed: ______
- Railway app deployment ID and **source commit SHA** actually observed: ______ / ______
- Railway deployment status and timestamp actually observed: ______ / ______
- IaC plan reviewed; additions / changes / deletions / networking differences: ______ / ______ / ______ / ______
- Explicit approval for spending, new ingress, IaC apply or real data (if proposed): ______

## B. Private synthetic-only baseline — record actual values, never infer

| Check | Expected for **existing private** stage | Observed (blank until tested) | Evidence reference / UTC / reviewer |
|---|---|---|---|
| App + database | `desloop-academy` and `Postgres` in correct project/environment; both in approved synthetic region | ______ | ______ |
| Deployed source | Approved `main` SHA, not just `SUCCESS` on an older commit | ______ | ______ |
| Build/pre-deploy | Node 22 build gate passed; `engine:migrate` succeeded; health startup passed | ______ | ______ |
| Networking | **0** app public/custom domains; **0** DB public TCP proxies; private DB reference | ______ | ______ |
| Runtime | `NODE_ENV=production`; `APP_ORIGIN` still closed; both adult flags and draft acknowledgments on | ______ | ______ |
| Child hold | All three minor feature flags **false**; DB gate fields **false**, eight controls `not_ready` | ______ | ______ |
| AI-01 hold (if source includes it) | `AI_GATEWAY_ENABLED=false`, `AI_ADMIN_UI_ENABLED=false`, `AI_LIVE_TESTS_APPROVED=false`; **no** migration 004, real provider key/call, enabled AI route or public AI endpoint | ______ | ______ |
| Synthetic database | 44 courses; previously zero adult accounts—record actual count, investigate any change without deletion | ______ | ______ |
| Public routes (GET) | Real course outline 200; retired `/demo` and `/register` 404; unknown course 404 | ______ | ______ |
| Private API (GET) | Health 200 + `adult-internal-pilot`; status enabled; anonymous pathway and guardian readiness **401**; AI admin access and `/pilot/ai/admin` **404 while AI flags are off** | ______ | ______ |
| Access hygiene | No personal records/invitations created; CLI/SSH access inventoried and closed afterwards | ______ | ______ |

**Outcome of this private verification:** ☐ evidence reviewed and matches plan ☐ mismatch—access stays closed ☐ not attempted. Mismatch, incident owner, ticket and safe next step: ______. A match does **not** authorise public or real-user access.

## B2. Render-only observation (blank; use only after an owner actually creates services)

- Render workspace owner, linked repo/branch and reviewed GitHub SHA: ______
- Static site ID/actual `onrender.com` URL, deploy SHA/time and build command: ______ / ______ / ______ / ______
- Actual guide 200 checks, forbidden private/unknown 404 checks, published asset scan and headers: ______ / ______ / ______
- Public copy/legal/AT/security and usage-cost approval: ______
- Optional private Blueprint approval (region/paid compute and DB), pserv service ID, `ipAllowList: []`, no public/private-browser bypass: ______
- Optional approved migration 001–003 / AI 004 result and backup/restore proof; all AI/child flags closed until further gate: ______
- **If blank, do not claim Render hosted or the private admin browser-ready.** [Procedure](RENDER_DEPLOYMENT.md).

## C. Controls before any personal-data or public stage

| Gate | Acceptance proof to attach privately | Observed / owner / date |
|---|---|---|
| Legal/data controller | Ghana-qualified advice, controller registration/notice/rights/retention, Amsterdam transfer/location decision | ______ |
| Safeguarding | Qualified child privacy/guardian authority review, all eight controls, training and incident escalation **before** any child data | ______ |
| Backups | Scheduled volume backup/PITR as approved, independent logical copy, **restore into isolation** with counts/RPO/RTO | ______ |
| Identity | Verified adult account ownership/age, reviewer MFA, recovery, session revocation and abuse/rate-limit tests | ______ |
| Public boundary | Distinct public-only build; no `/pilot` JS/API or answer material, reviewed DNS/TLS/domain and **no bypass** to private API | ______ |
| Curriculum | Expert-approved immutable 44-course edition, protected assessment bank, versioned 80%/70% + safety/human review policy | ______ |
| School/tenant | Verified institutional/staff roles; cross-tenant denial and retention/closure test | ______ |
| Providers | Approved MoMo/card, AI, messaging/storage contracts/keys/budget and **real** signed/idempotent provider checks | ______ |
| Accessibility/security | Manual WCAG 2.2 AA task/AT/contrast/zoom review, representative users, independent threat review, pen/abuse tests | ______ |
| Operations | CI gate, branch protection, monitoring/cost alerts, named on-call, incidents, staged rollback/reconciliation plan | ______ |

## D. Go/no-go and follow-up

- Exact **slice/feature ID** from authoritative register: ______
- Applicable tests and evidence: ______
- Risks accepted by named accountable owners, with expiry: ______
- Any missing critical gate? ☐ yes → **NO GO** ☐ no → seek written approval
- Two-person release approval recorded privately: ______
- Release time, deployed artifact/SHA and live result: ______
- After-release observation and anomaly escalation: ______
- Non-destructive rollback / contingency rehearsed: ______
- Register evidence and status updated **only after actually completed**: ______

**If this worksheet is still blank, no new deployment or release is verified.**
