import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Container, buttonStyles } from '@/components/ui';
import { Logo } from './Logo';
import { site } from '@/config/site';
import { motionRipple } from '@/components/motion/ripple';
import '@/components/motion/motion.css';

const links = [
  { label: 'Courses', href: '/courses' },
  { label: 'How learning works', href: '/how-it-works' },
  { label: 'Availability', href: '/availability' },
] as const;

export function ReleaseLayout({ notice }: { notice?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    setMenuOpen(false);
    // Announce a new route, but never scroll away the notice on the initial load.
    // Comparing paths also survives StrictMode's double mount effect in development.
    const changed = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    document.getElementById('main-content')?.focus({ preventScroll: !changed });
  }, [location.pathname]);
  return (
    <div className="public-bg min-h-screen text-heading">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="motion-weave-bar" aria-hidden="true" />
      <div className="border-b border-line bg-ink-900 text-center text-xs font-semibold text-white">
        <Container className="py-2">
          {notice ?? 'Read-only draft course information · No public enrolment or child accounts'}
        </Container>
      </div>
      <header className="motion-site-header sticky top-[6px] z-40 border-b border-line">
        <Container className="flex min-h-[74px] items-center justify-between gap-5">
          <Logo />
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
            {links.map(({ href, label }) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  `text-sm font-bold hover:text-brand-600 ${isActive ? 'text-brand-600 underline underline-offset-8 dark:text-brand-200' : 'text-heading'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/courses" onPointerDown={motionRipple} className={buttonStyles('primary', 'sm', 'hidden md:inline-flex')}>
            View course outline <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="release-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </Container>
        <nav id="release-mobile-nav" hidden={!menuOpen} aria-label="Mobile navigation" className="border-t border-line bg-panel px-5 py-3 md:hidden">
            <div className="mx-auto grid max-w-page gap-1">
              {links.map(({ href, label }) => (
                <Link key={href} to={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-heading hover:bg-raised">
                  {label}
                </Link>
              ))}
              <Link to="/courses" onClick={() => setMenuOpen(false)} className={buttonStyles('primary', 'md', 'mt-2')}>
                View course outline
              </Link>
            </div>
        </nav>
      </header>
      {/* Keep the nested adult pilot mounted across its own routes. The pathname-keyed main
          discarded all in-tab drafts; the focus effect above still moves focus on navigation. */}
      <main id="main-content" tabIndex={-1} className="min-h-[58vh] scroll-mt-24 outline-none">
        <Suspense fallback={<Container className="py-20" role="status">Loading this page…</Container>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-ink-950 text-white">
        <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <Link to="/" aria-label={`${site.name} home`} className="inline-block rounded-xl focus-visible:outline-offset-4">
              <img src={site.brandAssets.wordmarkMono} alt="" width={900} height={452} loading="lazy" className="w-44 rounded-xl border border-white/10" />
            </Link>
            <p className="mt-3 text-xs leading-6 text-slate-300">
              Draft curriculum information only. Public registration, payments, AI teaching and child access are not open.
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-200">
            <Link to="/courses" className="hover:text-white">Courses</Link>
            <Link to="/how-it-works" className="hover:text-white">How learning works</Link>
            <Link to="/availability" className="hover:text-white">Availability</Link>
          </nav>
        </Container>
      </footer>
    </div>
  );
}
