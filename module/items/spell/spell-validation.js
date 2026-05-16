import { AUTOMATION_MODES, DURATION_TYPES, RANGE_TYPES, SPELL_LISTS, TARGETING_TYPES } from "./spell-constants.js";

const SPELL_KEY_PATTERN = /^[a-z]+(?:_[a-z]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(`[BECMI Spell Schema] ${message}`);
}

function assertEnum(value, allowed, label) {
  assert(allowed.includes(value), `Invalid ${label} "${value}". Allowed: ${allowed.join(", ")}.`);
}

export function validateSpellKey(spellKey) {
  assert(typeof spellKey === "string" && spellKey.length > 0, "spellKey is required and must be a non-empty string.");
  assert(SPELL_KEY_PATTERN.test(spellKey), `spellKey "${spellKey}" must be lowercase snake_case.`);
}

export function validateSpellSchema(itemData, context = "spell validation") {
  if (String(itemData?.type ?? "").toLowerCase() !== "spell") return;
  const system = itemData?.system ?? {};
  assert(system && typeof system === "object", `system object is required in ${context}.`);
  assert(system.schemaVersion !== undefined, `schemaVersion is required in ${context}.`);
  assert(Number(system.schemaVersion) === 1, `Unsupported schemaVersion "${system.schemaVersion}" in ${context}.`);
  validateSpellKey(system.spellKey);
  assert(Number.isInteger(Number(system.level)) && Number(system.level) >= 1, `level must be an integer >= 1 in ${context}.`);
  assert(Array.isArray(system.spellLists), `spellLists must be an array in ${context}.`);
  for (const list of system.spellLists) assertEnum(list, SPELL_LISTS, "spell list");
  assertEnum(system.range?.type, RANGE_TYPES, "range.type");
  assertEnum(system.duration?.type, DURATION_TYPES, "duration.type");
  assertEnum(system.targeting?.type, TARGETING_TYPES, "targeting.type");
  assertEnum(system.automation?.mode, AUTOMATION_MODES, "automation.mode");
}

export function registerSpellValidationHooks() {
  globalThis.Hooks.on("preCreateItem", (item) => {
    if (item.type !== "spell") return;
    validateSpellSchema(item.toObject(), `preCreateItem for spell "${item.name ?? "Unknown"}"`);
  });

  globalThis.Hooks.on("preUpdateItem", (item, changes) => {
    if (item.type !== "spell") return;
    const merged = globalThis.foundry.utils.mergeObject(item.toObject(), changes, { inplace: false });
    validateSpellSchema(merged, `preUpdateItem for spell "${item.name ?? item.id ?? "Unknown"}"`);
  });
}
