import { Link } from 'react-router-dom';
import { Card, Container, Eyebrow, buttonStyles } from '@/components/ui';

/** Public static site: intentionally no request to the adult/private backend. */
export function PublicOnlyAvailability() {
  return (
    <section className="motion-public-page public-bg py-12 sm:py-16">
      <Container>
        <Eyebrow>Current access boundary</Eyebrow>
        <h1 className="mt-3 font-display text-4xl text-heading sm:text-5xl">
          Availability and next steps
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-body">
          This site is a <strong>read-only guide to an unreviewed 44-course outline</strong>. Public
          registration, child enrolment, AI teaching, schools, community, payments and certificates
          are not available. Nothing you browse here creates an account, saves progress or earns
          credit.
        </p>
        <Card className="mt-8 max-w-3xl p-6">
          <h2 className="font-display text-xl text-heading">Private adult service</h2>
          <p className="mt-2 text-sm leading-7 text-body">
            This public site is deliberately separate from the invited-adult internal service. It
            cannot check or access that service. Its current availability is unknown here; do not
            treat this page as a service status or an invitation to submit personal information.
          </p>
        </Card>
        <h2 className="mt-10 font-display text-2xl text-heading">Before broader access</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-7 text-body">
          <li>
            Expert review of the lessons and assessment integrity, plus accessibility and usability
            testing.
          </li>
          <li>
            Approved private access, identity operations, monitoring and tested backup/restore for
            adult testers.
          </li>
          <li>
            Qualified legal, privacy and safeguarding approval before any child-related account or
            data.
          </li>
        </ul>
        <Link to="/courses" className={buttonStyles('primary', 'md', 'mt-8')}>
          Read the course outline
        </Link>
      </Container>
    </section>
  );
}
