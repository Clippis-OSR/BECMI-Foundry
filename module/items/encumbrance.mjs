import {
  getActorItems,
  getContainers,
  getItemTotalWeight,
  getItemsInContainer,
  getItemLocation
} from "./inventory-manager.mjs";
import { BECMI_ENCUMBRANCE_RULES, getMovementTierByEncumbrance } from "../rules/encumbrance.mjs";

const CARRIED_LOCATIONS = Object.freeze(["worn", "beltPouch", "backpack", "sack1", "sack2", "carried", "treasureHorde"]);
const COIN_KEYS = Object.freeze(["pp", "gp", "ep", "sp", "cp"]);

function toSafeCoinCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.floor(numeric);
}

function getCarriedCoinEncumbrance(actor) {
  const coinsPerCn = Number(BECMI_ENCUMBRANCE_RULES?.currency?.coinsPerCn ?? 10);
  const divisor = Number.isFinite(coinsPerCn) && coinsPerCn > 0 ? coinsPerCn : 10;
  const carried = actor?.system?.currency?.carried ?? {};
  const totalCoins = COIN_KEYS.reduce((sum, key) => sum + toSafeCoinCount(carried?.[key]), 0);
  return totalCoins / divisor;
}

function isStoredItem(item) {
  return getItemLocation(item) === "stored";
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
  const explicit = item?.system?.inventory?.countsTowardEncumbrance;
  if (explicit === false) return false;
  if (explicit === true) return true;
  return CARRIED_LOCATIONS.includes(location);
}

function calculateScopedEncumbrance(actor, includeLocations) {
  const allItems = getActorItems(actor).filter(shouldCountItem);
  const allowed = new Set(includeLocations);
  const scopedItems = allItems.filter((item) => allowed.has(getItemLocation(item)));
  const containers = scopedItems.filter((item) => item?.type === "container");
  const containerIds = new Set(containers.map((item) => getItemId(item)).filter(Boolean));

  // Root non-container items contribute directly.
  const nonContainerWeight = scopedItems.reduce((sum, item) => {
    if (containerIds.has(getItemId(item))) return sum;

    const containerId = normalizeContainerId(item?.system?.containerId);
    if (containerId && containerIds.has(containerId)) return sum;

    return sum + getItemTotalWeight(item);
  }, 0);

  // Root containers contribute their own weight + child contents in that container.
  const rootContainers = containers.filter((container) => {
    const parentId = normalizeContainerId(container?.system?.containerId);
    return !parentId || parentId === getItemId(container) || !containerIds.has(parentId);
  });

  const containerWeight = rootContainers.reduce((sum, container) => {
    const containerId = getItemId(container);
    const contents = getItemsInContainer(actor, containerId).filter((item) => {
      if (!shouldCountItem(item)) return false;
      return allowed.has(getItemLocation(item));
    });
    const contentsWeight = contents.reduce((inner, item) => inner + getItemTotalWeight(item), 0);
    return sum + getItemTotalWeight(container) + contentsWeight;
  }, 0);

  return nonContainerWeight + containerWeight;
}

export function calculateContainerEncumbrance(actor, containerId) {
  const targetContainerId = normalizeContainerId(containerId);
  if (!targetContainerId) return { containerId: "", containerWeight: 0, contentsWeight: 0, total: 0, itemCount: 0 };

  const allItems = getActorItems(actor).filter(shouldCountItem);
  const container = allItems.find((item) => getItemId(item) === targetContainerId);
  if (!container || !shouldCountItem(container)) {
    return { containerId: targetContainerId, containerWeight: 0, contentsWeight: 0, total: 0, itemCount: 0 };
  }

  const contents = getItemsInContainer(actor, targetContainerId).filter(shouldCountItem);
  const containerWeight = getItemTotalWeight(container);
  const contentsWeight = contents.reduce((sum, item) => sum + getItemTotalWeight(item), 0);

  return { containerId: targetContainerId, containerWeight, contentsWeight, total: containerWeight + contentsWeight, itemCount: contents.length };
}

/**
 * BECMI encumbrance in coin units (cn):
 * - total: everything carried on person or in active carried containers.
 * - withoutBackpack: excludes backpack location contents and container.
 * - withoutSacks: excludes sack1 and sack2 locations.
 * - onlyWornAndBeltPouch: includes worn gear + belt pouch only.
 */
export function calculateTotalEncumbrance(actor) {
  const coinEncumbrance = getCarriedCoinEncumbrance(actor);
  const total = calculateScopedEncumbrance(actor, CARRIED_LOCATIONS) + coinEncumbrance;
  const withoutBackpack = calculateScopedEncumbrance(actor, CARRIED_LOCATIONS.filter((loc) => loc !== "backpack")) + coinEncumbrance;
  const withoutSacks = calculateScopedEncumbrance(actor, CARRIED_LOCATIONS.filter((loc) => loc !== "sack1" && loc !== "sack2")) + coinEncumbrance;
  const onlyWornAndBeltPouch = calculateScopedEncumbrance(actor, ["worn", "beltPouch"]) + coinEncumbrance;

  const movementTier = getMovementTierByEncumbrance(total);

  const containers = getContainers(actor)
    .filter(shouldCountItem)
    .map((container) => calculateContainerEncumbrance(actor, getItemId(container)));

  return {
    total,
    withoutBackpack,
    withoutSacks,
    onlyWornAndBeltPouch,
    bracket: movementTier.id,
    normalSpeed: movementTier.normalFeetPerTurn,
    encounterSpeed: movementTier.encounterFeetPerRound,
    containers
  };
}
