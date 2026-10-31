# Dependency-audit remediation — local verification, 31 October 2026

**Scope and authorisation:** This is a local follow-up to [the original project-core result](LOCAL_RESULTS_2026-10-31.md), which accurately recorded a then-failing 15-moderate full-lockfile audit. No source was pushed, hosted, migrated on Railway or enabled for real adults/minors. The owner approved local work only. The public static guide remains the last observed hosted `62cbf7b…` release; a local build is not a hosted receipt.

## Change and compatibility boundary

- Replace ESLint 8's legacy `.eslintrc.cjs` with ESLint 10 flat config (`eslint.config.js`) and pinned ESLint `10.14.0` / `@eslint/js` `10.0.1` / TypeScript ESLint parser+plugin `8.72.1` / React Hooks plugin `7.1.1`. The prior two Hooks recommended levels (`rules-of-hooks:error`, `exhaustive-deps:warn`) were checked against old plugin `5.2.0` and retained.
- Replace `eslint-plugin-jsx-a11y@6.10.2` with MIT `eslint-plugin-jsx-a11y-x@0.2.0` ([upstream](https://github.com/es-tooling/eslint-plugin-jsx-a11y-x)). Both old and new recommended presets have **34 identically named/equally severe rules** after plugin-prefix mapping; the *pre-existing* exception `anchor-is-valid:off` remains explicit. This is lint-source parity, **not** WCAG certification or a manual accessibility review. New `scripts/check_lint_contract.mjs` is part of `npm run lint`: it checks all 34 configured severities, both Hook levels, two TS safety rules and actual rejection of five isolated invalid TSX fixtures (alt text, click keyboard, label association, conditional hook and `any`). This prevents silent removal of the accessibility lint gate on later upgrades.
- Pin published `minimatch@11.0.3` for the whole dependency tree with an npm override; keep the earlier *scoped* production `@fastify/static` → `glob@14.0.3` override. `npm ls minimatch glob eslint eslint-plugin-jsx-a11y-x --all --depth=5` reported the patched, consistently installed dependency tree, with no invalid links. A different `file:` override **failed** compatibility in an excluded scratch probe and was **not** applied. The two major-version overrides still warrant independent review; local static HTTP/browser, server and real lint-rule executions below test the relevant use paths, not all third-party behaviour.
- Registry metadata on this date showed the fork `0.2.0` as MIT; its lockfile integrity is `sha512-O/VpKt2G38VCMlBgGCH8eJGWXM05z892zGKeuPfPATMPLDZOWeVtKS8SBt98ElaeFRKcJEv2bELub+Llo3m9zw==`. The patched minimatch `11.0.3` integrity is `sha512-iny/40PEGkNJQ5/Pv6z3nm6FbRAby32GeZRjCUJk2WnNDbgPSTcdI+DDvLqsgBdD4cD5sMtMheqPPnehCCa8Nw==`. These hashes identify the lockfile packages, not independent code audits.

## Executed on current lockfile, Node 22.23.4 / PostgreSQL 17.11

| Gate | Observed local result |
|---|---|
| `npm ci --ignore-scripts` (Node 22), `node --check eslint.config.js`, `npm ls minimatch ...` | Installed correctly; config loaded and dependency tree resolved. After adding the npm lint-contract script, a **final fresh `npm ci --ignore-scripts` rerun** installed 440 packages and found 0 vulnerabilities; lint, typecheck and both audits then passed again with unchanged source/lockfile hashes. |
| `npm audit --audit-level=low` and `npm audit --omit=dev --audit-level=low` | **0 vulnerabilities in each**, exit 0, after replacing the old dev lint chain. Full audit was **not** suppressed or changed to production-only in CI. These results are point-in-time and must be rerun before any future release. |
| `npm run lint`, `npm run typecheck` | Both passed. `npm run lint` now also prints `Lint boundary verified: 34 recommended JSX accessibility rules, React Hooks and TypeScript checks execute.` The five negative fixtures confirmed actual rule execution; they are not product UI. |
| `npm test`; `npm run build:all` | **25/25** frontend; server and combined public release build passed. Bundle verifier still saw 44 metadata-only draft course outlines / 12 chunks and no known simulated workspace or draft answer text. |
| `python3 scripts/build_public_catalog.py --check`; `python3 scripts/generate_render_routes.py --check`; `python3 -m unittest discover -s scripts/tests -v` | Catalogue/routes checks and **9/9** Python tests passed. |
| `npm run build:render-public`; `npm run test:render-public`; `npm run test:render-deploy` | Isolated public artifact verifier passed (44 outlines, 11 style/script/font files; no private chunks); local static HTTP **1/1** and deploy-hook **stub** **3/3** passed. Stub responses are not hosted deployment evidence. |
| `npm run test:server` with four distinct **new** loopback-only disposable PostgreSQL DBs | **31/31 passed, 0 failed, 0 cancelled, 0 skipped**, including live local HTTP/DB owner, PNG and immutable-revision checks. The previously tested optional 005 approval/denial CLI and earlier hashes are in the original local result; no real DB was touched. |
| `npm run test:e2e`; `npm run test:e2e:render-public` | An initial browser run **failed 24/24** at *browser launch* because this refreshed sandbox lacked `libnspr4.so`; no browser assertions ran in that failed attempt. After local Chromium OS dependency installation, the **rerun passed 24, 4 expected adult opt-in skips**; isolated-public desktop/mobile **6/6 passed**. Axe A/AA-tagged checks are not manual WCAG 2.2 AA evidence. No adult project-core UI exists to test. |
| `git diff --check` | Passed (no whitespace errors). |

**Change identity (SHA-256 of source files, before local commit):**

```text
4e31d30e5c09d0de71aa254d6eddff81ebde8e8666709e5505ca02319ea45a18  package.json
35a11195e6e7cf319e2c04ba23d8e8925b482704991e4c8258bbd2d5b6e99ce0  package-lock.json
d76218b1aebc79d951e9ce9a21fbb7c43ee07bae8e0c6fac6cc95d855443195a  eslint.config.js
8538da29cdbb9e2dd9b70af44642bfe95f9a873eafeeac6bb58919f98a98ebb0  scripts/check_lint_contract.mjs
```

**Status interpretation:** The specific full-dependency-audit QA failure is resolved **for this local source and date**. `STU-CORE-01` and the local `OPS-01` candidate may be `IMPLEMENTED_PENDING_TESTS`, **not** `VERIFIED_COMPLETE`: new GitHub CI/promotion and hosted/private security checks were **not run**; independent PNG/parser/override/DB-role, Ghana privacy/legal/retention/erasure, representative accessible editor/device work and all separately approved private-staging decisions remain open. Keep the project-core feature off on Railway and require separate owner approval before a push that might trigger Railway auto-deploy or any private ingress/deployment. The prior report's failed audit remains historical evidence, not the current audit result.
