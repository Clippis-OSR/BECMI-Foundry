import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('turn undead sheet visibility wiring', () => {
  it('includes cleric turn undead control and roll button', () => {
    const tpl = fs.readFileSync(new URL('../../templates/actor/character-sheet.hbs', import.meta.url), 'utf8');
    expect(tpl).toContain('data-action="turn-undead-target"');
    expect(tpl).toContain('class="roll-turn-undead"');
  });
});
