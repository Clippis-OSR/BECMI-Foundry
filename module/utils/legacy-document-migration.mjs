import { normalizeLegacyItemSlotForMigration } from "../items/legacy-slot-migration.mjs";
import { normalizeItemLocation } from "../items/inventory-manager.mjs";
import { normalizeMonsterData } from "../monsters/monster-data.mjs";

function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNumberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toStringOr(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length ? text : fallback;
}

export function migrateLegacyItemForTests(itemData = {}, diagnostics = []) {
  const migrated = deepClone(itemData);
  migrated.system = asObject(migrated.system);

  const slotResult = normalizeLegacyItemSlotForMigration(migrated);
  if (slotResult.shouldValidate) migrated.system.slot = slotResult.slot;

  const inventory = asObject(migrated.system.inventory);
  const legacyLocation = migrated.system.location;
  inventory.location = normalizeItemLocation(inventory.location ?? legacyLocation);
  inventory.quantity = toNumberOr(inventory.quantity ?? migrated.system.quantity, 1);
  inventory.quantity = inventory.quantity >= 0 ? inventory.quantity : 0;
  migrated.system.inventory = inventory;

  if (migrated.type === "spell") {
    migrated.system.schemaVersion = Number.isInteger(migrated.system.schemaVersion) ? migrated.system.schemaVersion : 1;
    migrated.system.spellRef = toStringOr(migrated.system.spellRef ?? migrated.system.spellKey, "");
  }

  return { migrated, diagnostics };
}

export function migrateLegacyActorForTests(actorData = {}, diagnostics = []) {
  const migrated = deepClone(actorData);
  migrated.system = asObject(migrated.system);

  if (migrated.type === "monster") {
    diagnostics.push("legacy actor type \"monster\" mapped to canonical \"creature\".");
    migrated.type = "creature";
  }

  if (migrated.type === "creature") {
    migrated.system.monster = normalizeMonsterData(asObject(migrated.system.monster), {
      onWarning: (warning) => diagnostics.push(warning)
    });
    migrated.system.monster.hitDice = toStringOr(migrated.system.monster.hitDice, "1");
    migrated.system.monster.ac = toNumberOr(migrated.system.monster.ac, 9);
    migrated.system.monster.movement = asObject(migrated.system.monster.movement);
    const land = asObject(migrated.system.monster.movement.land);
    migrated.system.monster.movement.land = {
      feetPerTurn: toNumberOr(land.feetPerTurn, 0),
      feetPerRound: toNumberOr(land.feetPerRound, 0)
    };
    migrated.system.monster.attacks = Array.isArray(migrated.system.monster.attacks)
      ? migrated.system.monster.attacks
      : toStringOr(migrated.system.monster.attacks)
        .split(/[;,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry, index) => ({ id: `legacy-${index + 1}`, label: entry }));
  }

  migrated.system.saves = asObject(migrated.system.saves);
  migrated.system.thac0 = toNumberOr(migrated.system.thac0, 19);
  migrated.system.ac = asObject(migrated.system.ac);
  migrated.system.ac.value = toNumberOr(migrated.system.ac.value, 9);

  return { migrated, diagnostics };
}
