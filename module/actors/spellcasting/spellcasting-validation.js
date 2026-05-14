const SPELL_KEY_PATTERN = /^[a-z]+(?:_[a-z]+)*$/;
const CASTER_KEYS = ["magicUser", "cleric", "elf"];
const SPELL_LEVELS = ["1", "2", "3", "4", "5", "6"];
const LEGACY_ALIAS_KEYS = ["spellsKnown", "spellSlots", "memorizedSpells", "dailySpells", "spells"];
const assert = (c, m) => { if (!c) throw new Error(`[BECMI Spellcasting] ${m}`); };

function validateSpellRefs(entries, context) {
  assert(Array.isArray(entries), `${context} must be an array.`);
  for (const entry of entries) {
    assert(entry && typeof entry === "object" && !Array.isArray(entry), `${context} entries must be canonical reference objects.`);
    assert(typeof entry.spellKey === "string" && SPELL_KEY_PATTERN.test(entry.spellKey), `${context} spellKey must be snake_case.`);
    assert(typeof entry.uuid === "string", `${context} uuid must be a string.`);
    assert(typeof entry.itemId === "string", `${context} itemId must be a string.`);
  }
}

export function validateActorSpellcasting(actorOrData) {
  const system = actorOrData?.system ?? actorOrData;
  for (const key of LEGACY_ALIAS_KEYS) assert(!Object.prototype.hasOwnProperty.call(system ?? {}, key), `Legacy spellcasting alias "${key}" is not supported.`);
  const spellcasting = system?.spellcasting;
  assert(spellcasting && typeof spellcasting === "object", "spellcasting object is required.");
  assert(Number(spellcasting.schemaVersion) === 1, "schemaVersion is required and must be 1.");
  assert(spellcasting.casters && typeof spellcasting.casters === "object", "casters object is required.");
  for (const key of Object.keys(spellcasting.casters)) assert(CASTER_KEYS.includes(key), `Invalid caster key "${key}".`);

  for (const casterKey of CASTER_KEYS) {
    const caster = spellcasting.casters[casterKey];
    assert(caster && typeof caster === "object", `Missing canonical caster structure for ${casterKey}.`);
    assert(typeof caster.enabled === "boolean", `${casterKey}.enabled must be boolean.`);

    if (casterKey !== "cleric") {
      assert(caster.known && typeof caster.known === "object", `${casterKey}.known is required.`);
      for (const k of Object.keys(caster.known)) assert(SPELL_LEVELS.includes(k), `${casterKey}.known has invalid spell level "${k}".`);
      for (const level of SPELL_LEVELS) validateSpellRefs(caster.known[level], `${casterKey}.known.${level}`);
    }

    assert(caster.prepared && typeof caster.prepared === "object", `${casterKey}.prepared is required.`);
    for (const k of Object.keys(caster.prepared)) assert(SPELL_LEVELS.includes(k), `${casterKey}.prepared has invalid spell level "${k}".`);

    assert(caster.slots && typeof caster.slots === "object", `${casterKey}.slots is required.`);
    for (const k of Object.keys(caster.slots)) assert(SPELL_LEVELS.includes(k), `${casterKey}.slots has invalid spell level "${k}".`);

    for (const level of SPELL_LEVELS) {
      validateSpellRefs(caster.prepared[level], `${casterKey}.prepared.${level}`);
      const slot = caster.slots[level];
      assert(slot && typeof slot === "object", `${casterKey}.slots.${level} is required.`);
      const max = Number(slot.max), used = Number(slot.used);
      assert(Number.isFinite(max) && max >= 0, `${casterKey}.slots.${level}.max must be >= 0.`);
      assert(Number.isFinite(used) && used >= 0, `${casterKey}.slots.${level}.used must be >= 0.`);
      assert(used <= max, `${casterKey}.slots.${level}.used cannot exceed max.`);
    }
  }
}
