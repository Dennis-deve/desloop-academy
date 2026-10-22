import { Suspense, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings2,
  Sun,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Button, buttonStyles } from '@/components/ui';
import { appNavigation, commonNavigation, type NavItem } from '@/config/navigation';
import { primaryRoles, roleDetails } from '@/config/site';
import { useAuth, useDemo, useTheme } from '@/app/providers';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

function SidebarContent({ close }: { close?: () => void }) {
  const { session, switchRole } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;
  const groups = [appNavigation[session.role], commonNavigation];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[78px] items-center border-b border-line px-6">
        <Logo to={roleDetails[session.role].home} />
      </div>
      <div className="border-b border-line px-5 py-4 lg:hidden">
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-subdued">
          Preview workspace as
          <select
            value={session.role}
            onChange={(event) => {
              const role = event.target.value as typeof session.role;
              switchRole(role);
              close?.();
              navigate(roleDetails[role].home);
            }}
            className="field mt-2 w-full text-xs font-bold normal-case tracking-normal text-heading"
          >
            {primaryRoles.map((role) => (
              <option key={role} value={role}>
                {roleDetails[role].label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] text-subdued">
          Demo role switch · not an account permission
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6">
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-subdued">
          Workspace
        </p>
        {groups.map((items, index) => (
          <nav
            key={index}
            aria-label={index === 0 ? 'Workspace navigation' : 'Account navigation'}
            className={cn('space-y-1', index === 1 && 'mt-6 border-t border-line pt-5')}
          >
            {index === 1 && (
              <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-subdued">
                Account & help
              </p>
            )}
            {items.map((item: NavItem) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === roleDetails[session.role].home}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[43px] items-center gap-3 rounded-xl px-3 text-[12px] font-bold text-body transition hover:bg-raised hover:text-heading',
                    isActive && 'nav-link-active',
                  )
                }
              >
                <item.icon
                  className="h-[17px] w-[17px] shrink-0"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        ))}
      </div>
      <div className="m-4 rounded-2xl bg-ink-900 p-4 text-white">
        <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
          <CircleHelp className="h-4 w-4" />
        </div>
        <p className="text-xs font-extrabold">Need a hand?</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-300">
          Find answers or tell us what is not working.
        </p>
        <Link
          to="/workspace/support"
          onClick={close}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#9aeee0]"
        >
          Visit support →
        </Link>
      </div>
    </div>
  );
}
function RoleSelector() {
  const { session, switchRole } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-line bg-panel px-2.5 py-1.5 sm:flex">
      <span className="hidden text-[10px] font-extrabold uppercase tracking-wider text-subdued md:block">
        Preview as
      </span>
      <select
        aria-label="Preview another role"
        value={session.role}
        onChange={(event) => {
          const role = event.target.value as typeof session.role;
          switchRole(role);
          navigate(roleDetails[role].home);
        }}
        className="max-w-[162px] cursor-pointer bg-transparent text-xs font-extrabold text-heading outline-none"
      >
        {primaryRoles.map((role) => (
          <option key={role} value={role}>
            {roleDetails[role].label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { session, signOut } = useAuth();
  const { state } = useDemo();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  if (!session) return null;
  const unread = state.notifications.filter((item) => !item.read).length;
  return (
    <div className="min-h-screen bg-canvas text-heading">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[246px] border-r border-line bg-panel lg:block">
        <SidebarContent />
      </aside>
      <div className="lg:pl-[246px]">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between gap-3 border-b border-line bg-panel/95 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-heading lg:hidden"
                  aria-label="Open workspace menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink-950/60" />
                <Dialog.Content
                  className="fixed inset-y-0 left-0 z-[71] w-[min(290px,85vw)] bg-panel shadow-float"
                  aria-label="Workspace menu"
                >
                  <div className="absolute right-3 top-4 z-10">
                    <Dialog.Close
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-body"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  <SidebarContent close={() => setMobileOpen(false)} />
                  <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <span className="hidden text-xs font-extrabold text-subdued md:inline">
              {roleDetails[session.role].label} workspace
            </span>
            <span className="text-xs font-extrabold text-heading md:hidden">My workspace</span>
            <span className="hidden rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#80500c] sm:inline-flex dark:bg-amber-500/20 dark:text-amber-100">
              Demo mode
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/courses?q=${encodeURIComponent(query)}`);
              }}
              className="relative hidden xl:block"
            >
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subdued"
                aria-hidden="true"
              />
              <input
                aria-label="Search courses"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courses"
                className="field !h-9 !min-h-0 w-[190px] !rounded-xl !py-1 !pl-9 text-xs"
              />
            </form>
            <RoleSelector />
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-body hover:bg-raised"
            >
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
            <Link
              to="/workspace/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-body hover:bg-raised"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-panel" />
              )}
            </Link>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-raised"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-[10px] font-extrabold text-white">
                    {initials(session.name)}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-subdued sm:block" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-[75] w-60 rounded-2xl border border-line bg-panel p-2 shadow-float"
                >
                  <div className="border-b border-line px-3 py-3">
                    <p className="truncate text-xs font-extrabold text-heading">{session.name}</p>
                    <p className="truncate text-[11px] text-subdued">Local demonstration account</p>
                  </div>
                  <DropdownMenu.Item asChild>
                    <Link
                      className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-body outline-none hover:bg-raised"
                      to="/workspace/settings"
                    >
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-body outline-none hover:bg-raised"
                      to="/workspace/support"
                    >
                      <CircleHelp className="h-4 w-4" />
                      Help and support
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      signOut();
                      navigate('/');
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-red-600 outline-none hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out of demo
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main
          id="main-content"
          key={location.pathname}
          className="mx-auto max-w-[1360px] px-4 pb-20 pt-7 sm:px-7 sm:pt-9 lg:px-9"
        >
          <Suspense
            fallback={
              <div role="status" className="card-surface p-8 text-sm text-body">
                Loading this workspace…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <div
        className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-line bg-panel px-2 py-1.5 lg:hidden"
        aria-label="Quick navigation"
      >
        <Link
          to={roleDetails[session.role].home}
          className={buttonStyles('ghost', 'sm', 'flex-col gap-0 !px-2 !py-1 text-[10px]')}
        >
          <span>⌂</span>Home
        </Link>
        <Link
          to="/courses"
          className={buttonStyles('ghost', 'sm', 'flex-col gap-0 !px-2 !py-1 text-[10px]')}
        >
          <span>▤</span>Courses
        </Link>
        <Link
          to="/workspace/notifications"
          className={buttonStyles('ghost', 'sm', 'flex-col gap-0 !px-2 !py-1 text-[10px]')}
        >
          <span>◎</span>Updates
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="flex-col gap-0 !px-2 !py-1 text-[10px]"
          onClick={() => setMobileOpen(true)}
        >
          <span>☰</span>Menu
        </Button>
      </div>
    </div>
  );
}
export function AppSection({ children }: { children: ReactNode }) {
  return <div className="space-y-7">{children}</div>;
}
