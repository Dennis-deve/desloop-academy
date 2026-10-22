import { lazy, useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { Container, EmptyState, buttonStyles } from '@/components/ui';
import { site } from '@/config/site';
import { useAuth } from '@/app/providers';
import type { Role } from '@/types';
// The landing and access flows also load on demand; shared shells remain interactive.
const HomePage = lazy(() =>
  import('@/features/public/HomePage').then((module) => ({ default: module.HomePage })),
);
const SignInPage = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.SignInPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.VerifyEmailPage })),
);
const DemoGate = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.DemoGate })),
);
const OnboardingPage = lazy(() =>
  import('@/features/auth/AuthPages').then((module) => ({ default: module.OnboardingPage })),
);
const PilotLayout = lazy(() =>
  import('@/features/pilot/PilotPortal').then((module) => ({ default: module.PilotLayout })),
);
const PilotHome = lazy(() =>
  import('@/features/pilot/PilotPortal').then((module) => ({ default: module.PilotHome })),
);
const PilotCoursePage = lazy(() =>
  import('@/features/pilot/PilotCourse').then((module) => ({ default: module.PilotCoursePage })),
);
const PilotReviewsPage = lazy(() =>
  import('@/features/pilot/PilotReviews').then((module) => ({ default: module.PilotReviewsPage })),
);

// Public sections and multi-step applications load only when visited.
const ExplorePage = lazy(() =>
  import('@/features/public/ExplorePages').then((module) => ({ default: module.ExplorePage })),
);
const AudiencePage = lazy(() =>
  import('@/features/public/ExplorePages').then((module) => ({ default: module.AudiencePage })),
);

const TeachersPage = lazy(() =>
  import('@/features/public/PartnerPages').then((module) => ({ default: module.TeachersPage })),
);
const SchoolsPage = lazy(() =>
  import('@/features/public/PartnerPages').then((module) => ({ default: module.SchoolsPage })),
);
const ParentsPage = lazy(() =>
  import('@/features/public/PartnerPages').then((module) => ({ default: module.ParentsPage })),
);
const FacilitatorsPage = lazy(() =>
  import('@/features/public/PartnerPages').then((module) => ({ default: module.FacilitatorsPage })),
);

const AboutPage = lazy(() =>
  import('@/features/public/InfoPages').then((module) => ({ default: module.AboutPage })),
);
const ProjectGalleryPage = lazy(() =>
  import('@/features/public/InfoPages').then((module) => ({ default: module.ProjectGalleryPage })),
);
const ContactPage = lazy(() =>
  import('@/features/public/InfoPages').then((module) => ({ default: module.ContactPage })),
);
const FAQPage = lazy(() =>
  import('@/features/public/InfoPages').then((module) => ({ default: module.FAQPage })),
);
const PolicyPage = lazy(() =>
  import('@/features/public/InfoPages').then((module) => ({ default: module.PolicyPage })),
);

const CatalogPage = lazy(() =>
  import('@/features/courses/CatalogPages').then((module) => ({ default: module.CatalogPage })),
);
const CourseDetailPage = lazy(() =>
  import('@/features/courses/CatalogPages').then((module) => ({
    default: module.CourseDetailPage,
  })),
);

// The required curriculum is lazy-loaded; illustrative workshops stay separate.
const CurriculumCatalogPage = lazy(() =>
  import('@/features/curriculum/CurriculumMap').then((module) => ({
    default: module.CurriculumCatalogPage,
  })),
);
const CurriculumCoursePage = lazy(() =>
  import('@/features/curriculum/CurriculumMap').then((module) => ({
    default: module.CurriculumCoursePage,
  })),
);
const CurriculumLessonPage = lazy(() =>
  import('@/features/curriculum/LearningFlow').then((module) => ({
    default: module.CurriculumLessonPage,
  })),
);
const CurriculumAssessmentPage = lazy(() =>
  import('@/features/curriculum/LearningFlow').then((module) => ({
    default: module.CurriculumAssessmentPage,
  })),
);
const CurriculumReviewPage = lazy(() =>
  import('@/features/curriculum/ReviewQueue').then((module) => ({
    default: module.CurriculumReviewPage,
  })),
);

const TeacherApplicationPage = lazy(() =>
  import('@/features/auth/ApplicationPages').then((module) => ({
    default: module.TeacherApplicationPage,
  })),
);
const SchoolApplicationPage = lazy(() =>
  import('@/features/auth/ApplicationPages').then((module) => ({
    default: module.SchoolApplicationPage,
  })),
);
const FacilitatorApplicationPage = lazy(() =>
  import('@/features/auth/ApplicationPages').then((module) => ({
    default: module.FacilitatorApplicationPage,
  })),
);

const PricingPage = lazy(() =>
  import('@/features/subscriptions/BillingPages').then((module) => ({
    default: module.PricingPage,
  })),
);
const CheckoutPage = lazy(() =>
  import('@/features/subscriptions/BillingPages').then((module) => ({
    default: module.CheckoutPage,
  })),
);
const BillingPage = lazy(() =>
  import('@/features/subscriptions/BillingPages').then((module) => ({
    default: module.BillingPage,
  })),
);

// Workspaces are split by feature so the public landing page does not download every role.
// LearnerDashboard
const LearnerDashboard = lazy(() =>
  import('@/features/learning/LearnerDashboard').then((module) => ({
    default: module.LearnerDashboard,
  })),
);
// LessonViewer
const LessonViewer = lazy(() =>
  import('@/features/learning/LessonViewer').then((module) => ({ default: module.LessonViewer })),
);
// AiStudio
const AiStudio = lazy(() =>
  import('@/features/ai-tutor/AiStudio').then((module) => ({ default: module.AiStudio })),
);
// ProjectStudio
const ProjectsPage = lazy(() =>
  import('@/features/projects/ProjectStudio').then((module) => ({ default: module.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import('@/features/projects/ProjectStudio').then((module) => ({
    default: module.ProjectDetailPage,
  })),
);
// PortfolioPages
const PortfolioPage = lazy(() =>
  import('@/features/portfolio/PortfolioPages').then((module) => ({
    default: module.PortfolioPage,
  })),
);
// CommunityPages
const CommunityPage = lazy(() =>
  import('@/features/community/CommunityPages').then((module) => ({
    default: module.CommunityPage,
  })),
);
const CirclesPage = lazy(() =>
  import('@/features/community/CommunityPages').then((module) => ({ default: module.CirclesPage })),
);
// TeacherDashboard
const TeacherDashboard = lazy(() =>
  import('@/features/teachers/TeacherDashboard').then((module) => ({
    default: module.TeacherDashboard,
  })),
);
const TeacherInvitationsPage = lazy(() =>
  import('@/features/teachers/TeacherDashboard').then((module) => ({
    default: module.TeacherInvitationsPage,
  })),
);
const TeacherLearnersPage = lazy(() =>
  import('@/features/teachers/TeacherDashboard').then((module) => ({
    default: module.TeacherLearnersPage,
  })),
);
const TeacherEarningsPage = lazy(() =>
  import('@/features/teachers/TeacherDashboard').then((module) => ({
    default: module.TeacherEarningsPage,
  })),
);
const TeacherEngagementPage = lazy(() =>
  import('@/features/teachers/TeacherDashboard').then((module) => ({
    default: module.TeacherEngagementPage,
  })),
);
// SchoolDashboard
const SchoolDashboard = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolDashboard,
  })),
);
const SchoolLaunchPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolLaunchPage,
  })),
);
const SchoolClassesPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolClassesPage,
  })),
);
const SchoolPeoplePage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolPeoplePage,
  })),
);
const SchoolReportsPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolReportsPage,
  })),
);
const SchoolSettingsPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.SchoolSettingsPage,
  })),
);
const ClassroomDashboard = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.ClassroomDashboard,
  })),
);
const ClassroomClassesPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.ClassroomClassesPage,
  })),
);
const ClassroomReviewPage = lazy(() =>
  import('@/features/schools/SchoolDashboard').then((module) => ({
    default: module.ClassroomReviewPage,
  })),
);
// ParentPortal
const ParentDashboard = lazy(() =>
  import('@/features/parents/ParentPortal').then((module) => ({ default: module.ParentDashboard })),
);
const ParentProgressPage = lazy(() =>
  import('@/features/parents/ParentPortal').then((module) => ({
    default: module.ParentProgressPage,
  })),
);
const ParentSafetyPage = lazy(() =>
  import('@/features/parents/ParentPortal').then((module) => ({
    default: module.ParentSafetyPage,
  })),
);
// FacilitatorPages
const FacilitatorDashboard = lazy(() =>
  import('@/features/facilitators/FacilitatorPages').then((module) => ({
    default: module.FacilitatorDashboard,
  })),
);
const FacilitatorCoursesPage = lazy(() =>
  import('@/features/facilitators/FacilitatorPages').then((module) => ({
    default: module.FacilitatorCoursesPage,
  })),
);
const CourseEditorPage = lazy(() =>
  import('@/features/facilitators/FacilitatorPages').then((module) => ({
    default: module.CourseEditorPage,
  })),
);
const FacilitatorReviewsPage = lazy(() =>
  import('@/features/facilitators/FacilitatorPages').then((module) => ({
    default: module.FacilitatorReviewsPage,
  })),
);
// AdminPages
const AdminDashboard = lazy(() =>
  import('@/features/admin/AdminPages').then((module) => ({ default: module.AdminDashboard })),
);
const AdminApplicationsPage = lazy(() =>
  import('@/features/admin/AdminPages').then((module) => ({
    default: module.AdminApplicationsPage,
  })),
);
const AdminContentPage = lazy(() =>
  import('@/features/admin/AdminPages').then((module) => ({ default: module.AdminContentPage })),
);
const AdminModerationPage = lazy(() =>
  import('@/features/admin/AdminPages').then((module) => ({ default: module.AdminModerationPage })),
);
const AdminOperationsPage = lazy(() =>
  import('@/features/admin/AdminPages').then((module) => ({ default: module.AdminOperationsPage })),
);
// WorkspacePages
const NotificationsPage = lazy(() =>
  import('@/features/notifications/WorkspacePages').then((module) => ({
    default: module.NotificationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/features/notifications/WorkspacePages').then((module) => ({
    default: module.SettingsPage,
  })),
);
const WorkspaceSupportPage = lazy(() =>
  import('@/features/notifications/WorkspacePages').then((module) => ({
    default: module.WorkspaceSupportPage,
  })),
);
// OfflinePages
const OfflinePage = lazy(() =>
  import('@/features/offline/OfflinePages').then((module) => ({ default: module.OfflinePage })),
);
const OfflineLessonPage = lazy(() =>
  import('@/features/offline/OfflinePages').then((module) => ({
    default: module.OfflineLessonPage,
  })),
);

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      window.setTimeout(
        () => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }),
        80,
      );
    } else window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    document.title = `${pathname === '/' ? site.tagline : (pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') ?? 'Learn')} · ${site.name}`;
  }, [pathname]);
  return null;
}
function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  return session ? (
    <Outlet />
  ) : (
    <Navigate
      to={`/demo?next=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
function RequireRole({ allowed }: { allowed: Role[] }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/demo" replace />;
  return allowed.includes(session.role) ? (
    <Outlet />
  ) : (
    <div className="mx-auto max-w-4xl">
      <DemoGate requiredRole={allowed} />
    </div>
  );
}
function LessonRoute() {
  const { courseId, lessonId } = useParams();
  return courseId?.startsWith('course-') ? (
    <CurriculumLessonPage />
  ) : (
    <Navigate to={`/app/sample-lesson/${courseId ?? ''}/${lessonId ?? ''}`} replace />
  );
}
function NotFoundPage() {
  return (
    <section className="public-bg py-20">
      <Container>
        <EmptyState
          icon={Compass}
          title="This path is not here yet"
          description="The page may have moved. Find a new direction from the homepage or course catalogue."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/" className={buttonStyles('primary')}>
                Go home <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/courses" className={buttonStyles('outline')}>
                Browse courses
              </Link>
            </div>
          }
        />
      </Container>
    </section>
  );
}

export function AppRouter() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/courses" element={<CurriculumCatalogPage />} />
          <Route path="/curriculum" element={<Navigate to="/courses" replace />} />
          <Route path="/courses/:slug" element={<CurriculumCoursePage />} />
          <Route path="/paths" element={<Navigate to="/courses" replace />} />
          <Route path="/sample-courses" element={<CatalogPage />} />
          <Route path="/sample-courses/:slug" element={<CourseDetailPage />} />
          <Route path="/learn/children" element={<AudiencePage audience="children" />} />
          <Route path="/learn/teens" element={<AudiencePage audience="teens" />} />
          <Route path="/learn/adults" element={<AudiencePage audience="adults" />} />
          <Route path="/learn/careers" element={<AudiencePage audience="careers" />} />
          <Route path="/parents" element={<ParentsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/facilitators" element={<FacilitatorsPage />} />
          <Route path="/projects" element={<ProjectGalleryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/support" element={<ContactPage support />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/privacy" element={<PolicyPage page="privacy" />} />
          <Route path="/terms" element={<PolicyPage page="terms" />} />
          <Route
            path="/community-guidelines"
            element={<PolicyPage page="community-guidelines" />}
          />
          <Route path="/child-safety" element={<PolicyPage page="child-safety" />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/demo" element={<DemoGate />} />
          <Route path="/pilot" element={<PilotLayout />}>
            <Route index element={<PilotHome />} />
            <Route path="courses/:courseId" element={<PilotCoursePage />} />
            <Route path="reviews" element={<PilotReviewsPage />} />
          </Route>
          <Route path="/apply/teacher" element={<TeacherApplicationPage />} />
          <Route path="/apply/school" element={<SchoolApplicationPage />} />
          <Route path="/apply/facilitator" element={<FacilitatorApplicationPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/workspace/notifications" element={<NotificationsPage />} />
            <Route path="/workspace/settings" element={<SettingsPage />} />
            <Route path="/workspace/support" element={<WorkspaceSupportPage />} />
            <Route path="/workspace/billing" element={<BillingPage />} />
            <Route path="/workspace/checkout" element={<CheckoutPage />} />
            <Route element={<RequireRole allowed={['learner']} />}>
              <Route path="/app" element={<LearnerDashboard />} />
              <Route path="/app/courses" element={<CurriculumCatalogPage embedded />} />
              <Route path="/app/curriculum" element={<Navigate to="/app/courses" replace />} />
              <Route path="/app/samples" element={<CatalogPage embedded />} />
              <Route path="/app/learn/:courseId/:lessonId" element={<LessonRoute />} />
              <Route path="/app/sample-lesson/:courseId/:lessonId" element={<LessonViewer />} />
              <Route path="/app/assess/:courseId" element={<CurriculumAssessmentPage />} />
              <Route path="/app/ai-studio" element={<AiStudio />} />
              <Route path="/app/projects" element={<ProjectsPage />} />
              <Route path="/app/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/app/portfolio" element={<PortfolioPage />} />
              <Route path="/app/community" element={<CommunityPage />} />
              <Route path="/app/circles" element={<CirclesPage />} />
              <Route path="/app/offline" element={<OfflinePage />} />
              <Route path="/app/offline/:id" element={<OfflineLessonPage />} />
            </Route>
            <Route element={<RequireRole allowed={['teacher_partner']} />}>
              <Route path="/partner" element={<TeacherDashboard />} />
              <Route path="/partner/invitations" element={<TeacherInvitationsPage />} />
              <Route path="/partner/learners" element={<TeacherLearnersPage />} />
              <Route path="/partner/earnings" element={<TeacherEarningsPage />} />
              <Route path="/partner/engagement" element={<TeacherEngagementPage />} />
            </Route>
            <Route element={<RequireRole allowed={['school_admin']} />}>
              <Route path="/school" element={<SchoolDashboard />} />
              <Route path="/school/launch" element={<SchoolLaunchPage />} />
              <Route path="/school/classes" element={<SchoolClassesPage />} />
              <Route path="/school/people" element={<SchoolPeoplePage />} />
              <Route path="/school/reports" element={<SchoolReportsPage />} />
              <Route path="/school/settings" element={<SchoolSettingsPage />} />
            </Route>
            <Route element={<RequireRole allowed={['classroom_teacher']} />}>
              <Route path="/classroom" element={<ClassroomDashboard />} />
              <Route path="/classroom/classes" element={<ClassroomClassesPage />} />
              <Route path="/classroom/review" element={<ClassroomReviewPage />} />
              <Route path="/classroom/pathway-reviews" element={<CurriculumReviewPage />} />
            </Route>
            <Route element={<RequireRole allowed={['parent']} />}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/progress" element={<ParentProgressPage />} />
              <Route path="/parent/safety" element={<ParentSafetyPage />} />
            </Route>
            <Route element={<RequireRole allowed={['facilitator']} />}>
              <Route path="/facilitator" element={<FacilitatorDashboard />} />
              <Route path="/facilitator/courses" element={<FacilitatorCoursesPage />} />
              <Route path="/facilitator/courses/new" element={<CourseEditorPage />} />
              <Route path="/facilitator/reviews" element={<FacilitatorReviewsPage />} />
              <Route path="/facilitator/pathway-reviews" element={<CurriculumReviewPage />} />
            </Route>
            <Route element={<RequireRole allowed={['platform_admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/applications" element={<AdminApplicationsPage />} />
              <Route path="/admin/content" element={<AdminContentPage />} />
            </Route>
            <Route element={<RequireRole allowed={['platform_admin', 'moderator']} />}>
              <Route path="/admin/moderation" element={<AdminModerationPage />} />
            </Route>
            <Route element={<RequireRole allowed={['platform_admin', 'support']} />}>
              <Route path="/admin/operations" element={<AdminOperationsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
