import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ReleaseRouter } from '@/app/ReleaseRouter';

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><ReleaseRouter /></MemoryRouter>);
}
afterEach(() => vi.unstubAllGlobals());

describe('actual release entry and read-only draft catalogue', () => {
  it('guides a visitor to the 44-course outline without fake account actions', async () => {
    const user = userEvent.setup();
    open('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Learn it. Build it. Make it yours.' })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getAllByRole('link').map((link) => link.textContent)).toEqual(['Courses', 'How learning works', 'Availability']);
    expect(screen.queryByRole('link', { name: /sign up|enrol|checkout|preview role/i })).toBeNull();
    await user.click(screen.getByRole('link', { name: /Explore the 44-course outline/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'The 44-course outline' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Showing 44 of 44 courses');
  });

  it('searches only metadata, keeps order, filters a shareable stage and recovers from no matches', async () => {
    const user = userEvent.setup();
    open('/courses?stage=9');
    expect(await screen.findByRole('heading', { level: 1, name: 'The 44-course outline' })).toBeInTheDocument();
    const stage = screen.getByRole('combobox', { name: /stage/i });
    expect(stage).toHaveValue('9');
    expect(screen.getByRole('status', { name: '' })).not.toHaveTextContent('Showing 44 of 44');
    await user.type(screen.getByRole('searchbox', { name: 'Search course outlines' }), 'zzzznotacourse');
    expect(screen.getByText('No matching course outlines')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all courses' }));
    expect(stage).toHaveValue('all');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Showing 44 of 44 courses');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(44);
  });

  it('shows a draft course outline without enrolment, keys or a false pass', async () => {
    open('/courses/getting-started-with-learning-and-digital-confidence');
    expect(await screen.findByRole('heading', { level: 1, name: 'Getting Started with Learning and Digital Confidence' })).toBeInTheDocument();
    expect(screen.getByText(/It cannot enrol anyone or save progress/i)).toBeInTheDocument();
    const modules = screen.getByRole('heading', { name: 'Four ordered modules' }).nextElementSibling;
    expect(modules).not.toBeNull();
    expect(within(modules as HTMLElement).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /start learning|submit|complete/i })).toBeNull();
    expect(screen.queryByText(/Correct answer:/i)).toBeNull();
    expect(screen.getByText(/How the examples would adapt by age/i)).toBeInTheDocument();
  });

  it.each(['/demo', '/app', '/register', '/apply/school', '/school/classes', '/workspace/checkout', '/parent/safety'])('denies obsolete simulated route %s', async (path) => {
    open(path);
    expect(await screen.findByText('This page is not available')).toBeInTheDocument();
    expect(screen.getByText(/No account, payment or progress has been created/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open preview|pay now|send application/i })).toBeNull();
  });

  it('keeps an unavailable service truthful, offers retry and never presents public enrolment as open', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true }) });
    vi.stubGlobal('fetch', fetcher);
    open('/availability');
    expect(await screen.findByText(/internal adult service cannot be checked right now/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try the check again' }));
    await waitFor(() => expect(screen.getByText(/internal adult API reports active/i)).toBeInTheDocument());
    expect(screen.getByText(/does not open enrolment/i)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retains the real private pilot but does not redirect a disabled service to a demo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false, engineV2Enabled: false }) }));
    open('/pilot');
    expect(await screen.findByRole('heading', { name: 'The private adult pilot is unavailable' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /demo/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Read the access status' })).toHaveAttribute('href', '/availability');
  });
});
