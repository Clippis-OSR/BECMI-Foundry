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

export function getContainers(actor) {
  return getActorItems(actor).filter((item) => item?.type === "container");
}

export function getEquippedItems(actor) {
  return getActorItems(actor).filter((item) => Boolean(item?.system?.equipped));
}

export function getWornItems(actor) {
  return getActorItems(actor).filter((item) => Boolean(item?.system?.worn));
}

export function getCarriedItems(actor) {
  return getActorItems(actor).filter((item) => {
    const containerId = normalizeContainerId(item?.system?.containerId);
    if (containerId) return false;
    return !item?.system?.equipped && !item?.system?.worn;
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
