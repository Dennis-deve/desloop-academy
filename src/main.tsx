import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ReleaseRouter } from '@/app/ReleaseRouter';
import '@fontsource-variable/manrope/index.css';
import '@fontsource/dm-serif-display/400.css';
import '@/styles/index.css';

// The old public-shell worker cached simulated routes. Retire only that static cache;
// do not erase a visitor's local notes or other browser storage without consent.
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.filter((registration) => registration.scope === `${location.origin}/`)
        .map((registration) => registration.unregister())),
    ).catch(() => { /* A missing permission does not open a fake route. */ });
  }
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.filter((name) => name.startsWith('desloop-public-shell-'))
      .map((name) => caches.delete(name)))).catch(() => { /* Best-effort static shell retirement. */ });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ReleaseRouter />
    </BrowserRouter>
  </React.StrictMode>,
);
