# Historical owner-controlled GitHub `main` push handoff — 31 October 2026

> **SUPERSEDED — do not run these old self-push commands.** The owner changed the method and explicitly authorised a fresh temporary write-enabled SSH deploy key. The agent non-force pushed/read back `56411021c9505c9dd6179f5c4cb0d401c050c68a`, then destroyed its private half. [GitHub verify run 41246188703](https://github.com/Dennis-deve/desloop-academy/actions/runs/41246188703) passed; GitHub reports a Railway deploy for that SHA **before CI finished**, not a dashboard/flag/health check. The Render public guide still serves older `62cbf7b…`. **Owner: remove the write-enabled public deploy key** in repository Settings and inspect Railway immediately. This bundle's historic HEAD does **not** contain later local UI-02 recovery changes. Further pushes need separate owner approval/fresh secure auth. [Latest separated evidence](docs/evidence/project-core/GITHUB_VERIFY_AND_DRAFT_RECOVERY_2026-10-31.md).

**Historical instructions, not a current push receipt.** The owner chose to push the local work to `main` from a trusted machine with their own secure Git credentials, explicitly accepting that the existing Railway adult service may **auto-deploy before GitHub CI passes** (`checkSuites:false`). The agent has no GitHub write credential and did not push. No public Render promotion, adult ingress, 005 migration on Railway, minors, live AI, real-user stage or paid infrastructure is authorised by this source push. The last independently read remote `main` and `work/ai-gateway-v1` were both `62cbf7b95afce2768c368f824e35b3f3064330e8` before this handoff; **recheck them at push time**. If they changed, stop and review the divergence rather than force-push.

The separately supplied workspace file `Desloop-main-2026-10-31.bundle` is a **complete Git bundle** of the local `work/ai-gateway-v1` branch, including all previously unpublished local research, adult project-core API, audit remediation, the real data-only adult project client and this handoff. It contains no `.env`, temporary private SSH key or PAT. The current full commit SHA is available from `git bundle list-heads`; compare it with the SHA in the agent's handoff message. The bundle is a source artifact, not a deployment or test receipt.

## On your own trusted machine

Use a fresh checkout, a local copy of the downloaded bundle and **your existing secure Git authentication**. Do not paste a PAT, SSH private key, deploy hook, database URL or AI key into chat, issue history, files or command-line arguments. The older temporary deploy key was destroyed and cannot be reused. Never use `--force` or bypass branch protections.

```bash
git clone https://github.com/Dennis-deve/desloop-academy.git desloop-owner-review
cd desloop-owner-review
BUNDLE='/absolute/path/to/downloaded/Desloop-main-2026-10-31.bundle'
git bundle verify "$BUNDLE"
git bundle list-heads "$BUNDLE"
git fetch "$BUNDLE" refs/heads/work/ai-gateway-v1:refs/heads/local-desloop-candidate
git fetch origin main
EXPECTED_BASE=62cbf7b95afce2768c368f824e35b3f3064330e8
test "$(git rev-parse origin/main)" = "$EXPECTED_BASE" || { echo 'Remote main moved; STOP and review.'; exit 1; }
git merge-base --is-ancestor origin/main local-desloop-candidate || { echo 'Not a fast-forward; STOP.'; exit 1; }
git log --oneline --reverse origin/main..local-desloop-candidate
git diff --check origin/main...local-desloop-candidate
git diff --stat origin/main...local-desloop-candidate
# Review all changed source, licences and migrations before continuing.
CURRENT_REMOTE="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$CURRENT_REMOTE" = "$EXPECTED_BASE" || { echo 'Remote main moved while reviewing; STOP.'; exit 1; }
git push origin refs/heads/local-desloop-candidate:refs/heads/main
# Non-force push: GitHub rejects branch protection or a remote non-fast-forward.
git ls-remote origin refs/heads/main
git rev-parse local-desloop-candidate
```

Do **not** claim success unless the two final SHAs match. Send the resulting public commit SHA and GitHub `verify` run URL/status back for independent checking. No workflow dispatch for `publish_public` should be run solely because `main` changed; the existing public-only Render guide is manual and its currently observed receipt remains the older SHA until a separately approved release.

## Immediately after the push

1. Observe GitHub `verify` on `main`: full low-threshold npm audit, 31 frontend tests, four independent disposable server DBs/31 tests, fifth local-only real adult-browser DB/2 browser tests, build/source isolation, public-only HTTP/browser and changed workflow parsing. If anything fails, record the failing run rather than call it green. No CI database is a private hosted stage.
2. In the Railway **owner dashboard**, check the actually deployed source SHA, deploy state/logs, adult pilot/AI/minor and `PROJECT_CORE_ENABLED=false` flags, domain/TCP proxy inventory, actual private PostgreSQL/migration status, health and rollback controls. `005_project_core.sql` is **not** in automatic Railway migration; do not apply it there. Railway's former public URL returning edge 404 is not a full network audit.
3. Keep the Render public static guide's manually promoted SHA/hosted 200/404 boundary separate. The bundle includes a private lazy JSON client in the **combined** build; the isolated public-only Render build still excludes all adult chunks and API paths. No new public guide receipt is implied by GitHub source or Railway deployment.
4. Before any private adult browser access/staging/real person: separate owner approval for ingress, region, budget, verified adult identity, Ghana privacy/legal/retention/erasure, image parser/DB privilege/backup/security and representative accessibility/user testing. Minors, teacher/school, payments and live AI remain separately gated.

[Feature status](docs/FEATURE_REGISTER.md) · [dated local adult-client QA](docs/evidence/project-core/PROJECT_CLIENT_2026-10-31.md) · [CI/hosting runbook](docs/CONTINUOUS_DELIVERY.md)
