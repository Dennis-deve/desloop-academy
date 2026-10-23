import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Container, Eyebrow, buttonStyles } from '@/components/ui';

export function ReleaseAvailability() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'active' | 'inactive' | 'unavailable'>(
    'loading',
  );
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/pilot/status', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Service status could not be checked.');
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== 'object' ||
          !('enabled' in result) ||
          typeof result.enabled !== 'boolean'
        )
          throw new Error('Invalid service status.');
        setStatus(result.enabled ? 'active' : 'inactive');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('unavailable');
      });
    return () => controller.abort();
  }, [attempt]);
  const message =
    status === 'loading'
      ? 'Checking the private adult service…'
      : status === 'active'
        ? 'The internal adult API reports active. This does not open enrolment or provide browser access.'
        : status === 'inactive'
          ? 'The internal adult API reports inactive. No account access is available.'
          : 'The internal adult service cannot be checked right now. Do not assume it is available.';
  return (
    <section className="public-bg py-12 sm:py-16">
      <Container>
        <Eyebrow>Current access boundary</Eyebrow>
        <h1 className="mt-3 font-display text-4xl text-heading sm:text-5xl">
          Availability and next steps
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-body">
          Public registration, child enrolment, schools, AI teaching, community, payments and
          certificates are <strong>not available</strong>. No invitation or request form on this
          site collects details. An adult-only API exists for internally authorised testers on
          private infrastructure; it is not a public learning platform or an invitation to submit
          personal information.
        </p>
        <Card className="mt-8 max-w-3xl p-6" role="status" aria-live="polite">
          <h2 className="font-display text-xl text-heading">Internal service check</h2>
          <p className="mt-2 text-sm leading-7 text-body">{message}</p>
          {status === 'unavailable' && (
            <button
              type="button"
              className={buttonStyles('outline', 'md', 'mt-4')}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try the check again
            </button>
          )}
        </Card>
        <h2 className="mt-10 font-display text-2xl text-heading">Before broader access</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-7 text-body">
          <li>
            Expert review of lessons and assessment integrity, plus accessibility and usability
            testing.
          </li>
          <li>
            Approved private access, identity operations, monitoring and a tested backup/restore
            plan for adult testers.
          </li>
          <li>
            Qualified legal, privacy and safeguarding approval, verified guardian authority and
            consent before any minor account.
          </li>
        </ul>
        <Link to="/courses" className={buttonStyles('primary', 'md', 'mt-8')}>
          Read the course outline
        </Link>
      </Container>
    </section>
  );
}
