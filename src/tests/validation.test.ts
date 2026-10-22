import { describe, expect, it } from 'vitest';
import {
  schoolApplicationSchema,
  teacherApplicationSchema,
  courseDraftSchema,
} from '@/lib/validation';
import { validateEvidence } from '@/features/projects/ProjectStudio';
import { courses } from '@/mocks/catalog';
import { percentage } from '@/lib/utils';

describe('typed domain validation', () => {
  it('rejects incomplete teacher applications and accepts a complete one', () => {
    expect(
      teacherApplicationSchema.safeParse({
        name: 'A',
        email: 'nope',
        background: 'short',
        expertise: '',
        audience: '',
        agree: false,
      }).success,
    ).toBe(false);
    expect(
      teacherApplicationSchema.safeParse({
        name: 'Ama K',
        email: 'ama@example.com',
        background: 'I have taught practical design for three years.',
        expertise: 'Design',
        audience: 'Adults',
        agree: true,
      }).success,
    ).toBe(true);
  });
  it('requires school context and a privacy acknowledgement', () => {
    const values = {
      schoolName: 'Demo School',
      schoolType: 'Junior high',
      location: 'Accra',
      contactName: 'Kofi Mensah',
      email: 'kofi@example.com',
      learners: 25,
      teachers: 4,
      programmes: 'Digital literacy',
      connectivity: 'Intermittent',
      agree: true,
    };
    expect(schoolApplicationSchema.safeParse(values).success).toBe(true);
    expect(schoolApplicationSchema.safeParse({ ...values, agree: false }).success).toBe(false);
  });
  it('validates course objectives for authoring', () => {
    expect(
      courseDraftSchema.safeParse({
        title: 'Test',
        subject: 'Design',
        audience: 'Adults',
        objectives: 'Too brief',
        duration: '4 weeks',
        language: 'English',
        teachingStyle: 'Guided',
        projectOutcome: 'Create a useful prototype',
      }).success,
    ).toBe(false);
  });
  it('rejects oversized or unsupported evidence files', () => {
    expect(
      validateEvidence(new File(['hello'], 'evidence.txt', { type: 'text/plain' })),
    ).toBeNull();
    expect(validateEvidence(new File(['hello'], 'script.exe'))).toMatch(/Choose a PNG/);
    expect(validateEvidence(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf'))).toMatch(
      /smaller than 5 MB/,
    );
  });
  it('has navigable, subject-agnostic course data and bounded progress', () => {
    expect(courses.some((course) => course.category === 'Digital literacy')).toBe(true);
    expect(courses.some((course) => course.category === 'Design')).toBe(true);
    expect(
      courses.every((course) => course.modules.flatMap((module) => module.lessons).length > 0),
    ).toBe(true);
    expect(percentage(2, 4)).toBe(50);
    expect(percentage(0, 0)).toBe(0);
  });
});
