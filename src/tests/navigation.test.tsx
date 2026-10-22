import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test-utils';

// Real router and providers are rendered; these are not isolated screenshots.
describe('public navigation and role entry', () => {
  it('renders the homepage and follows a primary navigation link', async () => {
    const user = userEvent.setup();
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Learn it.*Build it.*Make it yours/i }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    await user.click(within(nav).getByRole('link', { name: 'Courses' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Start with the basics/i }),
    ).toBeInTheDocument();
  });
  it('offers demo access rather than showing a protected workspace to a visitor', async () => {
    renderApp('/app');
    expect(
      await screen.findByRole('heading', { name: /Choose a workspace to explore/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /^Learner Courses, projects, and learning progress Open preview/i,
      }),
    ).toBeInTheDocument();
  });
  it('switches a wrong-role preview before displaying school data', async () => {
    const user = userEvent.setup();
    renderApp('/school', 'learner');
    expect(
      await screen.findByRole('heading', { name: /Choose a workspace to explore/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /School administrator.*Open preview/i }));
    expect(
      await screen.findByRole('heading', { name: /Welcome to Demo Learning School/i }),
    ).toBeInTheDocument();
  });
});
