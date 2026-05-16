/**
 * Reusable inventory service layer for BECMI actor-owned items.
 *
 * Architecture rule: containers never nest embedded item documents.
 * All actor-owned items remain siblings; containment is represented by system.containerId.
 */

function toArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  return Array.from(collection);
}

export function normalizeContainerId(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getItemId(item) {
  return item?.id ?? item?._id ?? "";
}

export function getActorItems(actor) {
  return toArray(actor?.items);
}

export const LOGICAL_CONTAINER_LOCATIONS = Object.freeze(["beltPouch", "backpack", "sack", "storage"]);

export function getRootItems(actor) {
  return getActorItems(actor).filter((item) => !normalizeContainerId(item?.system?.containerId));
}

export function getItemsInContainer(actor, containerId) {
  const targetContainerId = normalizeContainerId(containerId);
  if (!targetContainerId) return [];

  return getActorItems(actor).filter((item) => {
    const itemContainerId = normalizeContainerId(item?.system?.containerId);
    const itemId = getItemId(item);

    // Guard against self-containment loops.
    if (itemId && itemId === targetContainerId) return false;

    return itemContainerId === targetContainerId;
  });
}

export function getInventoryItems(actor) {
  return getActorItems(actor).filter((item) => item?.type !== "currency");
}

export function getItemsByLocation(actor, location) {
  const normalized = normalizeItemLocation(location);
  return getInventoryItems(actor).filter((item) => getItemLocation(item) === normalized);
}

export function getContainerContents(actor, containerId) {
  return getItemsInContainer(actor, containerId);
}

export function getContainers(actor) {
  return getInventoryItems(actor).filter((item) => item?.type === "container");
}

export const CANONICAL_INVENTORY_LOCATIONS = Object.freeze(["carried", "worn", "equipped", "backpack", "beltPouch", "sack", "storage", "treasure"]);

/**
 * Canonical inventory locations are independent from equipment slots.
 * Example: slot=weaponMain while inventory.location=worn.
 */
export function normalizeItemLocation(value) {
  const location = String(value ?? "").trim();
  const legacy = String(value ?? "").trim().toLowerCase();
  if (legacy === "equipped") return "worn";
  if (CANONICAL_INVENTORY_LOCATIONS.includes(location)) return location;

  // Legacy aliases kept for migration safety.
  if (["equipped", "worn"].includes(legacy)) return "worn";
  if (["stored", "storage"].includes(legacy)) return "storage";
  if (["treasurehorde", "treasure"].includes(legacy)) return "treasure";
  if (["sack1", "sack2"].includes(legacy)) return "sack";
  return "carried";
}

export function getItemLocation(item) {
  const inventoryLocation = item?.system?.inventory?.location;
  const legacyLocation = item?.system?.location;
  return normalizeItemLocation(inventoryLocation ?? legacyLocation);
}

export function getEquippedItems(actor) {
  return getActorItems(actor).filter((item) => item?.system?.equipped === true || getItemLocation(item) === "worn");
}

export function getWornItems(actor) {
  return getActorItems(actor).filter((item) => getItemLocation(item) === "worn");
}

export function getCarriedItems(actor) {
  return getActorItems(actor).filter((item) => {
    const location = getItemLocation(item);
    return ["worn", "beltPouch", "backpack", "sack1", "sack2", "carried"].includes(location);
  });
}

export function getItemTotalWeight(item) {
  const quantityRaw = item?.system?.quantity;
  const quantity = Number.isFinite(Number(quantityRaw)) ? Number(quantityRaw) : 1;

  if (item?.type === "currency") {
    const perUnitRaw = item?.system?.weightPerUnit;
    const perUnit = Number.isFinite(Number(perUnitRaw)) ? Number(perUnitRaw) : null;
    if (perUnit !== null) {
      return quantity * perUnit;
    }
  }

  const weightRaw = item?.system?.weight;
  const weight = Number.isFinite(Number(weightRaw)) ? Number(weightRaw) : 0;

  return quantity * weight;
}

export function getContainerContentsWeight(actor, containerId) {
  return getItemsInContainer(actor, containerId)
    .reduce((sum, item) => sum + getItemTotalWeight(item), 0);
}

export function getContainerTotalWeight(actor, containerId) {
  const container = getActorItems(actor).find((item) => getItemId(item) === normalizeContainerId(containerId));
  if (!container) return getContainerContentsWeight(actor, containerId);
  return getItemTotalWeight(container) + getContainerContentsWeight(actor, containerId);
}

export function canItemFitInContainer(item, container, actor = null) {
  if (!item || !container) return false;
  const capacity = Number(container?.system?.capacity ?? container?.system?.inventory?.containerCapacity ?? 0);
  if (!Number.isFinite(capacity) || capacity <= 0) return false;

  const itemWeight = getItemTotalWeight(item);
  const containerId = getItemId(container);
  const currentLoad = actor && containerId ? getContainerContentsWeight(actor, containerId) : 0;
  return (currentLoad + itemWeight) <= capacity;
}

export function validateItemContainerAssignment(actor, item, { containerId, location } = {}) {
  const nextContainerId = normalizeContainerId(containerId ?? item?.system?.containerId);
  const nextLocation = location !== undefined ? String(location).trim() : getItemLocation(item);
  const itemId = getItemId(item);
  const items = getActorItems(actor);

  if (!CANONICAL_INVENTORY_LOCATIONS.includes(nextLocation)) {
    throw new Error(`[BECMI Inventory] Invalid location "${nextLocation}".`);
  }

  if (!nextContainerId) return true;
  if (itemId && nextContainerId === itemId) {
    throw new Error("[BECMI Inventory] Item cannot be stored inside itself.");
  }

  const byId = new Map(items.map((owned) => [getItemId(owned), owned]));
  const target = byId.get(nextContainerId);
  if (!target || target.type !== "container") {
    throw new Error(`[BECMI Inventory] Invalid containerId "${nextContainerId}".`);
  }

  let cursor = target;
  const visited = new Set();
  while (cursor) {
    const cursorId = getItemId(cursor);
    if (!cursorId || visited.has(cursorId)) break;
    if (itemId && cursorId === itemId) {
      throw new Error("[BECMI Inventory] Circular container reference is not allowed.");
    }
    visited.add(cursorId);
    const parentId = normalizeContainerId(cursor?.system?.containerId);
    cursor = parentId ? byId.get(parentId) : null;
  }

  return true;
}

export function getInventoryDiagnostics(actor) {
  const diagnostics = [];
  const items = getActorItems(actor).filter((item) => item?.type !== "currency");
  const byId = new Map(items.map((it) => [getItemId(it), it]));

  for (const item of items) {
    const id = getItemId(item);
    const name = item?.name ?? id ?? "Unknown";
    const inventory = item?.system?.inventory;
    if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
      diagnostics.push({ severity: "error", code: "missingInventoryFields", itemId: id, message: `[${name}] missing system.inventory object.` });
      continue;
    }

    const rawLocation = item?.system?.inventory?.location ?? item?.system?.location;
    if (!CANONICAL_INVENTORY_LOCATIONS.includes(normalizeItemLocation(rawLocation))) {
      diagnostics.push({ severity: "error", code: "invalidLocation", itemId: id, message: `[${name}] invalid inventory location "${rawLocation}".` });
    }

    const quantity = Number(item?.system?.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      diagnostics.push({ severity: "error", code: "invalidQuantity", itemId: id, message: `[${name}] has invalid quantity "${item?.system?.quantity}".` });
    }

    const weight = Number(item?.system?.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      diagnostics.push({ severity: "error", code: "malformedEncumbrance", itemId: id, message: `[${name}] has malformed weight "${item?.system?.weight}".` });
    }

    if (item?.system?.equipped === true && !["worn", "carried", "equipped", "backpack", "beltPouch", "sack"].includes(getItemLocation(item))) {
      diagnostics.push({ severity: "error", code: "equippedNotCarried", itemId: id, message: `[${name}] is equipped but not carried.` });
    }

    const containerId = normalizeContainerId(item?.system?.containerId);
    if (containerId) {
      const parent = byId.get(containerId);
      if (!parent || parent.type !== "container") diagnostics.push({ severity: "error", code: "invalidContainer", itemId: id, message: `[${name}] references invalid containerId "${containerId}".` });
    }
  }

  // Cycle/orphan detection.
  for (const item of items) {
    const id = getItemId(item);
    if (!id) continue;
    let cursor = item;
    const visited = new Set([id]);
    while (cursor) {
      const parentId = normalizeContainerId(cursor?.system?.containerId);
      if (!parentId) break;
      if (visited.has(parentId)) {
        diagnostics.push({ severity: "error", code: "containerCycle", itemId: id, message: `[${item?.name ?? id}] is part of a container cycle.` });
        break;
      }
      visited.add(parentId);
      cursor = byId.get(parentId);
      if (!cursor) {
        diagnostics.push({ severity: "error", code: "orphanedContainedItem", itemId: id, message: `[${item?.name ?? id}] has orphaned container parent "${parentId}".` });
        break;
      }
    }
  }

  const currency = actor?.system?.currency ?? {};
  for (const bucket of ["carried", "treasureHorde"]) {
    if (!currency[bucket] || typeof currency[bucket] !== "object") {
      diagnostics.push({ severity: "error", code: "missingCurrencyBucket", message: `Missing currency bucket system.currency.${bucket}.` });
      continue;
    }
    for (const key of ["pp", "gp", "ep", "sp", "cp"]) {
      const qty = Number(currency[bucket][key] ?? 0);
      if (!Number.isFinite(qty) || qty < 0) diagnostics.push({ severity: "error", code: "invalidCurrency", message: `Invalid ${bucket}.${key} currency quantity.` });
    }
  }
  return diagnostics;
}

export async function moveItemToContainer(item, containerId) {
  if (!item?.update) return null;

  const itemId = getItemId(item);
  const targetContainerId = normalizeContainerId(containerId);

  // Never allow an item to contain itself.
  if (itemId && targetContainerId === itemId) {
    console.warn("Ignoring self-containment move attempt", { itemId, targetContainerId });
    return item;
  }

  await item.update({
    "system.containerId": targetContainerId
  });

  return item;
}
