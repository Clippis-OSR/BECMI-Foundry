import { describe, it, expect } from 'vitest';
import { shouldRejectSpellName, slugifySpellKey } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell review guardrails', () => {
  it('rejects prose and heading patterns', () => {
    expect(shouldRejectSpellName('This spell improves the morale of friendly')).toBe(true);
    expect(shouldRejectSpellName('SEVENTH LEVEL DRUID SPELLS')).toBe(true);
    expect(shouldRejectSpellName('MAGIC-USER SPELLS')).toBe(true);
    expect(shouldRejectSpellName('A Knock spell will open the Hold Por-')).toBe(true);
  });

  it('rejects uppercase heading and long names', () => {
    expect(shouldRejectSpellName('FIFTH LEVEL DRUID SPELLS')).toBe(true);
    expect(shouldRejectSpellName('The great enemies of all druids are the')).toBe(true);
  });

  it('whitelist-only output filter behavior', () => {
    const whitelist = new Set(['sleep']);
    const strict = new Set(['magic-missile']);
    const rows = [{ spellKey: 'sleep' }, { spellKey: 'magic-missile' }, { spellKey: 'this-spell-will-magically-hold-shut-any' }];
    const filtered = rows.filter((r) => whitelist.has(r.spellKey) || strict.has(r.spellKey));
    expect(filtered.map((r) => r.spellKey)).toEqual(['sleep', 'magic-missile']);
  });

  it('unmatched candidates should be debug-only', () => {
    const whitelist = new Set(['sleep']);
    const strict = new Set(['magic-missile']);
    const blocks = [{ spellName: 'Sleep', spellKey: 'sleep' }, { spellName: 'This spell will magically hold shut any', spellKey: slugifySpellKey('This spell will magically hold shut any') }];
    const unmatched = blocks.filter((b) => !(whitelist.has(b.spellKey) || strict.has(b.spellKey)));
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].spellName.startsWith('This spell')).toBe(true);
  });
});
