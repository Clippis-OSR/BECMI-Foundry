import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('thief sheet visibility wiring', () => {
  it('includes canonical thief ability display and action control', () => {
    const tpl = fs.readFileSync(new URL('../../templates/actor/character-sheet.hbs', import.meta.url), 'utf8');
    expect(tpl).toContain('Find/Remove Traps');
    expect(tpl).toContain('data-skill="findRemoveTraps"');
    expect(tpl).toContain('class="roll-thief-skill"');
  });
});
