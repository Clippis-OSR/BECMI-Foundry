import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('actor turn undead runtime wiring', () => {
  it('maps turn undead into character derived runtime fields', () => {
    const src = fs.readFileSync(new URL('../../module/actors/becmi-actor.mjs', import.meta.url), 'utf8');
    expect(src).toContain('hasTurnUndead');
    expect(src).toContain('getCanonicalTurnUndeadTable');
    expect(src).toContain('turnUndead: hasTurnUndead ? getCanonicalTurnUndeadTable');
  });
});
