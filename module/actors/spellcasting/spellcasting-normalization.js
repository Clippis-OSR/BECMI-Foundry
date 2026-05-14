const CANONICAL_CASTER_KEYS = ["magicUser", "cleric", "elf"];
const SPELL_LEVELS = ["1", "2", "3", "4", "5", "6"];
const LEGACY_ALIAS_KEYS = ["spellsKnown", "spellSlots", "memorizedSpells", "dailySpells", "spells"];

function buildSpellRef(entry = {}) { return { spellKey: typeof entry.spellKey === "string" ? entry.spellKey : "", uuid: typeof entry.uuid === "string" ? entry.uuid : "", itemId: typeof entry.itemId === "string" ? entry.itemId : "" }; }
function buildCaster(casterKey) { const hasKnown = casterKey === "magicUser" || casterKey === "elf"; const base = { enabled: false, prepared: Object.fromEntries(SPELL_LEVELS.map((l) => [l, []])), slots: Object.fromEntries(SPELL_LEVELS.map((l) => [l, { max: 0, used: 0 }])) }; if (hasKnown) base.known = Object.fromEntries(SPELL_LEVELS.map((l) => [l, []])); return base; }

export function normalizeActorSpellcasting(system = {}) {
  for (const key of LEGACY_ALIAS_KEYS) if (Object.prototype.hasOwnProperty.call(system, key)) throw new Error(`[BECMI Spellcasting] Legacy spellcasting alias "${key}" is not supported.`);
  const canonical = { schemaVersion: 1, casters: {} };
  const source = system?.spellcasting && typeof system.spellcasting === "object" ? system.spellcasting : {};
  canonical.schemaVersion = Number(source.schemaVersion) || 1;
  for (const casterKey of CANONICAL_CASTER_KEYS) {
    const base = buildCaster(casterKey);
    const incoming = source?.casters?.[casterKey] && typeof source.casters[casterKey] === "object" ? source.casters[casterKey] : {};
    base.enabled = Boolean(incoming.enabled);
    if (base.known) for (const level of SPELL_LEVELS) base.known[level] = (Array.isArray(incoming?.known?.[level]) ? incoming.known[level] : []).map((e) => buildSpellRef(e));
    for (const level of SPELL_LEVELS) {
      base.prepared[level] = (Array.isArray(incoming?.prepared?.[level]) ? incoming.prepared[level] : []).map((e) => buildSpellRef(e));
      const slot = incoming?.slots?.[level] ?? {};
      const max = Math.max(0, Number(slot.max) || 0); const used = Math.max(0, Number(slot.used) || 0);
      base.slots[level] = { max: Math.floor(max), used: Math.floor(used) };
    }
    canonical.casters[casterKey] = base;
  }
  system.spellcasting = canonical;
  return canonical;
}
