export function migrateSpellData(itemData) {
  const system = foundry.utils.deepClone(itemData?.system ?? {});
  const schemaVersion = Number(system.schemaVersion ?? 1);

  switch (schemaVersion) {
    case 1:
      return system;
    default:
      throw new Error(`[BECMI Spell Migration] Unsupported schemaVersion "${schemaVersion}".`);
  }
}
