import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BlocksEditor } from '@/features/pilot/engine/StudioPages';
import type { VisualDocument } from '@/features/pilot/engine/api';

function Fixture({ readOnly = false }: { readOnly?: boolean }) {
  const [document, setDocument] = useState<VisualDocument>({
    format: 'desloop-visual-v1',
    steps: [{ kind: 'START' }],
  });
  return (
    <>
      <BlocksEditor document={document} onChange={setDocument} readOnly={readOnly} />
      <output data-testid="visual-json">{JSON.stringify(document)}</output>
    </>
  );
}

describe('accessible visual block composer', () => {
  it('adds and edits a block and supports keyboard ordering without executing code', async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    await user.click(screen.getByRole('button', { name: 'Add say block' }));
    const input = screen.getByRole('textbox', { name: 'Block 2: spoken text (fictional)' });
    await user.type(input, 'A fictional bus arrives');
    expect(screen.getByTestId('visual-json')).toHaveTextContent('A fictional bus arrives');
    await user.click(screen.getByRole('button', { name: 'Move block 2 up' }));
    expect(screen.getByTestId('visual-json').textContent).toMatch(
      /^\{"format":"desloop-visual-v1","steps":\[\{"kind":"SAY"/,
    );
    await user.click(screen.getByRole('button', { name: 'Remove block 1' }));
    expect(screen.getByTestId('visual-json').textContent).toContain('"kind":"START"');
  });
  it('prevents changing stored guided evidence in read-only mode', () => {
    render(<Fixture readOnly />);
    expect(screen.getByRole('button', { name: 'Add say block' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove block 1' })).toBeDisabled();
  });
});
