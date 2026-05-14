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

export function validateItemSchema(itemData, context = "item validation") {
  if (!itemData || typeof itemData !== "object") return;
  const slot = itemData?.system?.slot;
  if (slot !== undefined && slot !== null && String(slot).trim() !== "") validateItemSlot(slot, context);
  validateWeaponFields(itemData, context);
}

export function validateActorSchema(actorData, context = "actor validation") {
  if (!actorData || typeof actorData !== "object") return;
  if (actorData.type !== undefined) validateActorType(actorData.type, context);
  validateSaveKeys(actorData?.system?.saves, context);
}
