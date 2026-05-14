function createIndexState() {
  return {
    bySpellKey: new Map(),
    byLevel: new Map(),
    bySpellList: new Map(),
    byTag: new Map()
  };
}

const indexes = createIndexState();

function pushIndexedValue(map, key, spell) {
  const bucket = map.get(key) ?? [];
  bucket.push(spell);
  map.set(key, bucket);
}

export function registerSpellIndex(spell) {
  const spellKey = spell?.system?.spellKey;
  if (!spellKey) throw new Error("[BECMI Spell Index] Cannot index spell without spellKey.");
  if (indexes.bySpellKey.has(spellKey)) throw new Error(`[BECMI Spell Index] duplicate spellKey \"${spellKey}\" during registration.`);

  indexes.bySpellKey.set(spellKey, spell);
  pushIndexedValue(indexes.byLevel, Number(spell.system.level), spell);

  for (const list of spell.system.spellLists ?? []) pushIndexedValue(indexes.bySpellList, list, spell);
  for (const tag of spell.system.tags ?? []) pushIndexedValue(indexes.byTag, tag, spell);
}

export function getSpellByKey(spellKey) {
  return indexes.bySpellKey.get(spellKey) ?? null;
}

export function getSpellsByLevel(level) {
  return [...(indexes.byLevel.get(Number(level)) ?? [])];
}

export function getSpellsByList(spellList) {
  return [...(indexes.bySpellList.get(spellList) ?? [])];
}

export function getSpellsByTag(tag) {
  return [...(indexes.byTag.get(tag) ?? [])];
}

export function clearSpellIndexes() {
  indexes.bySpellKey.clear();
  indexes.byLevel.clear();
  indexes.bySpellList.clear();
  indexes.byTag.clear();
}
