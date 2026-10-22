import type { CurriculumProgress } from '@/curriculum/state';

export type Role =
  | 'learner'
  | 'parent'
  | 'teacher_partner'
  | 'classroom_teacher'
  | 'facilitator'
  | 'school_admin'
  | 'platform_admin'
  | 'support'
  | 'moderator';

export type Audience = 'Children' | 'Teenagers' | 'Adults' | 'All ages';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type ContentStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'archived';
export type ApplicationStatus = 'draft' | 'pending' | 'more_info' | 'approved' | 'rejected';

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  objectives: string[];
  paragraphs: string[];
  exercise: string;
  quiz: { question: string; options: string[]; correct: number; explanation: string };
}
export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  audience: Audience;
  level: Level;
  duration: string;
  instructor: string;
  skills: string[];
  project: string;
  accent: 'blue' | 'mint' | 'peach' | 'lavender' | 'amber' | 'navy';
  icon: 'laptop' | 'code' | 'spark' | 'shield' | 'chart' | 'palette';
  modules: Module[];
  featured?: boolean;
}
export interface LearningPath {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  audience: Audience;
  courseIds: string[];
  skills: string[];
  estimatedTime: string;
  outcome: string;
  accent: Course['accent'];
}
export interface Project {
  id: string;
  title: string;
  courseId: string;
  description: string;
  objective: string;
  tools: string[];
  steps: string[];
  skills: string[];
  status: 'not_started' | 'in_progress' | 'submitted' | 'revision_requested' | 'complete';
  due?: string;
  feedback?: string;
}
export interface PortfolioItem {
  id: string;
  projectId: string;
  description: string;
  visible: boolean;
  skills: string[];
}
export interface SchoolClass {
  id: string;
  name: string;
  level: string;
  learnerCount: number;
  assignedCourseId?: string;
  schedule?: string;
}
export interface CourseDraft {
  title: string;
  subject: string;
  audience: Audience;
  objectives: string;
  duration: string;
  language: string;
  teachingStyle: string;
  projectOutcome: string;
  status: ContentStatus;
  modules: {
    id: string;
    title: string;
    lessons: { id: string; title: string; content: string }[];
  }[];
  quizQuestions: string[];
  assignment: string;
}
export interface CommunityPost {
  id: string;
  author: string;
  role: string;
  avatar: string;
  kind: 'question' | 'project' | 'announcement' | 'discussion';
  space: string;
  time: string;
  title: string;
  body: string;
  likes: number;
  replies: number;
  ageSpace: 'general' | 'teen' | 'adult';
  status: 'visible' | 'reported' | 'under_review' | 'hidden';
}
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'learning' | 'feedback' | 'application' | 'community' | 'billing';
  time: string;
  href: string;
  read: boolean;
}
export interface DemoSession {
  name: string;
  email: string;
  role: Role;
  demo: true;
}
export interface ApplicationRecord {
  type: 'teacher' | 'school' | 'facilitator';
  status: ApplicationStatus;
  submittedAt: string;
  applicant: string;
}
export interface SubmissionRecord {
  projectId: string;
  text: string;
  link?: string;
  fileName?: string;
  status: 'draft' | 'submitted' | 'revision_requested' | 'complete';
  submittedAt?: string;
}
export interface SupportTicket {
  id: string;
  topic: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}
export interface AuditEvent {
  id: string;
  action: string;
  at: string;
  actor: string;
}
export interface CheckoutRecord {
  id: string;
  plan: string;
  period: 'monthly' | 'annual';
  method: 'momo' | 'bank' | 'card';
  status: 'success_demo' | 'failed_demo' | 'cancelled_demo';
  at: string;
}
export interface DemoState {
  /** Local preview only: official enrolment and completion must be server-authoritative. */
  curriculum: CurriculumProgress;
  enrolledCourseIds: string[];
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  notes: Record<string, string>;
  goal: string;
  projects: Project[];
  submissions: SubmissionRecord[];
  portfolio: PortfolioItem[];
  posts: CommunityPost[];
  reportedPostIds: string[];
  savedPostIds: string[];
  likedPostIds: string[];
  comments: Record<string, string[]>;
  joinedCircleIds: string[];
  projectChecks: Record<string, number[]>;
  notifications: AppNotification[];
  applications: ApplicationRecord[];
  referralCode: string | null;
  teacherInvitations: string[];
  teacherAnnouncements: string[];
  schoolProfile: { name: string; location: string };
  schoolClasses: SchoolClass[];
  schoolTeacherInvites: string[];
  schoolImportedCount: number;
  guardianLinkRequested: boolean;
  guardianPreferences: { communityPreview: boolean; portfolioPreview: boolean };
  supportTickets: SupportTicket[];
  auditEvents: AuditEvent[];
  checkoutHistory: CheckoutRecord[];
  savedCourseDraft?: CourseDraft;
  preferences: {
    email: boolean;
    reminders: boolean;
    community: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}
