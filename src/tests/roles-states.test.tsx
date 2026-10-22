import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test-utils';

describe('role-aware states', () => {
  it('shows sample attribution and honest earnings language', async () => {
    renderApp('/partner/earnings', 'teacher_partner');
    expect(
      await screen.findByRole('heading', { name: /Clarity before commissions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No payout is due/i)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative commission statement/i)).toBeInTheDocument();
  });
  it('shows the school launch journey and tenant warning', async () => {
    renderApp('/school/launch', 'school_admin');
    expect(
      await screen.findByRole('heading', { name: /A considered path to launch/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/tenant setup/i)).toBeInTheDocument();
  });
  it('handles a community report as a local-only state', async () => {
    const user = userEvent.setup();
    renderApp('/app/community', 'learner');
    const reports = await screen.findAllByRole('button', { name: 'Report' });
    await user.click(reports[0]);
    await user.selectOptions(
      screen.getByRole('combobox', { name: /What is the concern/i }),
      'Personal information',
    );
    await user.click(screen.getByRole('button', { name: /Record demo report/i }));
    expect(await screen.findByText(/No one was notified/i)).toBeInTheDocument();
  });
  it('offers a no-live-payments empty billing state', async () => {
    renderApp('/workspace/billing', 'learner');
    expect(
      await screen.findByRole('heading', { name: /Know where you stand/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No active paid plan/i)).toBeInTheDocument();
    expect(screen.getByText(/No billing attempts yet/i)).toBeInTheDocument();
  });
});
