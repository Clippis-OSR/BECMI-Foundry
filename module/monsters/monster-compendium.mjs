import { normalizeMonsterData } from './monster-data.mjs';
import { validateMonsterSchema } from './monster-validation.mjs';
import { registerMonsterIndex } from './monster-index.mjs';

function deepClone(value) {
  return globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

function createMonsterEntry(monsterData) {
  return {
    type: 'creature',
    name: monsterData.name,
    system: deepClone(monsterData)
  };
}

export function validateMonsterCompendiumIntegrity(entries) {
  const diagnostics = { imported: 0, skipped: 0, duplicates: [], errors: [], warnings: [] };
  const seen = new Set();

  for (const entry of entries) {
    try {
      validateMonsterSchema(entry, `compendium monster "${entry?.name ?? 'Unknown'}"`);
      const monsterKey = entry.system.monsterKey;
      if (seen.has(monsterKey)) throw new Error(`[BECMI Monster Compendium] duplicate monsterKey "${monsterKey}" in compendium.`);
      seen.add(monsterKey);
      diagnostics.imported += 1;
    } catch (error) {
      diagnostics.errors.push(String(error?.message ?? error));
      if (String(error?.message ?? '').includes('duplicate monsterKey')) diagnostics.duplicates.push(entry?.system?.monsterKey ?? 'unknown');
    }
  }

  if (diagnostics.errors.length > 0) {
    throw new Error(`[BECMI Monster Compendium] integrity validation failed: ${diagnostics.errors.join(' | ')}`);
  }

  return diagnostics;
}

export function importMonsterData(monsters) {
  if (!Array.isArray(monsters)) throw new Error('[BECMI Monster Import] importMonsterData expects an array of canonical monsters.');

  const diagnostics = { imported: 0, skipped: 0, duplicates: [], errors: [], warnings: [] };
  const importedMonsters = [];
  const seenMonsterKeys = new Set();

  for (const rawMonster of monsters) {
    try {
      const normalized = normalizeMonsterData(rawMonster?.system ?? rawMonster);
      validateMonsterSchema(normalized, `import monster "${normalized?.name ?? 'Unknown'}"`);
      if (seenMonsterKeys.has(normalized.monsterKey)) {
        throw new Error(`[BECMI Monster Import] duplicate monsterKey "${normalized.monsterKey}" during import.`);
      }
      seenMonsterKeys.add(normalized.monsterKey);
      const item = createMonsterEntry(normalized);
      registerMonsterIndex(item);
      importedMonsters.push(item);
      diagnostics.imported += 1;
    } catch (error) {
      diagnostics.errors.push(String(error?.message ?? error));
      if (String(error?.message ?? '').includes('duplicate monsterKey')) diagnostics.duplicates.push(rawMonster?.monsterKey ?? rawMonster?.system?.monsterKey ?? 'unknown');
    }
  }

  if (diagnostics.errors.length > 0) {
    throw new Error(`[BECMI Monster Import] import failed with ${diagnostics.errors.length} error(s): ${diagnostics.errors.join(' | ')}`);
  }

  return { monsters: importedMonsters, diagnostics };
}

export function buildMonsterCompendium(monsters = []) {
  const sorted = [...monsters].sort((a, b) => String(a.system.monsterKey).localeCompare(String(b.system.monsterKey)));
  validateMonsterCompendiumIntegrity(sorted);
  return sorted.map((monster) => ({ ...monster, uuid: monster.uuid ?? null }));
}

export function syncMonsterCompendium({ sourceMonsters = [], existingEntries = [] } = {}) {
  validateMonsterCompendiumIntegrity(existingEntries);
  const nextEntries = buildMonsterCompendium(sourceMonsters);
  return {
    entries: nextEntries,
    diagnostics: {
      imported: nextEntries.length,
      skipped: 0,
      duplicates: [],
      errors: [],
      warnings: []
    }
  };
}
