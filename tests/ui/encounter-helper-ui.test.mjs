import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('creature encounter helper ui wiring', () => {
  it('renders lightweight gm controls for quick encounter groups without automation', () => {
    const tpl = fs.readFileSync(new URL('../../templates/actor/creature-sheet.hbs', import.meta.url), 'utf8');
    expect(tpl).toContain('Encounter Helper');
    expect(tpl).toContain('data-action="encounter-helper-dungeon"');
    expect(tpl).toContain('data-action="encounter-helper-wilderness"');
    expect(tpl).toContain('without auto-running initiative');
  });

  it('shows morale and movement visibility fields', () => {
    const tpl = fs.readFileSync(new URL('../../templates/actor/creature-sheet.hbs', import.meta.url), 'utf8');
    expect(tpl).toContain('<strong>Morale:</strong>');
    expect(tpl).toContain('<strong>Movement:</strong>');
    expect(tpl).toContain('<strong>Number Appearing:</strong>');
  });
});
