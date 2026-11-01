import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonNotebook } from '@/features/pilot/LessonNotebook';
import { PilotApiError } from '@/features/pilot/api';

const api = vi.hoisted(() => ({
  annotations: vi.fn(),
  saveAnnotation: vi.fn(),
}));
vi.mock('@/features/pilot/api', () => ({
  pilotApi: api,
  PilotApiError: class PilotApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
}));
const lessons = [{ id: 'c01-l1', title: 'First learning step' }, { id: 'c01-l2', title: 'Next learning step' }];
const found = (items: object[] = []) => ({ courseId: 'course-01', contentVersion: 'internal-draft-1', items });
const saved = (note: string, revision: number, bookmarked = false) => ({
  lessonId: 'c01-l1', note, revision, bookmarked, updatedAt: '2026-11-01T10:00:00.000Z',
});
function open() {
  render(<LessonNotebook courseId="course-01" contentVersion="internal-draft-1" lessons={lessons} />);
}
beforeEach(() => {
  api.annotations.mockReset();
  api.saveAnnotation.mockReset();
});

describe('private, server-saved lesson notebook', () => {
  it('loads an empty server record, persists an original note/bookmark and never claims course credit', async () => {
    const user = userEvent.setup();
    api.annotations.mockResolvedValue(found());
    api.saveAnnotation.mockResolvedValue(saved('I explained it in my own words.', 1, true));
    open();
    const note = await screen.findByRole('textbox', { name: 'Your note (plain text)' });
    expect(note).toHaveValue('');
    await user.type(note, 'I explained it in my own words.');
    await user.click(screen.getByRole('checkbox', { name: 'Bookmark this lesson' }));
    await user.click(screen.getByRole('button', { name: 'Save note and bookmark on server' }));
    expect(await screen.findByText(/Saved on the server. Revision 1./)).toHaveTextContent('Notes do not award course credit');
    expect(api.saveAnnotation).toHaveBeenCalledWith('course-01', 'c01-l1', {
      note: 'I explained it in my own words.', bookmarked: true, expectedRevision: 0,
    });
    expect(screen.queryByText('Unsaved changes in this tab')).toBeNull();
  });

  it('blocks switching lessons with an unsaved draft, then allows explicit discard', async () => {
    const user = userEvent.setup();
    api.annotations.mockResolvedValue(found());
    open();
    const note = await screen.findByRole('textbox', { name: 'Your note (plain text)' });
    await user.type(note, 'Do not lose my unsaved thought.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Lesson' }), 'c01-l2');
    expect(screen.getByRole('combobox', { name: 'Lesson' })).toHaveValue('c01-l1');
    expect(screen.getByRole('alert')).toHaveTextContent('Save or discard');
    expect(note).toHaveValue('Do not lose my unsaved thought.');
    await user.click(screen.getByRole('button', { name: 'Discard unsaved changes' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Lesson' }), 'c01-l2');
    expect(screen.getByRole('combobox', { name: 'Lesson' })).toHaveValue('c01-l2');
    expect(api.saveAnnotation).not.toHaveBeenCalled();
  });

  it('keeps a conflicting note for comparison; overwrites only after explicit acknowledgement', async () => {
    const user = userEvent.setup();
    api.annotations.mockResolvedValueOnce(found([saved('Original server note', 1)]))
      .mockResolvedValue(found([saved('Other tab edited it', 2)]));
    api.saveAnnotation.mockRejectedValueOnce(new PilotApiError(409, 'ANNOTATION_CONFLICT', 'Conflict'))
      .mockResolvedValueOnce(saved('My carefully compared draft', 3));
    open();
    const note = await screen.findByRole('textbox', { name: 'Your note (plain text)' });
    expect(note).toHaveValue('Original server note');
    await user.clear(note);
    await user.type(note, 'My carefully compared draft');
    await user.click(screen.getByRole('button', { name: 'Save note and bookmark on server' }));
    expect(await screen.findByText('Compare before resolving')).toBeInTheDocument();
    expect(note).toHaveValue('My carefully compared draft');
    expect(screen.getByRole('textbox', { name: 'Latest server note' })).toHaveValue('Other tab edited it');
    expect(screen.getByRole('button', { name: 'Save note and bookmark on server' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /I compared my draft/ }));
    await user.click(screen.getByRole('button', { name: 'Save note and bookmark on server' }));
    expect(await screen.findByText(/Saved on the server. Revision 3./)).toBeInTheDocument();
    expect(api.saveAnnotation).toHaveBeenNthCalledWith(1, 'course-01', 'c01-l1', {
      note: 'My carefully compared draft', bookmarked: false, expectedRevision: 1,
    });
    expect(api.saveAnnotation).toHaveBeenNthCalledWith(2, 'course-01', 'c01-l1', {
      note: 'My carefully compared draft', bookmarked: false, expectedRevision: 2,
    });
  });

  it('does not announce success when network outcome is unknown and cannot confirm the server', async () => {
    const user = userEvent.setup();
    api.annotations.mockResolvedValueOnce(found()).mockRejectedValueOnce(new Error('Server unreachable'))
      .mockResolvedValueOnce(found([saved('Kept when connection returned', 1)]));
    api.saveAnnotation.mockRejectedValueOnce(new PilotApiError(0, 'NOT_CONNECTED', 'Offline'));
    open();
    const note = await screen.findByRole('textbox', { name: 'Your note (plain text)' });
    await user.type(note, 'Kept when connection returned');
    await user.click(screen.getByRole('button', { name: 'Save note and bookmark on server' }));
    expect(await screen.findByText('Compare before resolving')).toBeInTheDocument();
    expect(note).toHaveValue('Kept when connection returned');
    expect(screen.queryByText(/Saved on the server. Revision/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save note and bookmark on server' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reload server version' }));
    await waitFor(() => expect(screen.getByText(/server currently holds the same note/)).toBeInTheDocument());
    expect(screen.queryByText(/Saved on the server. Revision/)).toBeNull();
    expect(api.saveAnnotation).toHaveBeenCalledTimes(1);
  });
});
