import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const [name, route, role] of [
  ['landing page', '/', null],
  ['course catalogue', '/courses', null],
  ['first course overview', '/courses/getting-started-with-learning-and-digital-confidence', null],
  ['school application', '/apply/school', null],
  ['learner dashboard', '/app', 'learner'],
  ['required first lesson', '/app/learn/course-01/c01-l1', 'learner'],
  ['required assessment overview', '/app/assess/course-01', 'learner'],
  ['pathway reviewer empty state', '/facilitator/pathway-reviews', 'facilitator'],
  ['school dashboard', '/school', 'school_admin'],
] as const) {
  test(`${name} has no detectable WCAG A/AA violations`, async ({ page }) => {
    if (role)
      await page.addInitScript(
        (demoRole) =>
          sessionStorage.setItem(
            'desloop-academy-session-v1',
            JSON.stringify({
              name: 'Alex Morgan',
              email: 'demo@local.invalid',
              role: demoRole,
              demo: true,
            }),
          ),
        role,
      );
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations,
      results.violations
        .map((issue) => `${issue.id}: ${issue.nodes.map((node) => node.target).join(', ')}`)
        .join('\n'),
    ).toEqual([]);
  });
}
