const DEFAULT_EQUIPMENT_SLOTS = {
  armor: null,
  shield: null,
  ringLeft: null,
  ringRight: null,
  amulet: null,
  cloak: null,
  boots: null,
  gloves: null,
  belt: null,
  weaponMain: null,
  weaponOffhand: null
};

const SLOT_TO_ACTOR_KEYS = {
  armor: ["armor"],
  shield: ["shield"],
  ring: ["ringLeft", "ringRight"],
  amulet: ["amulet"],
  cloak: ["cloak"],
  boots: ["boots"],
  gloves: ["gloves"],
  belt: ["belt"],
  weapon: ["weaponMain", "weaponOffhand"],
  helmet: [],
};

const slotLog = (message, details = {}) => console.info(`[BECMI equip] ${message}`, details);

export function ensureActorEquipmentSlots(actor) {
  const current = actor?.system?.equipmentSlots ?? {};
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_EQUIPMENT_SLOTS), current ?? {}, { inplace: false });
}

function normalizeItemSlot(item) {
  const explicitSlot = String(item?.system?.slot ?? "").trim().toLowerCase();
  if (explicitSlot) return explicitSlot;
  if (item?.type === "armor") return "armor";
  if (item?.type === "weapon") return "weapon";
  return "";
}

export async function unequipItem(actor, item) {
  if (!actor || !item) return;
  const equipmentSlots = ensureActorEquipmentSlots(actor);
  for (const [slotKey, itemId] of Object.entries(equipmentSlots)) {
    if (itemId === item.id) equipmentSlots[slotKey] = null;
  }

  await Promise.all([
    item.update({ "system.equipped": false, "system.location": "worn" }),
    actor.update({ "system.equipmentSlots": equipmentSlots })
  ]);
}

export async function equipItem(actor, item) {
  if (!actor || !item) return false;

  const itemSlot = normalizeItemSlot(item);
  if (!itemSlot) {
    slotLog("Cannot equip item without a valid slot.", { actor: actor.name, item: item.name, itemType: item.type });
    return false;
  }

  const actorSlotKeys = SLOT_TO_ACTOR_KEYS[itemSlot] ?? [];
  if (!actorSlotKeys.length) {
    slotLog("No actor slot mapping found; equip blocked.", { actor: actor.name, item: item.name, itemSlot });
    return false;
  }

  const equipmentSlots = ensureActorEquipmentSlots(actor);
  const pendingUnequipIds = new Set();

  // Two-handed weapon conflicts.
  const isTwoHandedWeapon = itemSlot === "weapon" && Boolean(item.system?.twoHanded);
  if (isTwoHandedWeapon) {
    if (equipmentSlots.shield) pendingUnequipIds.add(equipmentSlots.shield);
    if (equipmentSlots.weaponOffhand) pendingUnequipIds.add(equipmentSlots.weaponOffhand);
    if (pendingUnequipIds.size > 0) {
      slotLog("Two-handed weapon equipped; clearing shield/offhand conflicts.", { actor: actor.name, item: item.name });
    }
  }

  const mainWeapon = equipmentSlots.weaponMain ? actor.items.get(equipmentSlots.weaponMain) : null;
  if ((itemSlot === "shield" || (itemSlot === "weapon" && actorSlotKeys.includes("weaponOffhand"))) && mainWeapon?.system?.twoHanded) {
    slotLog("Shield/offhand equip blocked by two-handed main weapon.", {
      actor: actor.name,
      item: item.name,
      blockingWeapon: mainWeapon.name
    });
    return false;
  }

  if (itemSlot === "ring") {
    const freeRingSlot = actorSlotKeys.find((key) => !equipmentSlots[key] || equipmentSlots[key] === item.id);
    if (!freeRingSlot) {
      slotLog("Ring limit reached (max two).", { actor: actor.name, item: item.name });
      return false;
    }
    equipmentSlots[freeRingSlot] = item.id;
  } else if (itemSlot === "weapon") {
    const preferredKey = !equipmentSlots.weaponMain || equipmentSlots.weaponMain === item.id ? "weaponMain" : "weaponOffhand";
    const targetKey = !equipmentSlots[preferredKey] || equipmentSlots[preferredKey] === item.id
      ? preferredKey
      : actorSlotKeys.find((key) => !equipmentSlots[key] || equipmentSlots[key] === item.id);

    if (!targetKey) {
      slotLog("Weapon slots are full; equip blocked.", { actor: actor.name, item: item.name });
      return false;
    }

    if (isTwoHandedWeapon && targetKey === "weaponOffhand") {
      slotLog("Two-handed weapon cannot be equipped in offhand.", { actor: actor.name, item: item.name });
      return false;
    }

    if (targetKey === "weaponMain" && equipmentSlots.weaponMain && equipmentSlots.weaponMain !== item.id) {
      pendingUnequipIds.add(equipmentSlots.weaponMain);
    }

    equipmentSlots[targetKey] = item.id;
  } else {
    const targetKey = actorSlotKeys[0];
    if (equipmentSlots[targetKey] && equipmentSlots[targetKey] !== item.id) {
      pendingUnequipIds.add(equipmentSlots[targetKey]);
      slotLog(`Replacing equipped ${itemSlot}.`, { actor: actor.name, item: item.name });
    }
    equipmentSlots[targetKey] = item.id;
  }

  for (const unequipId of pendingUnequipIds) {
    const equippedItem = actor.items.get(unequipId);
    if (!equippedItem) continue;
    await equippedItem.update({ "system.equipped": false, "system.location": "worn" });
    for (const [key, value] of Object.entries(equipmentSlots)) {
      if (value === equippedItem.id) equipmentSlots[key] = null;
    }
  }

  await Promise.all([
    item.update({ "system.equipped": true, "system.location": "equipped", "system.slot": itemSlot }),
    actor.update({ "system.equipmentSlots": equipmentSlots })
  ]);

  return true;
}
