# Applied HCI and ethical persuasive design

This is an implementation standard and audit prompt, **not** evidence of representative-user testing. The first shipped vertical slice is read-only discovery for first-time visitors; the separate adult pilot remains internal. See [FND-01](FEATURE_REGISTER.md) for its actual QA state.

## Task-centred flow for a new visitor

**Goal:** understand the single draft 44-course sequence without accidentally starting an unavailable account or giving up personal information. **Flow:** short home explanation → Courses (search/stage) → outline of a course → Availability. The primary action is descriptive and real; the course page says it cannot enrol or save progress. Empty search offers one reset action. All direct URLs to old fake sign-up, payment, school and child workspaces lead to a recoverable unavailable state, with HTTP 404 on the built server. The current adult API status is checked via a real same-origin endpoint; failure is explicitly unknown, never treated as active.

| Principle | Concrete rule and current application | Evidence still needed |
|---|---|---|
| Nielsen: status, match, recovery | Loading/unavailable/inactive API text; 'course outline' not 'completed course'; reset search and real home link. No invented success. | Observe first-time users; verify ambiguous terms and retry comprehension. |
| Norman: signifiers, mapping, constraints | Labelled native search/stage filter, three clear nav links, real route focus, server denies simulated endpoints. | Keyboard and AT user walkthrough, direct URL behaviour in a built browser. |
| Cognitive load / Hick / progressive disclosure | One main course action; three navigation choices; optional age-adaptation notes in `<details>`. Availability and child restriction remain visible, never hidden. | Timed task/error observations across age/experience groups. |
| Fitts / Gestalt | 44px+ interactive targets, spaced header/actions, aligned course numbers and stages. | Touch testing on actual devices and zoom/reflow at 200–400%. |
| UDL / age appropriateness | Draft age-specific explanations without changing sequence or allowing child access; text-first, no unsafe upload or public work. | Approved accessible lesson/media/accommodation design and learning efficacy studies. |

## Persuasion without coercion

Autonomy: no forced signup, reminders or streaks; a visitor chooses a course to inspect but earns no progress. Competence: future feedback must identify attempt, reasoning and next revision, and only server-approved evidence can advance. Relatedness: no community interaction for children before guardianship, moderation and consent. The catalogue's '44' and order are actual draft metadata, not artificial progress; no countdowns, popularity, fabricated testimonials, scarcity, nudging child purchases or hidden opt-outs. Future goals/revision reminders are opt-in, quiet-hours aware, editable and non-punitive. Measure mastery, project quality, task clarity and accessibility rather than clicks or streaks.

## UI review checklist for each future feature

Name primary user and task; make status and next step visible; reduce irrelevant choices without hiding informed consent; prevent errors; preserve recoverable input; support cancel/back/retry; show real persistence and accurate progress; choose native semantic controls and manage focus; test 320px through desktop, 200–400% reflow, keyboard, reduced motion, screen reader and plain-language comprehension; reject manipulative reward or billing patterns. Record actual observations in the [feature register](FEATURE_REGISTER.md). No manual AT/usability study has yet certified FND-01.
