const MIGRATION_PREFIX = "[BECMI Spell Migration]";
const CURRENT_SCHEMA_VERSION = 1;

function getName(itemData) {
  return itemData?.name ?? "Unknown Spell";
}

function getId(itemData) {
  return itemData?._id ?? itemData?.id ?? "unknown-id";
}

function verboseLoggingEnabled() {
  return Boolean(globalThis.CONFIG?.BECMI?.debug?.spellMigration);
}

export function logSpellMigration({ fromVersion, toVersion, itemData, spellKey, diagnostic } = {}) {
  const message = [
    MIGRATION_PREFIX,
    `${getName(itemData)} (${getId(itemData)})`,
    `spellKey=${spellKey ?? "unknown"}`,
    `v${fromVersion} -> v${toVersion}`,
    diagnostic ? `diagnostic=${diagnostic}` : null
  ].filter(Boolean).join("\n");

  if (verboseLoggingEnabled()) {
    console.debug(message);
  } else {
    console.info(message);
  }
}

export function validateMigrationVersion(schemaVersion, { itemData } = {}) {
  if (schemaVersion === undefined || schemaVersion === null) {
    throw new Error(`${MIGRATION_PREFIX} ${getName(itemData)} (${getId(itemData)}) is missing schemaVersion.`);
  }
  if (typeof schemaVersion !== "number" || Number.isNaN(schemaVersion)) {
    throw new Error(`${MIGRATION_PREFIX} ${getName(itemData)} (${getId(itemData)}) has non-numeric schemaVersion "${schemaVersion}".`);
  }
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(`${MIGRATION_PREFIX} ${getName(itemData)} (${getId(itemData)}) has invalid schemaVersion "${schemaVersion}".`);
  }
  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`${MIGRATION_PREFIX} ${getName(itemData)} (${getId(itemData)}) has unsupported future schemaVersion "${schemaVersion}".`);
  }
}

export function migrateSpellData(itemData) {
  const system = foundry.utils.deepClone(itemData?.system ?? {});
  validateMigrationVersion(system.schemaVersion, { itemData });

  const schemaVersion = system.schemaVersion;
  switch (schemaVersion) {
    case 1:
      logSpellMigration({ fromVersion: 1, toVersion: 1, itemData, spellKey: system.spellKey, diagnostic: "no-op" });
      return system;
    default:
      throw new Error(`${MIGRATION_PREFIX} Unsupported schemaVersion "${schemaVersion}".`);
  }
}
