import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ReleaseLayout } from '@/components/layout/ReleaseLayout';
import { site } from '@/config/site';
import {
  ReleaseCatalog,
  ReleaseCourse,
  ReleaseHome,
  ReleaseMethod,
  ReleaseUnavailable,
} from '@/features/public/ReleasePages';
import { PublicOnlyAvailability } from '@/features/public/PublicOnlyAvailability';

// Deliberately separate from ReleaseRouter: no pilot, auth, AI, learning-engine or API imports.
function PublicPageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title =
      pathname === '/'
        ? site.tagline
        : pathname === '/courses'
          ? 'Course outline'
          : pathname.startsWith('/courses/')
            ? 'Draft course outline'
            : pathname === '/how-it-works'
              ? 'How learning works'
              : pathname === '/availability'
                ? 'Availability'
                : 'Page unavailable';
    document.title = `${title} · ${site.name}`;
  }, [pathname]);
  return null;
}

export function PublicOnlyRouter() {
  return (
    <>
      <PublicPageTitle />
      <Routes>
        <Route element={<ReleaseLayout />}>
          <Route path="/" element={<ReleaseHome />} />
          <Route path="/courses" element={<ReleaseCatalog />} />
          <Route path="/courses/:slug" element={<ReleaseCourse />} />
          <Route path="/how-it-works" element={<ReleaseMethod />} />
          <Route path="/availability" element={<PublicOnlyAvailability />} />
          <Route path="*" element={<ReleaseUnavailable />} />
        </Route>
      </Routes>
    </>
  );
}
