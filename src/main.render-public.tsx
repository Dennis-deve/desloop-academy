import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PublicOnlyRouter } from '@/app/PublicOnlyRouter';
import '@fontsource-variable/manrope/index.css';
import '@fontsource/dm-serif-display/400.css';
import '@/styles/index.css';

// Retire only the old static mock-workspace cache if this guide replaces an older site
// on the same origin; never erase unrelated browser notes or user data.
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.scope === `${location.origin}/`)
            .map((registration) => registration.unregister()),
        ),
      )
      .catch(() => {});
  }
  if ('caches' in window) {
    void caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((name) => name.startsWith('desloop-public-shell-'))
            .map((name) => caches.delete(name)),
        ),
      )
      .catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PublicOnlyRouter />
    </BrowserRouter>
  </React.StrictMode>,
);
