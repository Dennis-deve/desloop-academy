import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LearningLoopDashboard } from './LearningLoopDashboard';
import type { PilotPathway, PilotWeeklyActivity } from '../api';

// Synthetic props are limited to test code; the design artifact has no learner account.
const pathway: PilotPathway = {
  mode: 'adult-internal-draft',
  contentVersion: 'draft-1',
  policyVersion: 'internal-pilot-1',
  completedCount: 1,
  currentCourseId: 'course-02',
  courses: [
    {
      id: 'course-01',
      number: 1,
      title: 'First',
      stage: 'Digital foundations',
      state: 'completed',
      version: 'draft-1',
    },
    {
      id: 'course-02',
      number: 2,
      title: 'Second',
      stage: 'Digital foundations',
      state: 'current',
      version: 'draft-1',
    },
    {
      id: 'course-03',
      number: 3,
      title: 'Third',
      stage: 'Digital foundations',
      state: 'locked',
      version: 'draft-1',
    },
  ],
};
const activity: PilotWeeklyActivity = {
  measure: 'persisted-learner-actions',
  timezone: 'UTC',
  sources: ['draft-1'],
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    actions: index === 6 ? 2 : 0,
  })),
};

describe('learning loop review versus authorised private mode', () => {
  it('shows no invented progress, AI actions, sign-in or minutes in the design review', () => {
    render(<LearningLoopDashboard mode="review" />);
    expect(screen.getByText('No private record connected')).toBeInTheDocument();
    expect(screen.getByText('Activity unavailable')).toBeInTheDocument();
    expect(screen.queryByText('2 recorded actions in these 7 UTC days.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ask ai|ai tutor|sign in/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText(/Showing 6 of 44/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ages 9–12' }));
    expect(screen.getByRole('button', { name: 'Ages 9–12' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getAllByText('Ages 9–12 · teaching note')).toHaveLength(6);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a course' }), {
      target: { value: 'not-a-real-course-name' },
    });
    expect(screen.getByText(/No matching draft course/)).toBeInTheDocument();
  });
  it('only opens server-authorised courses and uses server-sourced progression and actions', () => {
    const open = vi.fn();
    render(
      <LearningLoopDashboard
        mode="private"
        displayName="Fictional Adult"
        pathway={pathway}
        activity={activity}
        onOpenCourse={open}
      />,
    );
    expect(screen.getByText('1 of 44 draft courses passed')).toBeInTheDocument();
    expect(screen.getByText('2 recorded actions in these 7 UTC days.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /2026-11-07: 2/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue Course 02/ }));
    expect(open).toHaveBeenCalledWith('course-02');
    fireEvent.click(screen.getAllByRole('button', { name: /See course outline/ })[2]);
    const locked = screen
      .getAllByRole('listitem')
      .find((item) => within(item).queryByText('Locked by server'));
    expect(locked).toBeTruthy();
    expect(
      within(locked!).queryByRole('button', { name: /Open this authorised course/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ask ai|ai tutor/i })).not.toBeInTheDocument();
  });
  it('fails visibly closed instead of drawing values from malformed activity JSON', () => {
    render(
      <LearningLoopDashboard
        mode="private"
        pathway={pathway}
        activity={
          {
            ...activity,
            days: activity.days.map((day, index) => (index === 2 ? null : day)),
          } as unknown as PilotWeeklyActivity
        }
      />,
    );
    expect(screen.getByText('Activity unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No values have been inferred/)).toBeInTheDocument();
    expect(screen.queryByText('2 recorded actions in these 7 UTC days.')).not.toBeInTheDocument();
  });
});
