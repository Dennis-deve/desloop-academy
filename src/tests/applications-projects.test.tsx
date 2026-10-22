import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test-utils';

describe('applications and project workflows', () => {
  it('validates a teacher application and shows an honest local confirmation', async () => {
    const user = userEvent.setup();
    renderApp('/apply/teacher');
    await user.click(await screen.findByRole('button', { name: /Preview application/i }));
    expect(await screen.findByText(/Enter your name/i)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Full name/i }), 'Ama Teacher');
    await user.type(screen.getByRole('textbox', { name: /Email address/i }), 'ama@example.com');
    await user.type(
      screen.getByRole('textbox', { name: /Teaching or professional background/i }),
      'I support digital literacy learners through practical lessons.',
    );
    await user.type(
      screen.getByRole('textbox', { name: /Areas of expertise/i }),
      'Digital literacy',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Learners you plan to support/i }),
      'Adults',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Preview application/i }));
    expect(await screen.findByRole('heading', { name: /Preview submitted/i })).toBeInTheDocument();
    expect(screen.getByText(/No application has been delivered/i)).toBeInTheDocument();
  });
  it('previews school application steps without inventing an approval', async () => {
    const user = userEvent.setup();
    renderApp('/apply/school');
    await user.click(await screen.findByRole('button', { name: /Continue/i }));
    expect(await screen.findByText(/Enter your school name/i)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /School name/i }), 'Demo School');
    await user.selectOptions(screen.getByRole('combobox', { name: /School type/i }), 'Junior high');
    await user.type(screen.getByRole('textbox', { name: /General location/i }), 'Accra');
    await user.type(
      screen.getByRole('textbox', { name: /Authorised representative/i }),
      'Kofi Mensah',
    );
    await user.type(
      screen.getByRole('textbox', { name: /Official contact email/i }),
      'kofi@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    expect(await screen.findByRole('heading', { name: 'School application' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Estimated learners/i })).toBeInTheDocument();
  });
  it('records a project draft and honest submission state locally', async () => {
    const user = userEvent.setup();
    renderApp('/app/projects/toolkit', 'learner');
    await user.type(
      await screen.findByRole('textbox', { name: /Describe your work/i }),
      'I made a guide with useful steps for organising my files safely.',
    );
    await user.click(screen.getByRole('button', { name: /Record demo submission/i }));
    expect(
      screen.getByRole('dialog', { name: /Record your demo submission/i }),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^Record demo submission$/i }),
    );
    expect(await screen.findByText(/Latest local record/i)).toBeInTheDocument();
    expect(screen.getByText(/awaiting a sample review outcome/i)).toBeInTheDocument();
  });
  it('renders a safe empty portfolio', async () => {
    renderApp('/app/portfolio', 'learner');
    expect(
      await screen.findByRole('heading', { name: /Your portfolio starts with a project/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/private by default/i)).toBeInTheDocument();
  });
});
