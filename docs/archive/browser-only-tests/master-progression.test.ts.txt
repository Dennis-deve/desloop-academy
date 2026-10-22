import { describe, expect, it } from 'vitest';
import { ageBands, finalChecks, lessonsFor, masterCourses, masterStages } from '@/curriculum/model';
import {
  COURSE_POLICY,
  allLessonsComplete,
  completedPrefix,
  courseState,
  latestQuiz,
  lessonAvailable,
  recordLesson,
  recordQuiz,
  requestRevision,
  reviewProject,
  rubricScore,
  submitProject,
} from '@/curriculum/progression';
import { freshCurriculumProgress, type CurriculumProgress } from '@/curriculum/state';

const first = masterCourses[0];
const second = masterCourses[1];
const practice = 'I tried a safe example, checked the result and explained my own choice.';
const reflection = 'I tested one step, noticed a problem and revised it.';
function finishLessons(progress: CurriculumProgress, course = first) {
  for (const lesson of lessonsFor(course)) {
    progress = recordLesson(
      progress,
      course.id,
      lesson.id,
      practice,
      lesson.check.correct,
      'typed',
    );
  }
  return progress;
}
function passedQuiz(progress: CurriculumProgress, course = first) {
  return recordQuiz(
    progress,
    course.id,
    finalChecks(course).map((check) => check.correct),
  );
}
function submit(progress: CurriculumProgress, course = first) {
  return submitProject(progress, course.id, practice, reflection, 'dictated-or-described', true);
}
function approve(progress: CurriculumProgress, course = first) {
  return reviewProject(
    progress,
    course.id,
    { project: 80, practice: 80, reflection: 80, safety: 80 },
    true,
    'Clear and safe work with evidence of testing.',
    'facilitator',
  );
}

describe('the required draft curriculum', () => {
  it('has 44 distinct ordered courses in nine contiguous stages, with four age presentations and 176 lesson outlines', () => {
    expect(masterCourses).toHaveLength(44);
    expect(masterStages).toHaveLength(9);
    expect(masterCourses.map((course) => course.number)).toEqual(
      Array.from({ length: 44 }, (_, index) => index + 1),
    );
    expect(new Set(masterCourses.map((course) => course.id)).size).toBe(44);
    expect(new Set(masterCourses.map((course) => course.slug)).size).toBe(44);
    expect(masterStages[0].first).toBe(1);
    expect(masterStages.at(-1)?.last).toBe(44);
    expect(
      masterStages.every(
        (stage, index) => index === 0 || masterStages[index - 1].last + 1 === stage.first,
      ),
    ).toBe(true);
    expect(masterCourses.reduce((sum, course) => sum + lessonsFor(course).length, 0)).toBe(176);
    for (const course of masterCourses) {
      expect(course.outcomes).toHaveLength(4);
      expect(course.modules).toHaveLength(4);
      expect(course.project.brief.length).toBeGreaterThan(30);
      expect(ageBands.every(({ id }) => course.ageAdaptation[id].length > 80)).toBe(true);
      expect(finalChecks(course)).toHaveLength(5);
      expect(
        finalChecks(course).every(
          (check) => check.options.length === 3 && check.correct >= 0 && check.correct <= 2,
        ),
      ).toBe(true);
    }
  });
  it('keeps later courses and lessons locked even when a caller supplies direct IDs', () => {
    const empty = freshCurriculumProgress();
    expect(courseState(first, empty)).toBe('current');
    expect(courseState(second, empty)).toBe('locked');
    expect(lessonAvailable(second, lessonsFor(second)[0].id, empty)).toBe(false);
    expect(lessonAvailable(first, lessonsFor(first)[1].id, empty)).toBe(false);
    expect(recordLesson(empty, second.id, lessonsFor(second)[0].id, practice, 0, 'typed')).toEqual(
      empty,
    );
    expect(recordQuiz(empty, second.id, [0, 0, 0, 0, 0])).toEqual(empty);
    expect(submitProject(empty, second.id, practice, reflection, 'typed', true)).toEqual(empty);
    expect(
      reviewProject(
        empty,
        second.id,
        { project: 100, practice: 100, reflection: 100, safety: 100 },
        true,
        practice,
        'facilitator',
      ),
    ).toEqual(empty);
    expect(completedPrefix(empty)).toBe(0);
  });
  it('does not count a wrong answer or missing practice, and keeps attempts for remediation', () => {
    const lesson = lessonsFor(first)[0];
    let state = freshCurriculumProgress();
    state = recordLesson(state, first.id, lesson.id, 'short', lesson.check.correct, 'typed');
    expect(state.lessonWork[lesson.id]).toBeUndefined();
    state = recordLesson(
      state,
      first.id,
      lesson.id,
      practice,
      (lesson.check.correct + 1) % 3,
      'typed',
    );
    expect(state.lessonWork[lesson.id]).toBeUndefined();
    expect(state.lessonAttempts[lesson.id]).toBe(2);
    state = recordLesson(
      state,
      first.id,
      lesson.id,
      practice,
      lesson.check.correct,
      'dictated-or-described',
    );
    expect(state.lessonWork[lesson.id].mode).toBe('dictated-or-described');
    expect(state.lessonAttempts[lesson.id]).toBe(3);
    expect(lessonAvailable(first, lessonsFor(first)[1].id, state)).toBe(true);
  });
  it('requires quiz, evidence, rubric, safety and reviewer; revision stays inside Course 01', () => {
    let state = finishLessons(freshCurriculumProgress());
    expect(allLessonsComplete(first, state)).toBe(true);
    expect(courseState(second, state)).toBe('locked');
    const correct = finalChecks(first).map((check) => check.correct);
    state = recordQuiz(
      state,
      first.id,
      correct.map((value, index) => (index < 2 ? (value + 1) % 3 : value)),
    );
    expect(latestQuiz(first, state)?.score).toBe(60);
    expect(courseState(first, state)).toBe('revision');
    expect(submit(state)).toEqual(state);
    state = recordQuiz(
      state,
      first.id,
      correct.map((value, index) => (index === 0 ? (value + 1) % 3 : value)),
    );
    expect(latestQuiz(first, state)?.score).toBe(COURSE_POLICY.quizMinimum);
    state = submit(state);
    expect(courseState(first, state)).toBe('review');
    expect(courseState(second, state)).toBe('locked');
    state = requestRevision(
      state,
      first.id,
      'Please test a different safe example and explain the change.',
    );
    expect(courseState(first, state)).toBe('revision');
    state = submit(state);
    state = reviewProject(
      state,
      first.id,
      { project: 60, practice: 80, reflection: 80, safety: 80 },
      true,
      'Add more project evidence before I can pass this work.',
      'facilitator',
    );
    expect(courseState(first, state)).toBe('revision');
    state = submit(state);
    state = reviewProject(
      state,
      first.id,
      { project: 80, practice: 80, reflection: 80, safety: 80 },
      false,
      'Please resolve the privacy and safety concern first.',
      'classroom_teacher',
    );
    expect(courseState(first, state)).toBe('revision');
    state = submit(state);
    state = approve(state);
    expect(courseState(first, state)).toBe('completed');
    expect(completedPrefix(state)).toBe(1);
    expect(courseState(second, state)).toBe('current');
    expect(courseState(masterCourses[2], state)).toBe('locked');
    expect(state.completions[first.id].humanReview).toBe(true);
    expect(state.completions[first.id].reviewer).toContain('Facilitator');
  });
  it('blocks submission if a safety-critical quiz item is missed despite an 80% total', () => {
    let state = freshCurriculumProgress();
    // Build a contiguous prefix of four demo passes so safety-sensitive Course 05 opens.
    for (const course of masterCourses.slice(0, 4)) {
      state = finishLessons(state, course);
      state = passedQuiz(state, course);
      state = submit(state, course);
      state = approve(state, course);
    }
    const safetyCourse = masterCourses[4];
    expect(courseState(safetyCourse, state)).toBe('current');
    state = finishLessons(state, safetyCourse);
    const checks = finalChecks(safetyCourse);
    expect(checks.at(-1)?.safetyCritical).toBe(true);
    state = recordQuiz(
      state,
      safetyCourse.id,
      checks.map((check, index) => (index === 4 ? (check.correct + 1) % 3 : check.correct)),
    );
    expect(latestQuiz(safetyCourse, state)?.score).toBe(80);
    expect(latestQuiz(safetyCourse, state)?.criticalPassed).toBe(false);
    expect(submit(state, safetyCourse)).toEqual(state);
    state = passedQuiz(state, safetyCourse);
    state = submit(state, safetyCourse);
    expect(courseState(safetyCourse, state)).toBe('review');
  });
  it('requires a contiguous version-matched completion prefix and does not make local status authoritative', () => {
    let state = approve(submit(passedQuiz(finishLessons(freshCurriculumProgress()))));
    expect(completedPrefix(state)).toBe(1);
    state = {
      ...state,
      completions: {
        ...state.completions,
        [first.id]: { ...state.completions[first.id], version: 'stale-draft' },
      },
    };
    expect(completedPrefix(state)).toBe(0);
    expect(courseState(second, state)).toBe('locked');
    const forged = {
      ...freshCurriculumProgress(),
      completions: { [second.id]: state.completions[first.id] },
    };
    expect(courseState(second, forged)).toBe('locked');
  });
  it('does not reuse practice from a stale course version or accept malformed quiz answers', () => {
    let state = finishLessons(freshCurriculumProgress());
    const lesson = lessonsFor(first)[0];
    state = {
      ...state,
      lessonWork: {
        ...state.lessonWork,
        [lesson.id]: { ...state.lessonWork[lesson.id], version: 'earlier-version' },
      },
    };
    expect(allLessonsComplete(first, state)).toBe(false);
    expect(recordQuiz(state, first.id, [0, 0, 0, 0, 0])).toEqual(state);
    state = recordLesson(state, first.id, lesson.id, practice, lesson.check.correct, 'typed');
    expect(allLessonsComplete(first, state)).toBe(true);
    expect(recordQuiz(state, first.id, [0, 0])).toEqual(state);
    expect(recordQuiz(state, first.id, [0, 0, 0, 0, 99])).toEqual(state);
  });
  it('keeps the required course order when teaching presentation changes', () => {
    let state = freshCurriculumProgress();
    state = { ...state, band: 'early' };
    expect(courseState(second, state)).toBe('locked');
    state = { ...state, band: 'adult' };
    expect(courseState(second, state)).toBe('locked');
  });
  it('uses the distinct seven-part capstone weights and rejects incomplete reviewer scores', () => {
    const capstone = masterCourses[43];
    expect(
      rubricScore(capstone, 80, {
        scope: 90,
        project: 80,
        design: 70,
        technical: 60,
        testing: 70,
        safety: 100,
        presentation: 80,
        practice: 80,
        reflection: 80,
      }),
    ).toEqual({ project: 77, overall: 77 });
    expect(
      rubricScore(first, 80, { project: 70, practice: 80, reflection: 80, safety: 80 }),
    ).toEqual({ project: 70, overall: 76 });
  });
});
