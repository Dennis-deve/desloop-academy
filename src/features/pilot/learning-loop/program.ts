/** A bounded in-tab SVG activity, separate from all server-owned course credit. */
export type SpriteColour = 'teal' | 'coral' | 'sun';
export type BlockKind = 'MOVE' | 'SAY' | 'COLOUR' | 'REPEAT';
export type LabBlock = { id: string; kind: BlockKind; colour?: SpriteColour };
export type LabAction = { id: string; kind: Exclude<BlockKind, 'REPEAT'>; colour?: SpriteColour };
export type Sprite = { position: number; colour: SpriteColour; speech: string };
export const initialSprite: Sprite = { position: 0, colour: 'teal', speech: '' };

export function expandProgram(blocks: LabBlock[]): LabAction[] {
  if (blocks.length > 8) throw new Error('Use no more than eight blocks in this small activity.');
  const actions: LabAction[] = [];
  let previous: LabAction | null = null;
  for (const block of blocks) {
    if (block.kind === 'REPEAT') {
      if (!previous) throw new Error('Put Repeat after a Move, Say or Colour block.');
      // Repeat means two *additional* executions of the immediately previous
      // action, never an unbounded loop or an execution of all earlier blocks.
      actions.push({ ...previous, id: `${block.id}-1` }, { ...previous, id: `${block.id}-2` });
      previous = null; // A second Repeat cannot silently reuse an earlier action.
    } else {
      previous = { id: block.id, kind: block.kind, colour: block.colour };
      actions.push(previous);
    }
  }
  return actions;
}

export function applyAction(sprite: Sprite, action: LabAction): Sprite {
  switch (action.kind) {
    case 'MOVE':
      return { ...sprite, position: Math.min(5, sprite.position + 1), speech: '' };
    case 'SAY':
      return { ...sprite, speech: 'Hello!' };
    case 'COLOUR':
      return { ...sprite, colour: action.colour ?? 'coral', speech: '' };
  }
}
