# Product requirements and delivery inventory

**22 October 2026 · living requirements baseline.** This is a build plan, not a claim of product readiness. The complete owner directive governs acceptance; this file groups its requirements without deleting any. Each group has an ID in [the authoritative feature register](FEATURE_REGISTER.md). Split groups into smaller IDs before independently implementing them.

## Non-negotiable product rules

- One **44-course** ordered curriculum from digital foundations to an integrated capstone. Adapt examples, pace and access needs, **never** skip required outcomes or unlock Course N+1 without a server decision. Default policy: quiz average ≥80%, project rubric ≥70%, safety checks and assigned human approval where required; authorised operators version changes. Draft content and proposed GES/Cambridge/Oxford hints are not accreditation.
- Learn → guided practice → independent work → feedback → revision → mastery → advance. An offline action cannot grant completion until reconciled and checked by the server. Practice playgrounds have no graded-course authority.
- Do not publish simulated accounts, dashboards, AI, payments, messages, earnings, applications, schools, achievements or child access as working features. A unavailable operation must have an honest state or no action, not a fake success. No invented prices, contacts, partners, credentials or legal terms.
- Ghana-first, internationally extensible; WCAG 2.2 AA target with manual assistive-technology review. Safeguarding, verified guardian authority, child-data minimisation and qualified legal/privacy approval precede **all** real minor access. No public-child enrolment is authorised by this plan.
- Persuasion serves learner autonomy and mastery: optional plans/reminders, real progress, actionable feedback, no punitive streaks, deceptive urgency, fake social proof or public child rankings.
- Keep the owner's five supplied brand JPEGs and the two supplied curriculum/strategy PDFs as source references. Images in the repository remain the public identity. The PDFs are source material, **not** an endorsement or official standards mapping.

## Inventory and intended outcomes

| ID | Area | Required capabilities (none inferred as already released) |
|---|---|---|
| M01 | Public discovery | Brand, accessible landing, searchable real course outline/detail, age-appropriate pathway explanation, methodology, about/help/contact, school/partner information, consent-safe gallery, reviewed policies, low-bandwidth and availability information. |
| M02 | Identity/onboarding | Invitation or approved registration, sign-in/recovery, age/guardian gating, profiles/goals/diagnostics, roles, session/device controls and privacy centre. |
| M03 | Curriculum/progression | 44 courses, objectives/lessons/prerequisites, versioned policy, assessments/projects, ordered server unlocks, remediation, history, verified credential rules, competency mapping/roadmap/audit. |
| M04 | Lessons | Accessible text/media/diagrams, guided/independent practice, notes/bookmarks, checks, glossary/revision, facilitator resources, printable/approved offline materials. |
| M05 | AI teaching | Provider-neutral tutor/drafts/hints/explanations/plans/debugging, reviewed publication, moderation, usage/rate limits, failure fallbacks, language and human escalation. |
| M06 | Projects/tools | Guided/safe coding and visual tools, isolated code execution, templates/milestones, submissions/rubrics/revision/history, peer review where safe, private portfolio/capstone/export. |
| M07 | Assessments | Question banks, lesson/module/course checks, configured pass thresholds, accommodations, feedback/retakes, graded projects, appeals, interruptions, audit/analytics/verified completion. |
| M08 | Learner experience | Clear next step, accurate saved progress/history, optional calendar/reminders, notes, goals/reflection, skill passport, milestones and recovery without coercion. |
| M09 | Community | Age-separated profiles/circles/groups/Q&A/comments/sharing, reporting/moderation, block/mute, guardian settings, trained escalation and privacy-consented publication. |
| M10 | Teachers/facilitators | Assigned learners/classes, delivery/attendance/assignments/grading, intervention, schedules/resources/reports/templates/training. |
| M11 | Schools | Reviewed application/activation, tenant-isolated teachers/classes/imports/enrolments/assignments/calendar/billing/reports, guardian boundaries, multi-campus, support/export/closure. |
| M12 | Teacher partners | Verified partner onboarding, attribution, eligible engagement, approved configurable commissions, statements/payouts/reconciliation/disputes/fraud/audit/training. |
| M13 | Payments | Approved plans, MoMo/cards, server-verified checkout/webhooks/idempotency, receipts/refunds/renewals/entitlements/cancellation, scholarships/sponsorship/commission reconciliation. |
| M14 | Offline/desktop | Secure Electron shell, approved downloads/local work/queue, conflict-aware sync/status/recovery, shared device/export/deletion, safe updates/signing/notifications. |
| M15 | Notifications | Preference-controlled inbox and channels, delivery outcomes, quiet hours, course/review/payment/sync/guardian alerts, history and opt-outs. |
| M16 | Career/entrepreneurship | Skills/career paths, CV/interview/teamwork, idea lab, capstone/portfolio/micro-credentials/opportunities/alumni and consented vetted mentors. |
| M17 | Administration | Role/content/school/partner/billing management, approvals, moderation/support, audit/analytics/feature flags/incidents/retention/health/release/backups. |
| M18 | Security/safety/privacy | Identity/RBAC/MFA/recovery, consent/child safety, session controls, abuse/uploads/AI, access audits, retention/erasure, incident response, testing and reviews. |
| M19 | Learning quality | Mastery/project/assessment/content evidence, facilitator/school reports, accessibility/AI quality tracking, cost evaluation and privacy-conscious research. |

## Primary user stories and rollout boundary

- **Visitor:** I can inspect accurate draft course information and learn availability, without being asked to sign up for unavailable services. No local progress or false completion is created by reading a catalogue.
- **Invited adult learner (private only):** I can use a real server-issued session, submit required work, understand why a course is locked, receive authorised review, and resume server-saved progress. The content remains an unpublished rehearsal.
- **Assigned adult reviewer (private only):** I can see only assigned submissions and make audited decisions. A browser-chosen role cannot review.
- **Guardian/minor:** No live account or contact workflow until approved identity, authority, consent, policy and safeguarding operations exist; explain this honestly without collecting evidence prematurely.
- **School/partner/billing/AI users:** Their real workflows remain unimplemented, not simulated; enable only after tenant/provider/security and human approvals are satisfied.

## Delivery order and acceptance

P1 foundation: release boundary (no fake routes or answer leakage), then secure adult account/session/recovery and authorisation. P2 verified curriculum/learning/assessments. P3 AI and safe labs. P4 schools/guardians/teachers. P5 commercial. P6 offline/desktop. P7 community/career/analytics. P8 security, accessibility, restore and operational release gate. This is **sequencing, not scope deletion**. Each feature must pass the 18-step gate in [FEATURE_REGISTER.md](FEATURE_REGISTER.md) before `VERIFIED_COMPLETE`; a missing external provider keeps its feature blocked. The Railway environment currently named `production` is **domainless synthetic-only internal infrastructure**, not public or minor production approval.
