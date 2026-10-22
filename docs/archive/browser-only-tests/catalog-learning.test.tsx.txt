import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test-utils';

describe('learner journey', () => {
  it('filters the catalogue and opens a course', async () => {
    const user = userEvent.setup();
    renderApp('/sample-courses');
    expect(await screen.findByRole('heading', { name: 'Creative coding lab' })).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by category' }),
      'Design',
    );
    expect(screen.getByRole('heading', { name: 'Design for real people' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Creative coding lab' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Design for real people.*View course/i }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design for real people' }),
    ).toBeInTheDocument();
  });
  it('checks understanding and completes a sample lesson', async () => {
    const user = userEvent.setup();
    renderApp('/app/sample-lesson/digital-confidence/files-folders', 'learner');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Find and organise your files' }),
    ).toBeInTheDocument();
    const completion = screen.getByRole('button', { name: /Mark lesson complete/i });
    expect(completion).toBeDisabled();
    const check = screen.getByRole('group', { name: /Choose one answer/i });
    await user.click(within(check).getByRole('radio', { name: 'budget-plan-october.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(screen.getByText(/You got it/i)).toBeInTheDocument();
    await user.click(completion);
    expect(screen.getByText(/Completed · demo/i)).toBeInTheDocument();
  });
  it('renders the learner dashboard with a concrete next action', async () => {
    renderApp('/app', 'learner');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Welcome back, Alex/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Continue: Welcome to Desloop/i }).length,
    ).toBeGreaterThan(0);
  });
});
