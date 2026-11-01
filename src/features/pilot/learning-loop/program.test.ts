import { describe, expect, it } from 'vitest';
import { applyAction, expandProgram, initialSprite, type LabBlock } from './program';

describe('bounded in-tab block interpreter (never course progress)', () => {
  it('reorders explicitly, expands one preceding action twice more, and changes the actual sprite', () => {
    const blocks: LabBlock[] = [
      { id: 'a', kind: 'COLOUR', colour: 'sun' },
      { id: 'b', kind: 'MOVE' },
      { id: 'c', kind: 'REPEAT' },
      { id: 'd', kind: 'SAY' },
    ];
    const actions = expandProgram(blocks);
    expect(actions.map((action) => action.kind)).toEqual(['COLOUR', 'MOVE', 'MOVE', 'MOVE', 'SAY']);
    expect(actions.reduce(applyAction, initialSprite)).toEqual({
      position: 3,
      colour: 'sun',
      speech: 'Hello!',
    });
    expect(expandProgram([blocks[1], blocks[0]])[0].kind).toBe('MOVE');
  });
  it('refuses ambiguous repeats and caps the sprite at space six', () => {
    expect(() => expandProgram([{ id: 'x', kind: 'REPEAT' }])).toThrow(/after/);
    expect(() =>
      expandProgram([
        { id: 'x', kind: 'MOVE' },
        { id: 'y', kind: 'REPEAT' },
        { id: 'z', kind: 'REPEAT' },
      ]),
    ).toThrow(/after/);
    expect(() =>
      expandProgram(Array.from({ length: 9 }, (_, index) => ({ id: String(index), kind: 'MOVE' }))),
    ).toThrow(/eight/);
    const move = { id: 'move', kind: 'MOVE' } as const;
    expect(Array.from({ length: 12 }, () => move).reduce(applyAction, initialSprite).position).toBe(
      5,
    );
  });
});
