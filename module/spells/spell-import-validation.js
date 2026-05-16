import { normalizeSpellData } from "../items/spell/spell-data.js";
import { validateSpellSchema } from "../items/spell/spell-validation.js";
import { validateMigrationVersion } from "../items/spell/spell-migration.js";

const LEGACY_FIELDS = Object.freeze(["spellRange", "spellDuration", "targetType", "saveType"]);

export function validateImportedSpellData(spellData, { seenSpellKeys } = {}) {
  if (!spellData || typeof spellData !== "object" || Array.isArray(spellData)) {
    throw new Error("[BECMI Spell Import] malformed spell import: expected object entry.");
  }

  const legacyField = LEGACY_FIELDS.find((field) => field in spellData || field in (spellData.system ?? {}));
  if (legacyField) throw new Error(`[BECMI Spell Import] legacy field "${legacyField}" is not allowed.`);

  if (!("schemaVersion" in spellData)) {
    throw new Error("[BECMI Spell Import] missing schemaVersion on canonical spell import.");
  }

  validateMigrationVersion(spellData.schemaVersion, { itemData: { name: spellData.name } });

  const normalizedSystem = normalizeSpellData(spellData);
  const itemData = {
    type: "spell",
    name: spellData.name,
    system: { ...normalizedSystem, schemaVersion: spellData.schemaVersion, spellKey: spellData.spellKey }
  };

  validateSpellSchema(itemData, `spell import for "${spellData.name ?? spellData.spellKey ?? "unknown"}"`);

  if (seenSpellKeys?.has(normalizedSystem.spellKey)) {
    throw new Error(`[BECMI Spell Import] duplicate spellKey "${normalizedSystem.spellKey}" detected during import.`);
  }

  return itemData;
}
