import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { demoAuthService, demoRepository } from '@/services/demo';
import type {
  ApplicationRecord,
  CheckoutRecord,
  DemoSession,
  DemoState,
  PortfolioItem,
  Project,
  Role,
  SchoolClass,
  SubmissionRecord,
  SupportTicket,
} from '@/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

interface AuthContextValue {
  session: DemoSession | null;
  signIn: (email: string, password: string) => Promise<DemoSession>;
  register: (name: string, email: string, password: string) => Promise<DemoSession>;
  enterDemo: (role: Role) => DemoSession;
  switchRole: (role: Role) => void;
  updateName: (name: string) => void;
  signOut: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(() => demoAuthService.current());
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: async (email, password) => {
        const next = await demoAuthService.signIn(email, password);
        setSession(next);
        return next;
      },
      register: async (name, email, password) => {
        const next = await demoAuthService.register(name, email, password);
        setSession(next);
        return next;
      },
      enterDemo: (role) => {
        const next = demoAuthService.enterDemo(role);
        setSession(next);
        return next;
      },
      switchRole: (role) => setSession(demoAuthService.switchDemoRole(role)),
      updateName: (name) => setSession(demoAuthService.updateDemoName(name)),
      signOut: () => {
        demoAuthService.signOut();
        setSession(null);
      },
    }),
    [session],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

interface DemoActions {
  enroll: (id: string) => void;
  completeLesson: (id: string) => void;
  toggleBookmark: (id: string) => void;
  saveNote: (id: string, note: string) => void;
  setGoal: (goal: string) => void;
  updateProject: (id: string, changes: Partial<Project>) => void;
  toggleProjectStep: (id: string, index: number) => void;
  saveSubmission: (submission: SubmissionRecord) => void;
  addPortfolio: (item: PortfolioItem) => void;
  togglePortfolioVisibility: (id: string) => void;
  addPost: (title: string, body: string, kind: 'question' | 'project' | 'discussion') => void;
  reportPost: (id: string) => void;
  resolvePost: (id: string) => void;
  hidePost: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSavedPost: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  toggleCircle: (id: string) => void;
  markNotification: (id: string) => void;
  markAllNotifications: () => void;
  addApplication: (record: ApplicationRecord) => void;
  updateApplicationStatus: (
    type: ApplicationRecord['type'],
    status: ApplicationRecord['status'],
  ) => void;
  setReferralCode: (code: string) => void;
  addTeacherInvitation: (email: string) => void;
  addTeacherAnnouncement: (text: string) => void;
  updateSchoolProfile: (changes: Partial<DemoState['schoolProfile']>) => void;
  addSchoolClass: (item: SchoolClass) => void;
  updateSchoolClass: (id: string, changes: Partial<SchoolClass>) => void;
  addSchoolTeacherInvite: (email: string) => void;
  addSchoolImportedCount: (count: number) => void;
  requestGuardianLink: () => void;
  updateGuardianPreferences: (changes: Partial<DemoState['guardianPreferences']>) => void;
  addSupportTicket: (ticket: SupportTicket) => void;
  addCheckoutRecord: (record: CheckoutRecord) => void;
  resolveSupportTicket: (id: string) => void;
  addAuditEvent: (action: string) => void;
  setCourseDraft: (draft: DemoState['savedCourseDraft']) => void;
  updatePreferences: (changes: Partial<DemoState['preferences']>) => void;
  /** Local demonstration state only. Feature reducers validate progression; never use this as a production authority. */
  updateCurriculum: (reduce: (prev: DemoState['curriculum']) => DemoState['curriculum']) => void;
  reset: () => void;
}
const DemoContext = createContext<{ state: DemoState; actions: DemoActions } | null>(null);
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error('DemoProvider missing');
  return value;
}
function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => demoRepository.load());
  useEffect(() => {
    demoRepository.save(state);
  }, [state]);
  const actions = useMemo<DemoActions>(
    () => ({
      enroll: (id) =>
        setState((prev) => ({
          ...prev,
          enrolledCourseIds: [...new Set([...prev.enrolledCourseIds, id])],
        })),
      completeLesson: (id) =>
        setState((prev) => ({
          ...prev,
          completedLessonIds: [...new Set([...prev.completedLessonIds, id])],
        })),
      toggleBookmark: (id) =>
        setState((prev) => ({
          ...prev,
          bookmarkedLessonIds: prev.bookmarkedLessonIds.includes(id)
            ? prev.bookmarkedLessonIds.filter((item) => item !== id)
            : [...prev.bookmarkedLessonIds, id],
        })),
      saveNote: (id, note) =>
        setState((prev) => ({ ...prev, notes: { ...prev.notes, [id]: note } })),
      setGoal: (goal) => setState((prev) => ({ ...prev, goal })),
      updateProject: (id, changes) =>
        setState((prev) => ({
          ...prev,
          projects: prev.projects.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        })),
      toggleProjectStep: (id, index) =>
        setState((prev) => {
          const checks = prev.projectChecks[id] ?? [];
          return {
            ...prev,
            projectChecks: {
              ...prev.projectChecks,
              [id]: checks.includes(index)
                ? checks.filter((item) => item !== index)
                : [...checks, index],
            },
          };
        }),
      saveSubmission: (submission) =>
        setState((prev) => ({
          ...prev,
          submissions: [
            ...prev.submissions.filter((item) => item.projectId !== submission.projectId),
            submission,
          ],
        })),
      addPortfolio: (item) =>
        setState((prev) => ({
          ...prev,
          portfolio: [
            ...prev.portfolio.filter((existing) => existing.projectId !== item.projectId),
            item,
          ],
        })),
      togglePortfolioVisibility: (id) =>
        setState((prev) => ({
          ...prev,
          portfolio: prev.portfolio.map((item) =>
            item.id === id ? { ...item, visible: !item.visible } : item,
          ),
        })),
      addPost: (title, body, kind) =>
        setState((prev) => ({
          ...prev,
          posts: [
            {
              id: `p-${Date.now()}`,
              author: 'You · demo',
              role: 'Learner · demo',
              avatar: 'YO',
              kind,
              space: 'General learning',
              time: 'Just now',
              title,
              body,
              likes: 0,
              replies: 0,
              ageSpace: 'general',
              status: 'visible',
            },
            ...prev.posts,
          ],
        })),
      reportPost: (id) =>
        setState((prev) => ({
          ...prev,
          reportedPostIds: [...new Set([...prev.reportedPostIds, id])],
          posts: prev.posts.map((post) =>
            post.id === id ? { ...post, status: 'reported' } : post,
          ),
        })),
      resolvePost: (id) =>
        setState((prev) => ({
          ...prev,
          reportedPostIds: prev.reportedPostIds.filter((item) => item !== id),
          posts: prev.posts.map((post) => (post.id === id ? { ...post, status: 'visible' } : post)),
        })),
      hidePost: (id) =>
        setState((prev) => ({
          ...prev,
          reportedPostIds: prev.reportedPostIds.filter((item) => item !== id),
          posts: prev.posts.map((post) => (post.id === id ? { ...post, status: 'hidden' } : post)),
        })),
      toggleLike: (id) =>
        setState((prev) => {
          const liked = prev.likedPostIds.includes(id);
          return {
            ...prev,
            likedPostIds: liked
              ? prev.likedPostIds.filter((item) => item !== id)
              : [...prev.likedPostIds, id],
            posts: prev.posts.map((post) =>
              post.id === id
                ? { ...post, likes: Math.max(0, post.likes + (liked ? -1 : 1)) }
                : post,
            ),
          };
        }),
      toggleSavedPost: (id) =>
        setState((prev) => ({
          ...prev,
          savedPostIds: prev.savedPostIds.includes(id)
            ? prev.savedPostIds.filter((item) => item !== id)
            : [...prev.savedPostIds, id],
        })),
      addComment: (postId, text) =>
        setState((prev) => ({
          ...prev,
          comments: { ...prev.comments, [postId]: [...(prev.comments[postId] ?? []), text] },
          posts: prev.posts.map((post) =>
            post.id === postId ? { ...post, replies: post.replies + 1 } : post,
          ),
        })),
      toggleCircle: (id) =>
        setState((prev) => ({
          ...prev,
          joinedCircleIds: prev.joinedCircleIds.includes(id)
            ? prev.joinedCircleIds.filter((item) => item !== id)
            : [...prev.joinedCircleIds, id],
        })),
      markNotification: (id) =>
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
        })),
      markAllNotifications: () =>
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((item) => ({ ...item, read: true })),
        })),
      addApplication: (record) =>
        setState((prev) => ({
          ...prev,
          applications: [...prev.applications.filter((item) => item.type !== record.type), record],
        })),
      updateApplicationStatus: (type, status) =>
        setState((prev) => ({
          ...prev,
          applications: prev.applications.map((item) =>
            item.type === type ? { ...item, status } : item,
          ),
        })),
      setReferralCode: (code) =>
        setState((prev) => ({ ...prev, referralCode: prev.referralCode ?? code })),
      addTeacherInvitation: (email) =>
        setState((prev) => ({
          ...prev,
          teacherInvitations: [...new Set([...prev.teacherInvitations, email])],
        })),
      addTeacherAnnouncement: (text) =>
        setState((prev) => ({
          ...prev,
          teacherAnnouncements: [text, ...prev.teacherAnnouncements],
        })),
      updateSchoolProfile: (changes) =>
        setState((prev) => ({ ...prev, schoolProfile: { ...prev.schoolProfile, ...changes } })),
      addSchoolClass: (item) =>
        setState((prev) => ({ ...prev, schoolClasses: [...prev.schoolClasses, item] })),
      updateSchoolClass: (id, changes) =>
        setState((prev) => ({
          ...prev,
          schoolClasses: prev.schoolClasses.map((item) =>
            item.id === id ? { ...item, ...changes } : item,
          ),
        })),
      addSchoolTeacherInvite: (email) =>
        setState((prev) => ({
          ...prev,
          schoolTeacherInvites: [...new Set([...prev.schoolTeacherInvites, email])],
        })),
      addSchoolImportedCount: (count) =>
        setState((prev) => ({ ...prev, schoolImportedCount: prev.schoolImportedCount + count })),
      requestGuardianLink: () => setState((prev) => ({ ...prev, guardianLinkRequested: true })),
      updateGuardianPreferences: (changes) =>
        setState((prev) => ({
          ...prev,
          guardianPreferences: { ...prev.guardianPreferences, ...changes },
        })),
      addSupportTicket: (ticket) =>
        setState((prev) => ({ ...prev, supportTickets: [ticket, ...prev.supportTickets] })),
      addCheckoutRecord: (record) =>
        setState((prev) => ({ ...prev, checkoutHistory: [record, ...prev.checkoutHistory] })),
      resolveSupportTicket: (id) =>
        setState((prev) => ({
          ...prev,
          supportTickets: prev.supportTickets.map((item) =>
            item.id === id ? { ...item, status: 'resolved' } : item,
          ),
        })),
      addAuditEvent: (action) =>
        setState((prev) => ({
          ...prev,
          auditEvents: [
            {
              id: `audit-${Date.now()}`,
              action,
              at: new Date().toISOString(),
              actor: 'Local admin preview',
            },
            ...prev.auditEvents,
          ],
        })),
      setCourseDraft: (draft) => setState((prev) => ({ ...prev, savedCourseDraft: draft })),
      updatePreferences: (changes) =>
        setState((prev) => ({ ...prev, preferences: { ...prev.preferences, ...changes } })),
      updateCurriculum: (reduce) =>
        setState((prev) => ({ ...prev, curriculum: reduce(prev.curriculum) })),
      reset: () => {
        demoRepository.reset();
        setState(demoRepository.load());
      },
    }),
    [],
  );
  return <DemoContext.Provider value={{ state, actions }}>{children}</DemoContext.Provider>;
}

interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggle: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider missing');
  return value;
}
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('desloop-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('desloop-theme', theme);
    } catch {
      /* Optional preference. */
    }
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'info' | 'error';
}
const ToastContext = createContext<{
  toast: (text: string, tone?: ToastMessage['tone']) => void;
} | null>(null);
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('ToastProvider missing');
  return value.toast;
}
function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const toast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            {item.text}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DemoProvider>
            <ToastProvider>{children}</ToastProvider>
          </DemoProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
