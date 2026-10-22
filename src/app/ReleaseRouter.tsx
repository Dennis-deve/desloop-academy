import { lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ReleaseLayout } from '@/components/layout/ReleaseLayout';
import { site } from '@/config/site';

// Runtime allowlist: legacy browser-only workspaces are intentionally NOT imported.
const ReleaseHome = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseHome })));
const ReleaseCatalog = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseCatalog })));
const ReleaseCourse = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseCourse })));
const ReleaseMethod = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseMethod })));
const ReleaseAvailability = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseAvailability })));
const ReleaseUnavailable = lazy(() => import('@/features/public/ReleasePages').then((m) => ({ default: m.ReleaseUnavailable })));

// The only private workflow retained is the existing same-origin PostgreSQL adult pilot.
const PilotLayout = lazy(() => import('@/features/pilot/PilotPortal').then((m) => ({ default: m.PilotLayout })));
const PilotHome = lazy(() => import('@/features/pilot/PilotPortal').then((m) => ({ default: m.PilotHome })));
const PilotCoursePage = lazy(() => import('@/features/pilot/PilotCourse').then((m) => ({ default: m.PilotCoursePage })));
const PilotReviewsPage = lazy(() => import('@/features/pilot/PilotReviews').then((m) => ({ default: m.PilotReviewsPage })));
const EngineHome = lazy(() => import('@/features/pilot/engine/EnginePages').then((m) => ({ default: m.EngineHome })));
const EngineCoursePage = lazy(() => import('@/features/pilot/engine/EnginePages').then((m) => ({ default: m.EngineCoursePage })));
const EngineReviewsPage = lazy(() => import('@/features/pilot/engine/EnginePages').then((m) => ({ default: m.EngineReviewsPage })));
const EngineStudioList = lazy(() => import('@/features/pilot/engine/StudioPages').then((m) => ({ default: m.EngineStudioList })));
const EngineStudioProjectPage = lazy(() => import('@/features/pilot/engine/StudioPages').then((m) => ({ default: m.EngineStudioProjectPage })));
const EngineGuidedGateway = lazy(() => import('@/features/pilot/engine/StudioPages').then((m) => ({ default: m.EngineGuidedGateway })));

function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = pathname === '/' ? site.tagline
      : pathname === '/courses' ? 'Course outline'
        : pathname.startsWith('/courses/') ? 'Draft course outline'
          : pathname === '/how-it-works' ? 'How learning works'
            : pathname === '/availability' ? 'Availability'
              : pathname.startsWith('/pilot') ? 'Private adult learning'
                : 'Page unavailable';
    document.title = `${title} · ${site.name}`;
  }, [pathname]);
  return null;
}

export function ReleaseRouter() {
  return <>
    <PageTitle />
    <Routes>
      <Route element={<ReleaseLayout />}>
        <Route path="/" element={<ReleaseHome />} />
        <Route path="/courses" element={<ReleaseCatalog />} />
        <Route path="/courses/:slug" element={<ReleaseCourse />} />
        <Route path="/how-it-works" element={<ReleaseMethod />} />
        <Route path="/availability" element={<ReleaseAvailability />} />
        <Route path="/pilot" element={<PilotLayout />}>
          <Route index element={<PilotHome />} />
          <Route path="courses/:courseId" element={<PilotCoursePage />} />
          <Route path="reviews" element={<PilotReviewsPage />} />
          <Route path="engine" element={<EngineHome />} />
          <Route path="engine/courses/:courseId" element={<EngineCoursePage />} />
          <Route path="engine/reviews" element={<EngineReviewsPage />} />
          <Route path="engine/studio" element={<EngineStudioList />} />
          <Route path="engine/studio/projects/:projectId" element={<EngineStudioProjectPage />} />
          <Route path="engine/guided/:courseId/:lessonId" element={<EngineGuidedGateway />} />
        </Route>
        <Route path="*" element={<ReleaseUnavailable />} />
      </Route>
    </Routes>
  </>;
}
