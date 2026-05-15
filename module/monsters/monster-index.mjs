function createIndexState() {
  return {
    byMonsterKey: new Map(),
    bySourceBook: new Map(),
    byAlignment: new Map()
  };
}

const indexes = createIndexState();

function pushIndexedValue(map, key, monster) {
  const bucket = map.get(key) ?? [];
  bucket.push(monster);
  map.set(key, bucket);
}

export function registerMonsterIndex(monster) {
  const monsterKey = monster?.system?.monsterKey;
  if (!monsterKey) throw new Error('[BECMI Monster Index] Cannot index monster without monsterKey.');
  if (indexes.byMonsterKey.has(monsterKey)) throw new Error(`[BECMI Monster Index] duplicate monsterKey "${monsterKey}" during registration.`);

  indexes.byMonsterKey.set(monsterKey, monster);
  pushIndexedValue(indexes.bySourceBook, String(monster.system?.source?.book ?? ''), monster);
  pushIndexedValue(indexes.byAlignment, String(monster.system?.alignment ?? ''), monster);
}

export function getMonsterByKey(monsterKey) {
  return indexes.byMonsterKey.get(monsterKey) ?? null;
}

export function getMonstersBySourceBook(book) {
  return [...(indexes.bySourceBook.get(String(book ?? '')) ?? [])];
}

export function getMonstersByAlignment(alignment) {
  return [...(indexes.byAlignment.get(String(alignment ?? '')) ?? [])];
}

export function clearMonsterIndexes() {
  indexes.byMonsterKey.clear();
  indexes.bySourceBook.clear();
  indexes.byAlignment.clear();
}
