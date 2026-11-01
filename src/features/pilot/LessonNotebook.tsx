import { useEffect, useState, type FormEvent } from 'react';
import { Bookmark, NotebookPen, RefreshCcw } from 'lucide-react';
import { Button, Card, Field, InfoBox } from '@/components/ui';
import { pilotApi, PilotApiError, type PilotAnnotation, type PilotAnnotations } from './api';

interface LessonChoice { id: string; title: string }

/** Private, explicit-save notebook; never implies that a note awards course credit. */
export function LessonNotebook({
  courseId,
  contentVersion,
  lessons,
}: {
  courseId: string;
  contentVersion: string;
  lessons: LessonChoice[];
}) {
  const [items, setItems] = useState<Record<string, PilotAnnotation>>({});
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [needsComparison, setNeedsComparison] = useState(false);
  const [comparisonReady, setComparisonReady] = useState(false);
  const [compared, setCompared] = useState(false);

  const stored = items[selectedId];
  const dirty = draft !== (stored?.note ?? '') || bookmarked !== (stored?.bookmarked ?? false);
  const versionedItems = (response: PilotAnnotations) => {
    if (response.courseId !== courseId || response.contentVersion !== contentVersion)
      throw new Error('Course content changed. Reload the course before editing your notes.');
    return Object.fromEntries(response.items.map((item) => [item.lessonId, item]));
  };
  const reload = async (preserveDraft = false) => {
    setLoading(true);
    setError('');
    try {
      const found = versionedItems(await pilotApi.annotations(courseId));
      setItems(found);
      setHasLoaded(true);
      setComparisonReady(preserveDraft);
      if (!preserveDraft) {
        setDraft(found[selectedId]?.note ?? '');
        setBookmarked(found[selectedId]?.bookmarked ?? false);
        setNeedsComparison(false);
        setCompared(false);
      } else if (found[selectedId]?.note === draft &&
        (found[selectedId]?.bookmarked ?? false) === bookmarked) {
        setNeedsComparison(false);
        setCompared(false);
        setStatus('The server currently holds the same note and bookmark as your draft. The earlier save outcome is not independently confirmed.');
      }
      return found;
    } catch (reason) {
      setComparisonReady(false);
      setError(reason instanceof Error ? reason.message : 'Could not load your private notes.');
      return null;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    pilotApi.annotations(courseId).then((response) => {
      if (!active) return;
      const found = versionedItems(response);
      setItems(found);
      setHasLoaded(true);
      setDraft(found[selectedId]?.note ?? '');
      setBookmarked(found[selectedId]?.bookmarked ?? false);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load your private notes.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
    // The component is keyed by course ID in its parent: a new course remounts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, contentVersion]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const choose = (lessonId: string) => {
    if (dirty || saving || needsComparison) {
      setError('Save or discard this unsaved note before switching lessons.');
      return;
    }
    setSelectedId(lessonId);
    setDraft(items[lessonId]?.note ?? '');
    setBookmarked(items[lessonId]?.bookmarked ?? false);
    setStatus('');
    setError('');
  };
  const discard = () => {
    setDraft(stored?.note ?? '');
    setBookmarked(stored?.bookmarked ?? false);
    setNeedsComparison(false);
    setComparisonReady(false);
    setCompared(false);
    setError('');
    setStatus('Unsaved changes discarded; the server record was not changed.');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving || (needsComparison && (!comparisonReady || !compared))) return;
    setSaving(true);
    setError('');
    setStatus('');
    const revision = stored?.revision ?? 0;
    try {
      const saved = await pilotApi.saveAnnotation(courseId, selectedId, {
        note: draft, bookmarked, expectedRevision: revision,
      });
      setItems((previous) => ({ ...previous, [selectedId]: saved }));
      setNeedsComparison(false);
      setComparisonReady(false);
      setCompared(false);
      setStatus(`Saved on the server. Revision ${saved.revision}. Notes do not award course credit.`);
    } catch (reason) {
      if (reason instanceof PilotApiError && (reason.status === 409 || reason.status === 0)) {
        setNeedsComparison(true);
        setComparisonReady(false);
        setCompared(false);
        setError(reason.status === 0
          ? 'The save outcome is unknown. Your unsaved text remains on this page. Compare with the server before trying again.'
          : 'This note changed in another tab. Your unsaved text remains on this page. Compare before saving.');
        await reload(true);
      } else {
        setError(reason instanceof Error ? reason.message : 'This note was not confirmed saved.');
      }
    } finally {
      setSaving(false);
    }
  };
  if (lessons.length === 0) return null;
  return (
    <Card className="p-6 sm:p-8" role="region" aria-label="Private lesson notebook">
      <div className="flex items-center gap-3">
        <NotebookPen className="h-6 w-6 text-brand-600" aria-hidden="true" />
        <h3 className="font-display text-xl text-heading">Private lesson notebook</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-body">
        Notes and bookmarks save to your account only after you select Save. They are not shared,
        assessed or used for course credit. Do not enter private details about others.
      </p>
      {loading ? (
        <p className="mt-5 text-sm text-body" role="status">Checking your server-saved notes…</p>
      ) : !hasLoaded ? (
        <div className="mt-5">
          <p role="alert" className="field-error">{error}</p>
          <Button variant="outline" onClick={() => void reload()}>Retry loading</Button>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={(event) => void save(event)}>
          <Field label="Lesson" id="notebook-lesson">
            <select id="notebook-lesson" className="field" value={selectedId}
              onChange={(event) => choose(event.target.value)}>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Your note (plain text)" id="notebook-note"
            hint="Up to 4,000 characters. Unsaved text may be lost when you leave this page.">
            <textarea id="notebook-note" className="field min-h-28" maxLength={4000}
              value={draft} disabled={saving} onChange={(event) => { setDraft(event.target.value); setCompared(false); setStatus(''); }} />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-heading">
            <input type="checkbox" className="h-5 w-5 accent-brand-600"
              checked={bookmarked} disabled={saving} onChange={(event) => { setBookmarked(event.target.checked); setCompared(false); setStatus(''); }} />
            <Bookmark className="h-4 w-4" aria-hidden="true" /> Bookmark this lesson
          </label>
          {needsComparison && (
            <InfoBox tone="amber" title="Compare before resolving">
              <p>{comparisonReady
                ? 'The latest server record is shown below. Your unsaved text remains in the editable note above.'
                : 'The latest server record could not be confirmed. Reload it before deciding what to save.'}</p>
              <label className="mt-3 block text-sm font-bold" htmlFor="notebook-server-note">Latest server note</label>
              <textarea id="notebook-server-note" className="field mt-1 min-h-20" readOnly
                value={stored?.note ?? ''} />
              <p className="mt-2 text-xs">Server revision: {stored?.revision ?? 0}. Server bookmark: {stored?.bookmarked ? 'yes' : 'no'}.</p>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={compared} disabled={!comparisonReady}
                  onChange={(event) => setCompared(event.target.checked)} />
                I compared my draft with the latest server version and choose to save my draft.
              </label>
            </InfoBox>
          )}
          {error && <p role="alert" className="field-error">{error}</p>}
          {status && <p role="status" className="text-sm text-body">{status}</p>}
          {dirty && <p className="text-xs font-bold text-amber-700 dark:text-amber-200">Unsaved changes in this tab</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={!dirty || (needsComparison && (!comparisonReady || !compared))}>
              Save note and bookmark on server
            </Button>
            {dirty && <Button variant="outline" onClick={discard} disabled={saving}>Discard unsaved changes</Button>}
            {needsComparison && <Button variant="outline" disabled={saving} onClick={() => void reload(true)}>
              <RefreshCcw className="h-4 w-4" /> Reload server version
            </Button>}
          </div>
        </form>
      )}
    </Card>
  );
}
