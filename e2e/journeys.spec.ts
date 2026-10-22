import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('public learning journey shows the ordered curriculum and a later course outline', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn it.');
  await page
    .getByRole('link', { name: /Explore learning/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your next skill');
  await page
    .getByRole('link', { name: /Browse courses/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Start with the basics');
  await expect(page.getByText('Showing 44 of 44 courses')).toBeVisible();
  await page.getByRole('combobox', { name: 'Stage' }).selectOption('6');
  await expect(
    page.getByRole('link', { name: 'Data Literacy and Responsible Data Use' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Data Literacy and Responsible Data Use' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Data Literacy and Responsible Data Use',
  );
  await expect(page.getByText(/Course 28 of 44/i).first()).toBeVisible();
});

test('learner can practise the first required lesson while optional projects give no pathway credit', async ({
  page,
}) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  await page
    .getByRole('link', { name: /Continue: Welcome to Desloop/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to Desloop');
  await page
    .getByRole('textbox', { name: 'How did you practise?' })
    .fill('I safely explored the course map and checked where to find help.');
  await page.getByRole('radio', { name: /Locate the course map, lessons, tasks/i }).check();
  await page.getByRole('button', { name: /Check practice and answer/i }).click();
  await expect(page.getByText('Completed · demo')).toBeVisible();
  await page.goto('/app/projects/toolkit');
  await page
    .getByRole('textbox', { name: /Describe your work/i })
    .fill('I made a useful digital toolkit with a checklist for safer everyday tasks.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/Latest local record/i)).toBeVisible();
  await page.goto('/app/learn/course-02/c02-l1');
  await expect(page.getByRole('heading', { name: /Lesson locked in the demo/i })).toBeVisible();
});

test('teacher programme application validates and confirms local-only submission', async ({
  page,
}) => {
  await page.goto('/apply/teacher');
  await page.getByRole('button', { name: /Preview application/i }).click();
  await expect(page.getByText('Enter your name')).toBeVisible();
  await page.getByRole('textbox', { name: /Full name/i }).fill('Ama Teacher');
  await page.getByRole('textbox', { name: /Email address/i }).fill('ama@example.com');
  await page
    .getByRole('textbox', { name: /Teaching or professional background/i })
    .fill('I teach digital literacy and create practical learning activities.');
  await page.getByRole('textbox', { name: /Areas of expertise/i }).fill('Digital literacy');
  await page
    .getByRole('combobox', { name: /Learners you plan to support/i })
    .selectOption('Adults');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Preview application/i }).click();
  await expect(page.getByRole('heading', { name: /Preview submitted/i })).toBeVisible();
  await expect(page.getByText(/No application has been delivered/i)).toBeVisible();
});

test('school admin can create a local class without a real school account', async ({ page }) => {
  await page.goto('/demo');
  await page
    .getByRole('button', {
      name: /^School administrator Institutional learning management Open preview/,
    })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo Learning School');
  await page.goto('/school/classes');
  await page.getByRole('button', { name: /Create demo class/i }).click();
  await page.getByRole('textbox', { name: /Class name/i }).fill('New Makers C');
  await page.getByRole('textbox', { name: /Level or age band/i }).fill('Junior high');
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New Makers C' })).toBeVisible();
  await expect(page.getByText(/Sample tenant data only/i)).toBeVisible();
});

test('mobile navigation and key pages do not overflow horizontally', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport check');
  for (const route of ['/', '/courses', '/teachers', '/schools', '/apply/school', '/pricing']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `Overflow on ${route}`).toBeLessThanOrEqual(1);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'For schools' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A stronger way to learn');
});

test('mobile role switching is discoverable in the workspace drawer', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Drawer is only shown below the desktop breakpoint');
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  await page.getByRole('button', { name: 'Open workspace menu' }).click();
  await page.getByRole('combobox', { name: 'Preview workspace as' }).selectOption('school_admin');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo Learning School');
  await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).not.toBeVisible();
});

test('offline lesson copy can be deleted with the local-data reset', async ({ page }) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  await page.goto('/app/learn/digital-confidence/files-folders');
  await page.getByRole('button', { name: /Save offline/i }).click();
  await expect(
    page.getByText(/Lesson text saved to this browser for offline reading/i),
  ).toBeVisible();
  await page.goto('/app/offline');
  await expect(page.getByRole('heading', { name: 'Find and organise your files' })).toBeVisible();
  await page.goto('/workspace/settings');
  await page.getByRole('button', { name: 'Reset local data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByText(/Local demo data and offline lessons cleared/i)).toBeVisible();
  await page.goto('/app/offline');
  await expect(page.getByRole('heading', { name: 'No lessons saved yet' })).toBeVisible();
});

test('a wrong-role route offers a switch rather than displaying admin work', async ({ page }) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  await page.goto('/admin/applications');
  await expect(page.getByRole('heading', { name: /Choose a workspace to explore/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Review with care/i })).toHaveCount(0);
  await page.getByRole('button', { name: /Platform administrator.*Open preview/i }).click();
  await expect(page.getByRole('heading', { name: /Review with care/i })).toBeVisible();
});

test('guardian linking stays unverified while safety choices persist locally', async ({ page }) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Parent \/ guardian Support a linked learner Open preview/ })
    .click();
  await page.getByRole('button', { name: 'Preview learner linking' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Real linking needs verified guardian identity',
  );
  await page.getByRole('textbox', { name: 'Sample learner code' }).fill('DEMO-LEARNER');
  await page.getByRole('dialog').getByRole('button', { name: 'Record local request' }).click();
  await expect(page.getByText(/No learner was linked/i)).toBeVisible();
  await page.goto('/parent/safety');
  await expect(page.getByText(/Local request preview recorded; not verified/i)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Age-appropriate community preview' }).check();
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Age-appropriate community preview' }),
  ).toBeChecked();
  await expect(page.getByText(/not verified guardian consent/i)).toBeVisible();
});

test('facilitator can author a validated local draft without publishing it', async ({ page }) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Facilitator Course creation and teaching Open preview/ })
    .click();
  await page.goto('/facilitator/courses/new');
  await page.getByRole('button', { name: 'Submit local review state' }).click();
  await expect(page.getByText('Add a descriptive title')).toBeVisible();
  await page.getByRole('textbox', { name: /Course title/i }).fill('Helpful digital habits');
  await page.getByRole('textbox', { name: /Subject/i }).fill('Digital literacy');
  await page
    .getByRole('textbox', { name: /Learning objectives/i })
    .fill('Learners can organise files and explain their naming choices clearly.');
  await page
    .getByRole('textbox', { name: /Practical project outcome/i })
    .fill('Create a digital file guide');
  await page.getByRole('textbox', { name: 'Module 1 title' }).fill('Organise everyday files');
  await page.getByRole('textbox', { name: 'Lesson title' }).fill('File names and folders');
  await page
    .getByRole('textbox', { name: 'Lesson outline' })
    .fill('Practise meaningful file names and arrange related files in a clear folder structure.');
  await page
    .getByRole('textbox', { name: 'Knowledge check question 1' })
    .fill('What helps you find a file next week?');
  await page
    .getByRole('textbox', { name: /Practical assignment/i })
    .fill('Build a simple folder plan and explain it.');
  await page.getByRole('button', { name: 'Submit local review state' }).click();
  await expect(page.getByText(/No reviewer was notified/i)).toBeVisible();
  await page.goto('/facilitator/courses');
  await expect(page.getByRole('heading', { name: 'Helpful digital habits' })).toBeVisible();
  await expect(page.getByText(/cannot change either catalogue or bypass publication review/i)).toBeVisible();
});

test('a quiz failure and a project review gate prevent skipping Course 01', async ({
  page,
  isMobile,
}) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  const practice =
    'I completed a supervised example, checked my result and described one change I made.';
  for (let index = 1; index <= 4; index++) {
    await page.goto(`/app/learn/course-01/c01-l${index}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('textbox', { name: 'How did you practise?' }).fill(practice);
    const correctOptions = [2, 0, 1, 2]; // Derived from the checked-in draft item bank.
    await page
      .getByRole('radio')
      .nth(correctOptions[index - 1])
      .check();
    await page.getByRole('button', { name: /Check practice and answer/i }).click();
    await expect(page.getByText('Completed · demo')).toBeVisible();
  }
  await page.goto('/app/assess/course-01');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Show what you can do.');
  const quizAnswers = [2, 0, 1, 2, 0];
  for (let index = 0; index < 5; index++) {
    const radios = page.locator('fieldset').nth(index).getByRole('radio');
    await radios.nth(index < 2 ? (quizAnswers[index] + 1) % 3 : quizAnswers[index]).check();
  }
  await page.getByRole('button', { name: /Score knowledge check/i }).click();
  await expect(page.getByText(/Latest attempt: 60%/i)).toBeVisible();
  await page.goto('/app/learn/course-02/c02-l1');
  await expect(page.getByRole('heading', { name: /Lesson locked in the demo/i })).toBeVisible();
  await page.goto('/app/assess/course-01');
  for (let index = 0; index < 5; index++) {
    await page.locator('fieldset').nth(index).getByRole('radio').nth(quizAnswers[index]).check();
  }
  await page.getByRole('button', { name: /Score knowledge check/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Submit evidence for human review.' }),
  ).toBeVisible();
  const assessmentAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(assessmentAxe.violations.map((issue) => issue.id)).toEqual([]);
  await page
    .getByRole('textbox', { name: /Describe your artefact/i })
    .fill(
      'I made a learning plan with a small goal and a weekly checklist using only fictional details.',
    );
  await page
    .getByRole('textbox', { name: /What did you test or change/i })
    .fill('I tested the schedule and made it more realistic.');
  await page
    .getByRole('checkbox', { name: /I checked that this description uses no personal details/i })
    .check();
  await page.getByRole('button', { name: /Send to demo review queue/i }).click();
  await expect(
    page.getByRole('heading', { name: /Your work stays in this course/i }),
  ).toBeVisible();
  await page.goto('/app/learn/course-02/c02-l1');
  await expect(page.getByRole('heading', { name: /Lesson locked in the demo/i })).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Open workspace menu' }).click();
    await page.getByRole('combobox', { name: 'Preview workspace as' }).selectOption('facilitator');
  } else
    await page.getByRole('combobox', { name: 'Preview another role' }).selectOption('facilitator');
  await page.goto('/facilitator/pathway-reviews');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Required pathway reviews');
  const reviewAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(reviewAxe.violations.map((issue) => issue.id)).toEqual([]);
  await page.getByRole('checkbox', { name: /Safety-critical checks passed/i }).check();
  await page
    .getByRole('textbox', { name: /Specific feedback for the learner/i })
    .fill('Your safe learning plan is clear; keep testing the weekly routine.');
  await page.getByRole('button', { name: 'Approve demo review' }).click();
  await expect(
    page.getByRole('heading', { name: 'No projects waiting in this browser' }),
  ).toBeVisible();
  if (isMobile) {
    await page.getByRole('button', { name: 'Open workspace menu' }).click();
    await page.getByRole('combobox', { name: 'Preview workspace as' }).selectOption('learner');
  } else await page.getByRole('combobox', { name: 'Preview another role' }).selectOption('learner');
  await page.goto('/app/learn/course-02/c02-l1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Digital devices');
  await page.goto('/app/courses');
  await expect(page.getByText('1 / 44 passed · demo')).toBeVisible();
});

test('younger teaching band adapts the lesson and disables demo community posting', async ({
  page,
}) => {
  await page.goto('/demo');
  await page
    .getByRole('button', { name: /^Learner Courses, projects, and learning progress Open preview/ })
    .click();
  await page.goto('/app/courses');
  await page.getByRole('combobox', { name: 'Teaching presentation' }).selectOption('early');
  await page.goto('/app/learn/course-01/c01-l1');
  await expect(page.getByText('Your teaching scaffold · Ages 6–8')).toBeVisible();
  await expect(
    page.getByText(/With a trusted adult, act out a fictional classroom routine/i),
  ).toBeVisible();
  await page.goto('/app/community');
  await expect(page.getByRole('button', { name: 'Create a post' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Replies/i }).first()).toBeDisabled();
  await expect(page.getByText(/posting and replies are disabled in this preview/i)).toBeVisible();
  await page.goto('/app/circles');
  await expect(page.getByRole('button', { name: 'Join demo circle' }).first()).toBeDisabled();
  await page.goto('/app/learn/course-02/c02-l1');
  await expect(page.getByRole('heading', { name: /Lesson locked in the demo/i })).toBeVisible();
});
