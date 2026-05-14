/**
 * Canonical BECMI equipment slots.
 *
 * Two-handed model:
 * - Use slot "weaponMain" + system.hands="two".
 * - Never use a dedicated "bothHands" slot.
 *
 * Offhand model:
 * - Shields occupy weaponOffhand (and shield).
 * - Offhand weapons use slot "weaponOffhand".
 * - Natural weapons bypass hand occupancy entirely.
 */
const DEFAULT_EQUIPMENT_SLOTS = {
  armor: null,
  shield: null,
  helmet: null,
  cloak: null,
  boots: null,
  gloves: null,
  ring: null,
  amulet: null,
  belt: null,
  weaponMain: null,
  weaponOffhand: null,
  natural: null,
  missile: null
};

export const VALID_ITEM_EQUIP_SLOTS = [...CANONICAL_ITEM_SLOTS];

import { CANONICAL_ITEM_SLOTS, validateItemSlot } from "../utils/schema-validation.mjs";

const SLOT_TO_ACTOR_KEY = Object.freeze({
  armor: "armor",
  shield: "shield",
  helmet: "helmet",
  cloak: "cloak",
  boots: "boots",
  gloves: "gloves",
  ring: "ring",
  amulet: "amulet",
  belt: "belt",
  weaponmain: "weaponMain",
  weaponoffhand: "weaponOffhand",
  natural: "natural",
  missile: "missile"
});

export function ensureActorEquipmentSlots(actor) {
  const current = actor?.system?.equipmentSlots ?? {};
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_EQUIPMENT_SLOTS), current ?? {}, { inplace: false });
}

function resolveItemSlot(item) {
  const explicit = String(item?.system?.slot ?? "").trim();
  if (!explicit) {
    if (item?.type === "armor") return "armor";
    if (item?.type === "weapon") return item?.system?.weaponType === "natural" ? "natural" : "weaponMain";
    throw new Error(`[BECMI Equip] Item "${item?.name ?? item?.id ?? "Unknown"}" has no slot.`);
  }
  validateItemSlot(explicit, `equip item "${item?.name ?? item?.id ?? "Unknown"}"`);
  return explicit;
}

export async function unequipItem(actor, item) {
  if (!actor || !item) return;
  const slots = ensureActorEquipmentSlots(actor);
  for (const [key, value] of Object.entries(slots)) {
    if (value === item.id) slots[key] = null;
  }
  await Promise.all([item.update({ "system.equipped": false, "system.location": "worn", "system.inventory.location": "worn" }), actor.update({ "system.equipmentSlots": slots })]);
}

export async function equipItem(actor, item) {
  if (!actor || !item) return false;
  const slots = ensureActorEquipmentSlots(actor);
  const pendingUnequipIds = new Set();

  const slot = resolveItemSlot(item);
  const hands = String(item?.system?.hands ?? "one").toLowerCase();

  const mainItem = slots.weaponMain ? actor.items.get(slots.weaponMain) : null;
  const mainIsTwoHanded = mainItem?.type === "weapon" && String(mainItem?.system?.hands ?? "one").toLowerCase() === "two";

  if (slot === "natural") {
    await item.update({ "system.equipped": true, "system.location": "worn", "system.inventory.location": "worn", "system.slot": "natural", "system.hands": "none" });
    return true;
  }

  if (slot === "weaponMain") {
    if (hands === "two") {
      if (slots.weaponOffhand && slots.weaponOffhand !== item.id) pendingUnequipIds.add(slots.weaponOffhand);
      if (slots.shield && slots.shield !== item.id) pendingUnequipIds.add(slots.shield);
    }
    if (slots.weaponMain && slots.weaponMain !== item.id) pendingUnequipIds.add(slots.weaponMain);
    slots.weaponMain = item.id;
  } else if (slot === "shield") {
    if (mainIsTwoHanded && slots.weaponMain !== item.id) {
      throw new Error("[BECMI Equip] Cannot equip shield while a two-handed weapon is equipped in weaponMain.");
    }
    if (slots.weaponOffhand && slots.weaponOffhand !== item.id) pendingUnequipIds.add(slots.weaponOffhand);
    if (slots.shield && slots.shield !== item.id) pendingUnequipIds.add(slots.shield);
    slots.shield = item.id;
    slots.weaponOffhand = item.id;
  } else if (slot === "weaponOffhand") {
    if (mainIsTwoHanded) throw new Error("[BECMI Equip] Cannot equip offhand weapon while a two-handed main weapon is equipped.");
    if (slots.shield) pendingUnequipIds.add(slots.shield);
    if (slots.weaponOffhand && slots.weaponOffhand !== item.id) pendingUnequipIds.add(slots.weaponOffhand);
    slots.weaponOffhand = item.id;
  } else {
    const key = SLOT_TO_ACTOR_KEY[String(slot).toLowerCase()];
    if (!key) throw new Error(`[BECMI Equip] Unsupported slot mapping for "${slot}".`);
    if (slots[key] && slots[key] !== item.id) pendingUnequipIds.add(slots[key]);
    slots[key] = item.id;
  }

  for (const id of pendingUnequipIds) {
    const other = actor.items.get(id);
    if (!other) continue;
    await other.update({ "system.equipped": false, "system.location": "worn", "system.inventory.location": "worn" });
    for (const [k, v] of Object.entries(slots)) if (v === id) slots[k] = null;
  }

  await Promise.all([item.update({ "system.equipped": true, "system.location": "worn", "system.inventory.location": "worn", "system.slot": slot }), actor.update({ "system.equipmentSlots": slots })]);
  return true;
}
