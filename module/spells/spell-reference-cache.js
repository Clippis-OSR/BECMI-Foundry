const uuidCache = new Map();
const spellKeyCache = new Map();

export function getSpellReferenceCache() {
  return { uuidCache, spellKeyCache };
}

export function getCachedSpellByUuid(uuid) {
  return uuidCache.get(uuid) ?? null;
}

export function setCachedSpellByUuid(uuid, spell) {
  if (typeof uuid !== "string" || !uuid || !spell) return;
  uuidCache.set(uuid, spell);
}

export function getCachedSpellByKey(spellKey) {
  return spellKeyCache.get(spellKey) ?? null;
}

export function setCachedSpellByKey(spellKey, spell) {
  if (typeof spellKey !== "string" || !spellKey || !spell) return;
  spellKeyCache.set(spellKey, spell);
}

export function clearSpellReferenceCache() {
  uuidCache.clear();
  spellKeyCache.clear();
}
