import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PublicOnlyRouter } from '@/app/PublicOnlyRouter';

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PublicOnlyRouter />
    </MemoryRouter>,
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('isolated Render read-only guide', () => {
  it('shows the actual brand and ordered draft catalogue without a private account entry', async () => {
    const user = userEvent.setup();
    open('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Learn it. Build it. Make it yours.' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Explore the 44-course outline/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Showing 44 of 44 courses');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(44);
    expect(
      screen.queryByRole('link', { name: /private adult|ai provider operations|checkout/i }),
    ).toBeNull();
  });

  it('does not contact or claim to monitor the private API on the static availability page', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    open('/availability');
    expect(screen.getByText(/cannot check or access that service/i)).toBeInTheDocument();
    expect(screen.getByText(/current availability is unknown here/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try the check/i })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['/pilot', '/pilot/ai/admin', '/register', '/checkout', '/courses/not-a-real-course'])(
    'does not open a private or unknown route %s',
    (path) => {
      open(path);
      expect(
        screen.getByRole('heading', { name: 'This page is not available' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /register|pay|start learning/i })).toBeNull();
    },
  );
});
