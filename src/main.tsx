import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@fontsource-variable/manrope/index.css';
import '@fontsource/dm-serif-display/400.css';
import '@/styles/index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Offline shell is optional. */
    });
  });
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Providers>
        <AppRouter />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>,
);
