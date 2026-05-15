import { CANONICAL_ACTOR_TYPES } from "../actors/actor-types.mjs";
import { BECMI_AMMO_TYPES } from "../items/ammo.mjs";

/**
 * Canonical BECMI schema values shared across Actor + Item pipelines.
 * Keep this file as the single authority to prevent schema drift.
 */
export const CANONICAL_SAVE_KEYS = Object.freeze([
  "deathRayPoison",
  "magicWands",
  "paralysisTurnStone",
  "dragonBreath",
  "rodStaffSpell"
]);

export const CANONICAL_ITEM_SLOTS = Object.freeze(["armor", "shield", "helmet", "cloak", "boots", "gloves", "ring", "amulet", "belt", "weaponMain", "weaponOffhand", "natural", "missile"]);

export const CANONICAL_WEAPON_TYPES = Object.freeze(["melee", "missile", "natural"]);
export const CANONICAL_HANDS_VALUES = Object.freeze(["one", "two", "none"]);
export const CANONICAL_INVENTORY_LOCATIONS = Object.freeze(["carried", "worn", "equipped", "backpack", "beltPouch", "sack", "storage", "treasure"]);
export const CANONICAL_LOGICAL_CONTAINERS = Object.freeze(["beltPouch", "backpack", "sack", "storage"]);
export const CANONICAL_COIN_KEYS = Object.freeze(["pp", "gp", "ep", "sp", "cp"]);

function fail(label, value, allowed, context) {
  throw new Error(`[BECMI Schema] Invalid ${label} "${value}" in ${context}. Valid values: ${allowed.join(", ")}.`);
}

export function validateActorType(actorType, context = "actor validation") {
  const normalized = String(actorType ?? "").trim().toLowerCase();
  if (!CANONICAL_ACTOR_TYPES.includes(normalized)) fail("actor.type", actorType, CANONICAL_ACTOR_TYPES, context);
  return normalized;
}

export function validateItemSlot(slot, context = "item validation") {
  const normalized = String(slot ?? "").trim();
  if (!CANONICAL_ITEM_SLOTS.includes(normalized)) fail("item.system.slot", slot, CANONICAL_ITEM_SLOTS, context);
  return normalized;
}

export function validateSaveKeys(saves, context = "actor validation") {
  if (!saves || typeof saves !== "object") return;
  const keys = Object.keys(saves);
  const invalid = keys.filter((key) => !CANONICAL_SAVE_KEYS.includes(key));
  if (invalid.length) {
    throw new Error(`[BECMI Schema] Invalid save keys in ${context}: ${invalid.join(", ")}. Canonical keys: ${CANONICAL_SAVE_KEYS.join(", ")}.`);
  }
}

export function validateWeaponFields(itemData, context = "item validation") {
  const itemType = String(itemData?.type ?? "").toLowerCase();
  if (itemType !== "weapon") return;

  const system = itemData?.system ?? {};
  const weaponType = String(system.weaponType ?? "").trim().toLowerCase();
  if (!CANONICAL_WEAPON_TYPES.includes(weaponType)) fail("item.system.weaponType", system.weaponType, CANONICAL_WEAPON_TYPES, context);

  const hands = String(system.hands ?? "").trim().toLowerCase();
  if (!CANONICAL_HANDS_VALUES.includes(hands)) fail("item.system.hands", system.hands, CANONICAL_HANDS_VALUES, context);

  const ammoType = system.ammoType;
  const isMissile = weaponType === "missile";
  if (isMissile) {
    if (ammoType === null || ammoType === undefined || ammoType === "") {
      throw new Error(`[BECMI Schema] Missing item.system.ammoType for missile weapon in ${context}. Expected one of: ${BECMI_AMMO_TYPES.join(", ")}.`);
    }
    if (!BECMI_AMMO_TYPES.includes(String(ammoType))) fail("item.system.ammoType", ammoType, BECMI_AMMO_TYPES, context);
  } else if (ammoType !== null && ammoType !== undefined && ammoType !== "") {
    throw new Error(`[BECMI Schema] item.system.ammoType must be empty for non-missile weapons in ${context}.`);
  }
}



function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function validateInventoryFields(itemData, context = "item validation") {
  const inventory = itemData?.system?.inventory;
  if (!inventory || typeof inventory !== "object") return;

  if (inventory.location !== undefined && inventory.location !== null) {
    const location = String(inventory.location).trim();
    if (!CANONICAL_INVENTORY_LOCATIONS.includes(location)) fail("item.system.inventory.location", inventory.location, CANONICAL_INVENTORY_LOCATIONS, context);
  }

  if (inventory.containerId !== undefined && inventory.containerId !== null && typeof inventory.containerId !== "string") {
    throw new Error(`[BECMI Schema] item.system.inventory.containerId must be a string in ${context}.`);
  }

  for (const key of ["quantity", "encumbrance", "containerCapacity"]) {
    const value = inventory[key];
    if (value === undefined || value === null || value === "") continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new Error(`[BECMI Schema] item.system.inventory.${key} must be a non-negative number in ${context}.`);
    }
  }

  if (inventory.countsTowardEncumbrance !== undefined && inventory.countsTowardEncumbrance !== null) {
    const parsed = normalizeBoolean(inventory.countsTowardEncumbrance, null);
    if (parsed === null) throw new Error(`[BECMI Schema] item.system.inventory.countsTowardEncumbrance must be boolean in ${context}.`);
  }

  if (inventory.isContainer !== undefined && inventory.isContainer !== null) {
    const parsed = normalizeBoolean(inventory.isContainer, null);
    if (parsed === null) throw new Error(`[BECMI Schema] item.system.inventory.isContainer must be boolean in ${context}.`);
  }

  if (inventory.notes !== undefined && inventory.notes !== null && typeof inventory.notes !== "string") {
    throw new Error(`[BECMI Schema] item.system.inventory.notes must be a string in ${context}.`);
  }
}

export function validateItemSchema(itemData, context = "item validation") {
  if (!itemData || typeof itemData !== "object") return;
  const slot = itemData?.system?.slot;
  if (slot !== undefined && slot !== null && String(slot).trim() !== "") validateItemSlot(slot, context);
  validateWeaponFields(itemData, context);
  validateInventoryFields(itemData, context);
}

export function validateActorSchema(actorData, context = "actor validation") {
  if (!actorData || typeof actorData !== "object") return;
  if (actorData.type !== undefined) validateActorType(actorData.type, context);
  validateSaveKeys(actorData?.system?.saves, context);

  const containers = actorData?.system?.containers;
  if (containers && typeof containers === "object") {
    for (const key of CANONICAL_LOGICAL_CONTAINERS) {
      const entry = containers[key];
      if (!entry || typeof entry !== "object") continue;
      for (const numericKey of ["capacity", "currentContents", "totalEncumbrance"]) {
        const value = entry[numericKey];
        if (value === undefined || value === null || value === "") continue;
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
          throw new Error(`[BECMI Schema] actor.system.containers.${key}.${numericKey} must be a non-negative number in ${context}.`);
        }
      }
    }
  }

  const currency = actorData?.system?.currency;
  if (currency && typeof currency === "object") {
    for (const bucketKey of ["carried", "treasureHorde"]) {
      const bucket = currency[bucketKey];
      if (!bucket || typeof bucket !== "object") continue;
      for (const coinKey of CANONICAL_COIN_KEYS) {
        const value = bucket[coinKey];
        if (value === undefined || value === null || value === "") continue;
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0 || !Number.isInteger(numeric)) {
          throw new Error(`[BECMI Schema] actor.system.currency.${bucketKey}.${coinKey} must be a non-negative integer in ${context}.`);
        }
      }
    }
  }

  const actorType = String(actorData?.type ?? "").trim().toLowerCase();
  const monster = actorData?.system?.monster;
  if (actorType === "creature") {
    const hitDice = String(monster?.hitDice ?? "").trim();
    if (!hitDice) {
      throw new Error(`[BECMI Schema] actor.system.monster.hitDice must not be empty for creature actors in ${context}.`);
    }

    for (const numericKey of ["morale", "xp"]) {
      const value = monster?.[numericKey];
      if (value === undefined || value === null || value === "") continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error(`[BECMI Schema] actor.system.monster.${numericKey} must be numeric in ${context}.`);
      }
    }

    const treasureType = monster?.treasureType;
    if (treasureType !== undefined && treasureType !== null && !Array.isArray(treasureType) && typeof treasureType !== "string") {
      throw new Error(`[BECMI Schema] actor.system.monster.treasureType must be a string or an array in ${context}.`);
    }

    const movement = monster?.movement;
    if (!movement || typeof movement !== "object" || !movement.land || typeof movement.land !== "object") {
      throw new Error(`[BECMI Schema] actor.system.monster.movement must include structured land movement data in ${context}.`);
    }
  }
}
