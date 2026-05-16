import { readFile } from "node:fs/promises";

import { registerSpellIndex } from "./spell-index.js";
import { validateImportedSpellData } from "./spell-import-validation.js";

function deepClone(value) {
  return globalThis.foundry?.utils?.deepClone ? globalThis.foundry.utils.deepClone(value) : globalThis.structuredClone(value);
}

export function createSpellItem(spellData) {
  return {
    type: "spell",
    name: spellData.name,
    system: deepClone(spellData.system)
  };
}

export function importSpellData(spells) {
  if (!Array.isArray(spells)) throw new Error("[BECMI Spell Import] importSpellData expects an array of canonical spells.");

  const diagnostics = { imported: 0, skipped: 0, duplicates: [], errors: [], warnings: [] };
  const importedSpells = [];
  const seenSpellKeys = new Set();

  for (const rawSpell of spells) {
    try {
      const validated = validateImportedSpellData(rawSpell, { seenSpellKeys });
      seenSpellKeys.add(validated.system.spellKey);
      const spellItem = createSpellItem(validated);
      registerSpellIndex(spellItem);
      importedSpells.push(spellItem);
      diagnostics.imported += 1;
    } catch (error) {
      diagnostics.errors.push(String(error?.message ?? error));
      if (String(error?.message ?? "").includes("duplicate spellKey")) diagnostics.duplicates.push(rawSpell?.spellKey ?? "unknown");
    }
  }

  if (diagnostics.errors.length > 0) {
    throw new Error(`[BECMI Spell Import] import failed with ${diagnostics.errors.length} error(s): ${diagnostics.errors.join(" | ")}`);
  }

  return { spells: importedSpells, diagnostics };
}

export async function importSpellFile(path) {
  const content = await readFile(path, "utf8");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error(`[BECMI Spell Import] spell file "${path}" must export an array.`);
  return importSpellData(parsed);
}
