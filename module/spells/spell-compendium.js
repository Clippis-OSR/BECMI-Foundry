import { validateSpellSchema } from "../items/spell/spell-validation.js";

export function validateCompendiumIntegrity(entries) {
  const diagnostics = { imported: 0, skipped: 0, duplicates: [], errors: [], warnings: [] };
  const seen = new Set();

  for (const entry of entries) {
    try {
      validateSpellSchema(entry, `compendium spell "${entry?.name ?? "Unknown"}"`);
      const spellKey = entry.system.spellKey;
      if (seen.has(spellKey)) throw new Error(`[BECMI Spell Compendium] duplicate spellKey "${spellKey}" in compendium.`);
      seen.add(spellKey);
      diagnostics.imported += 1;
    } catch (error) {
      diagnostics.errors.push(String(error?.message ?? error));
      if (String(error?.message ?? "").includes("duplicate spellKey")) diagnostics.duplicates.push(entry?.system?.spellKey ?? "unknown");
    }
  }

  if (diagnostics.errors.length > 0) throw new Error(`[BECMI Spell Compendium] integrity validation failed: ${diagnostics.errors.join(" | ")}`);
  return diagnostics;
}

export function buildSpellCompendium(spells = []) {
  const sorted = [...spells].sort((a, b) => String(a.system.spellKey).localeCompare(String(b.system.spellKey)));
  validateCompendiumIntegrity(sorted);
  return sorted.map((spell) => ({ ...spell, uuid: spell.uuid ?? null }));
}

export function syncSpellCompendium({ sourceSpells = [], existingEntries = [] } = {}) {
  validateCompendiumIntegrity(existingEntries);
  const nextEntries = buildSpellCompendium(sourceSpells);
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
