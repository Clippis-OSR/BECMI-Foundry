import {
  LEGACY_MONSTER_ALIAS_FIELDS,
  MONSTER_KEY_PATTERN,
  MONSTER_SCHEMA_VERSION,
  REQUIRED_MONSTER_FIELDS
} from "./monster-constants.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(`[BECMI Monster Schema] ${message}`);
}

export function validateMonsterKey(monsterKey) {
  assert(typeof monsterKey === "string" && monsterKey.length > 0, "monsterKey is required and must be a non-empty string.");
  assert(MONSTER_KEY_PATTERN.test(monsterKey), `monsterKey "${monsterKey}" must be lowercase snake_case.`);
}

export function validateMonsterSchema(monsterData, context = "monster validation", { originalMonsterData = null } = {}) {
  const system = monsterData?.system ?? monsterData;
  assert(system && typeof system === "object" && !Array.isArray(system), `system object is required in ${context}.`);

  for (const field of LEGACY_MONSTER_ALIAS_FIELDS) {
    assert(!Object.prototype.hasOwnProperty.call(system, field), `Legacy monster alias "${field}" is not supported.`);
  }

  for (const field of REQUIRED_MONSTER_FIELDS) {
    assert(system[field] !== undefined, `Missing required canonical field "${field}" in ${context}.`);
  }

  validateMonsterKey(system.monsterKey);
  assert(Number(system.schemaVersion) === MONSTER_SCHEMA_VERSION, `schemaVersion is required and must be ${MONSTER_SCHEMA_VERSION} in ${context}.`);
  assert(Number.isFinite(Number(system.ac)), `ac must be numeric in ${context}.`);
  assert(typeof system.hitDice === "string" && system.hitDice.trim().length > 0, `hitDice must be a non-empty string in ${context}.`);
  assert(typeof system.movement === "string" && system.movement.trim().length > 0, `movement must be a non-empty string in ${context}.`);
  assert(typeof system.damage === "string" && system.damage.trim().length > 0, `damage must be a non-empty string in ${context}.`);
  assert(Number.isFinite(Number(system.morale)), `morale must be numeric in ${context}.`);
  assert(Number.isFinite(Number(system.xp)), `xp must be numeric and table/data-driven in ${context}.`);
  assert(typeof system.saveAs === "string" && /^[A-Z]+\d+$/.test(system.saveAs.trim()), `saveAs must match canonical form like F3 in ${context}.`);

  if (originalMonsterData) {
    const originalSystem = originalMonsterData?.system ?? originalMonsterData;
    if (originalSystem?.monsterKey !== undefined) {
      assert(originalSystem.monsterKey === system.monsterKey, `monsterKey is immutable and cannot be changed in ${context}.`);
    }
  }
}
