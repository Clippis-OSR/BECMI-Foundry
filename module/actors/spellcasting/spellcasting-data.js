const SPELL_LEVELS = ["1", "2", "3", "4", "5", "6"];
const CASTER_ORDER = ["magicUser", "cleric", "elf"];
const LABELS = { magicUser: "Magic-User", cleric: "Cleric", elf: "Elf" };

export function prepareSpellcastingData(actor) {
  const spellcasting = actor?.system?.spellcasting;
  const derived = {};
  for (const casterKey of CASTER_ORDER) {
    const caster = spellcasting?.casters?.[casterKey]; if (!caster) continue;
    let totalKnown = 0, totalPrepared = 0; const slots = {};
    for (const level of SPELL_LEVELS) {
      const knownCount = Array.isArray(caster?.known?.[level]) ? caster.known[level].length : 0;
      const preparedCount = Array.isArray(caster?.prepared?.[level]) ? caster.prepared[level].length : 0;
      totalKnown += knownCount; totalPrepared += preparedCount;
      const max = Number(caster?.slots?.[level]?.max) || 0; const used = Number(caster?.slots?.[level]?.used) || 0;
      slots[level] = { max, used, remaining: Math.max(0, max - used) };
    }
    derived[casterKey] = { enabled: caster.enabled === true, totalKnown, totalPrepared, slots, summaryLabel: `${LABELS[casterKey]}: ${totalPrepared} prepared` };
  }
  return derived;
}
