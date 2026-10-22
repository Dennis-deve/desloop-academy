import type {
  AppNotification,
  ApplicationRecord,
  CommunityPost,
  Course,
  DemoSession,
  DemoState,
  LearningPath,
  Lesson,
  PortfolioItem,
  Project,
  Role,
  SubmissionRecord,
} from '@/types';

/** All production implementations must enforce authentication and authorisation on the server. */
export interface AuthService {
  current(): DemoSession | null;
  signIn(email: string, password: string): Promise<DemoSession>;
  register(name: string, email: string, password: string): Promise<DemoSession>;
  enterDemo(role: Role): DemoSession;
  switchDemoRole(role: Role): DemoSession;
  updateDemoName(name: string): DemoSession;
  signOut(): void;
}
export interface CatalogService {
  listCourses(): Promise<Course[]>;
  getCourse(slug: string): Promise<Course | null>;
  listPaths(): Promise<LearningPath[]>;
}
export interface LearningService {
  getLesson(courseId: string, lessonId: string): Promise<Lesson | null>;
  completeLesson(lessonId: string): Promise<void>;
  saveNote(lessonId: string, content: string): Promise<void>;
}
export interface AiTutorService {
  respond(input: {
    question: string;
    mode: 'explain' | 'example' | 'hint' | 'try' | 'check' | 'challenge' | 'debug' | 'summary';
    context?: string;
  }): Promise<{ content: string; followUp: string; demo: boolean }>;
}
export interface ProjectService {
  list(): Promise<Project[]>;
  submit(submission: SubmissionRecord): Promise<void>;
  publish(item: PortfolioItem): Promise<void>;
}
export interface CommunityService {
  listPosts(): Promise<CommunityPost[]>;
  report(postId: string, reason: string): Promise<void>;
}
export interface NotificationService {
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
}
export interface ApplicationService {
  submit(application: ApplicationRecord): Promise<void>;
}
export interface DemoStateRepository {
  load(): DemoState;
  save(state: DemoState): void;
  reset(): void;
}

/** Planned server-only domains. Frontend demo never calculates trusted financial or permission state. */
export interface BackendBoundaries {
  profiles: 'server-owned profile & consent records';
  roles: 'server-side permissions and multi-role grants';
  learning: 'courses, paths, lessons, enrolments, progress, assessments';
  projects: 'evidence, uploads, submissions, feedback, portfolio visibility';
  community: 'posts, comments, reports, moderation, age-space policy';
  teacherPartners: 'applications, codes, attribution, disputes, commission ledger';
  schools: 'tenants, memberships, classes, assignments, isolated reports';
  billing: 'plans, subscriptions, verified payments, invoices, refunds, payouts';
  notifications: 'preferences, delivery, read state';
  ai: 'server-mediated requests, safety checks, usage policy, review';
  operations: 'support tickets, audit events, policy configuration';
}
