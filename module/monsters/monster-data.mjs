import { LEGACY_MONSTER_ALIAS_FIELDS, MONSTER_SCHEMA_VERSION } from "./monster-constants.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(`[BECMI Monster Schema] ${message}`);
}

function sanitizeObject(value) {
  if (Array.isArray(value)) return value.map((entry) => sanitizeObject(entry)).filter((entry) => entry !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const next = sanitizeObject(child);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value === undefined ? undefined : value;
}

export function normalizeMonsterData(system = {}, { onWarning = null } = {}) {
  assert(system && typeof system === "object" && !Array.isArray(system), "system must be an object.");
  const warn = typeof onWarning === "function" ? onWarning : () => {};
  for (const field of LEGACY_MONSTER_ALIAS_FIELDS) {
    if (field in system) warn(`[BECMI Monster Schema] Legacy field "${field}" detected and migrated when possible.`);
  }

  const normalizedSaveAs = String(system.saveAs ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const normalizedMorale = system.morale === "" || system.morale === null || system.morale === undefined ? null : Number(system.morale);
  const normalizedAc = system.ac ?? system.armorClass;
  const normalizedMovement = system.movement ?? system.move;
  const normalizedAttacks = system.attacks ?? system.attack ?? [];
  const normalizedXp = system.XP ?? system.xp;
  const hasExplicitMonsterKey = !(system.monsterKey === undefined || system.monsterKey === null || system.monsterKey === "");
  const canonicalKey = hasExplicitMonsterKey ? system.monsterKey : (system.id ?? system.name);
  const normalizedMonsterKey = String(canonicalKey ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  const normalized = {
    ...system,
    monsterKey: hasExplicitMonsterKey ? system.monsterKey : normalizedMonsterKey,
    schemaVersion: system.schemaVersion ?? MONSTER_SCHEMA_VERSION,
    source: sanitizeObject({
      book: system.source?.book ?? "",
      page: system.source?.page ?? "",
      notes: system.source?.notes ?? ""
    }),
    ac: normalizedAc,
    movement: normalizedMovement,
    movementModes: sanitizeObject(system.movementModes ?? {}),
    attacks: Array.isArray(normalizedAttacks) ? normalizedAttacks : normalizedAttacks,
    damageParts: Array.isArray(system.damageParts) ? system.damageParts : [],
    treasure: sanitizeObject({
      raw: system.treasure?.raw ?? "",
      normalizedCodes: Array.isArray(system.treasure?.normalizedCodes) ? system.treasure.normalizedCodes : []
    }),
    description: sanitizeObject({
      text: system.description?.text ?? "",
      notes: system.description?.notes ?? ""
    }),
    notes: system.notes ?? "",
    lairChance: system.lairChance ?? null,
    saveAs: normalizedSaveAs,
    morale: Number.isFinite(normalizedMorale) ? normalizedMorale : null,
    xp: Number.isFinite(Number(normalizedXp)) ? Number(normalizedXp) : null
  };

  return sanitizeObject(normalized);
}
