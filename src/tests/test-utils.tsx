import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { demoAuthService } from '@/services/demo';
import type { Role } from '@/types';

export function renderApp(path = '/', role?: Role) {
  if (role) demoAuthService.enterDemo(role);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Providers>
        <AppRouter />
      </Providers>
    </MemoryRouter>,
  );
}
