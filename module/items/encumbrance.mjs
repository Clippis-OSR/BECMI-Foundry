import {
  getActorItems,
  getContainers,
  getItemTotalWeight,
  getItemsInContainer,
  getItemLocation
} from "./inventory-manager.mjs";

function isStoredItem(item) {
  return Boolean(item?.system?.stored);
}

function getItemId(item) {
  return item?.id ?? item?._id ?? "";
}

function normalizeContainerId(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function shouldCountItem(item) {
  if (isStoredItem(item)) return false;
  const location = getItemLocation(item);
  return location === "equipped" || location === "worn";
}

export function calculateContainerEncumbrance(actor, containerId) {
  const targetContainerId = normalizeContainerId(containerId);
  if (!targetContainerId) {
    return {
      containerId: "",
      containerWeight: 0,
      contentsWeight: 0,
      total: 0,
      itemCount: 0
    };
  }

  const allItems = getActorItems(actor).filter(shouldCountItem);
  const container = allItems.find((item) => getItemId(item) === targetContainerId);
  const contents = getItemsInContainer(actor, targetContainerId).filter(shouldCountItem);

  const containerWeight = container ? getItemTotalWeight(container) : 0;
  const contentsWeight = contents.reduce((sum, item) => sum + getItemTotalWeight(item), 0);

  return {
    containerId: targetContainerId,
    containerWeight,
    contentsWeight,
    total: containerWeight + contentsWeight,
    itemCount: contents.length
  };
}

export function getEncumbranceBracket(total) {
  const value = Number.isFinite(Number(total)) ? Number(total) : 0;

  if (value <= 400) return "0-400";
  if (value <= 800) return "401-800";
  if (value <= 1200) return "801-1200";
  if (value <= 1600) return "1201-1600";
  if (value <= 2400) return "1601-2400";
  return "2401+";
}

export function calculateMovementFromEncumbrance(total) {
  const bracket = getEncumbranceBracket(total);

  const map = {
    "0-400": { normalSpeed: 120, encounterSpeed: 40 },
    "401-800": { normalSpeed: 90, encounterSpeed: 30 },
    "801-1200": { normalSpeed: 60, encounterSpeed: 20 },
    "1201-1600": { normalSpeed: 30, encounterSpeed: 10 },
    "1601-2400": { normalSpeed: 15, encounterSpeed: 5 },
    "2401+": { normalSpeed: 0, encounterSpeed: 0 }
  };

  return {
    bracket,
    normalSpeed: map[bracket].normalSpeed,
    encounterSpeed: map[bracket].encounterSpeed
  };
}

export function calculateTotalEncumbrance(actor) {
  const allItems = getActorItems(actor).filter(shouldCountItem);
  const containers = getContainers(actor).filter(shouldCountItem);

  const containerIds = new Set(containers.map((item) => getItemId(item)).filter(Boolean));

  // Count root non-container items directly; container contents are counted via container summaries.
  const nonContainerWeight = allItems.reduce((sum, item) => {
    if (containerIds.has(getItemId(item))) return sum;

    const containerId = normalizeContainerId(item?.system?.containerId);
    if (containerId && containerIds.has(containerId)) {
      return sum;
    }

    return sum + getItemTotalWeight(item);
  }, 0);

  // Only root containers contribute container+contents to avoid double-counting nested relations.
  const rootContainers = containers.filter((container) => {
    const parentId = normalizeContainerId(container?.system?.containerId);
    if (!parentId) return true;
    if (parentId === getItemId(container)) return true;
    return !containerIds.has(parentId);
  });

  const containerSummaries = rootContainers.map((container) =>
    calculateContainerEncumbrance(actor, getItemId(container))
  );

  const containerWeight = containerSummaries.reduce((sum, entry) => sum + entry.total, 0);
  const total = nonContainerWeight + containerWeight;
  const movement = calculateMovementFromEncumbrance(total);

  return {
    total,
    bracket: movement.bracket,
    normalSpeed: movement.normalSpeed,
    encounterSpeed: movement.encounterSpeed,
    containers: containerSummaries
  };
}
