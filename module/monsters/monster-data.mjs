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

export function normalizeMonsterData(system = {}) {
  assert(system && typeof system === "object" && !Array.isArray(system), "system must be an object.");
  for (const field of LEGACY_MONSTER_ALIAS_FIELDS) {
    assert(!(field in system), `Legacy field "${field}" is not allowed in canonical monster schema.`);
  }

  const normalized = {
    ...system,
    schemaVersion: system.schemaVersion ?? MONSTER_SCHEMA_VERSION,
    source: sanitizeObject({
      book: system.source?.book ?? "",
      page: system.source?.page ?? "",
      notes: system.source?.notes ?? ""
    }),
    movementModes: sanitizeObject(system.movementModes ?? {}),
    attacks: Array.isArray(system.attacks) ? system.attacks : [],
    damageParts: Array.isArray(system.damageParts) ? system.damageParts : [],
    treasure: sanitizeObject({
      raw: system.treasure?.raw ?? "",
      normalizedCodes: Array.isArray(system.treasure?.normalizedCodes) ? system.treasure.normalizedCodes : []
    }),
    description: sanitizeObject({
      text: system.description?.text ?? "",
      notes: system.description?.notes ?? ""
    }),
    notes: system.notes ?? ""
  };

  return sanitizeObject(normalized);
}
