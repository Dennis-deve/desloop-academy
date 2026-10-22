import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X, Moon, Sun } from 'lucide-react';
import { Logo } from './Logo';
import { Container, buttonStyles } from '@/components/ui';
import { publicNav, publicFooter, site } from '@/config/site';
import { useTheme } from '@/app/providers';

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const isPilot = location.pathname === '/pilot' || location.pathname.startsWith('/pilot/');
  return (
    <div className="public-bg min-h-screen text-heading">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="demo-stripe text-center text-[11px] font-semibold">
        <Container className="py-1.5">
          {isPilot
            ? 'Private adult/internal pilot · Server gates when enabled · Draft only, not official credit'
            : 'Draft course information · Children cannot create accounts yet · No live AI or payments'}
        </Container>
      </div>
      <header className="sticky top-0 z-50 border-b border-line/80 bg-panel/95 backdrop-blur-md">
        <Container className="flex h-[74px] items-center justify-between gap-6">
          <Logo />
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 lg:flex">
            {publicNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `public-nav-link text-[12px] font-bold whitespace-nowrap ${isActive ? 'text-brand-600 dark:text-brand-200' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={toggle}
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-body hover:bg-raised"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to={isPilot ? '/pilot' : '/courses'} className={buttonStyles('navy', 'sm')}>
              {isPilot ? 'Pilot home' : 'Browse courses'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-heading lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </Container>
        {menuOpen && (
          <nav
            key={location.pathname}
            aria-label="Mobile navigation"
            className="max-h-[calc(100vh-75px)] overflow-y-auto border-t border-line bg-panel px-5 pb-5 pt-3 lg:hidden"
          >
            <div className="mx-auto grid max-w-page gap-0.5">
              {publicNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-heading hover:bg-raised"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid gap-0.5 border-t border-line pt-3">
                <Link
                  to="/child-safety"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-heading hover:bg-raised"
                >
                  Child safety
                </Link>
                <Link
                  to="/support"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-heading hover:bg-raised"
                >
                  Help
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-4">
                <Link
                  to={isPilot ? '/pilot' : '/courses'}
                  onClick={() => setMenuOpen(false)}
                  className={buttonStyles('navy', 'md')}
                >
                  {isPilot ? 'Pilot home' : 'Browse courses'}
                </Link>
                <button
                  onClick={toggle}
                  aria-label="Toggle theme"
                  className={buttonStyles('ghost', 'md')}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>
      <main id="main-content" key={isPilot ? 'pilot' : location.pathname}>
        <Suspense
          fallback={
            <Container className="py-24" role="status">
              Loading this page…
            </Container>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <footer className="bg-ink-950 text-white">
        <Container className="py-14 sm:py-20">
          <div className="grid gap-10 border-b border-white/15 pb-14 lg:grid-cols-[1.7fr_repeat(4,1fr)]">
            <div className="max-w-xs">
              <Link
                to="/"
                aria-label={`${site.name} home`}
                className="inline-block rounded-2xl focus-visible:outline-offset-4"
              >
                <img
                  src={site.brandAssets.wordmarkMono}
                  alt=""
                  width={900}
                  height={452}
                  loading="lazy"
                  className="w-60 rounded-xl border border-white/10"
                />
              </Link>
              <p className="mt-6 text-sm leading-7 text-slate-300">
                {site.description} Built around doing, not just watching.
              </p>
              <Link
                to="/explore"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#9aeee0]"
              >
                Find your next step <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {publicFooter.map((group) => (
              <div key={group.title}>
                <h3 className="mb-5 text-xs font-extrabold uppercase tracking-widest text-white">
                  {group.title}
                </h3>
                <ul className="space-y-3">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        to={href}
                        className="text-xs text-slate-300 transition hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-between gap-5 pt-7 text-xs text-slate-400 sm:flex-row">
            <span>
              © {new Date().getFullYear()} {site.name}.{' '}
              {isPilot
                ? 'Adult-only draft pilot; other journeys are frontend previews. Business and legal terms pending review.'
                : 'Draft curriculum information; child accounts are not available. Business and legal terms pending review.'}
            </span>
            <span>Thoughtful learning, wherever you begin.</span>
          </div>
        </Container>
      </footer>
    </div>
  );
}
