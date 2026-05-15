import { getActorItems, getItemLocation, getItemTotalWeight } from "./inventory-manager.mjs";
import { BECMI_ENCUMBRANCE_RULES, getMovementTierByEncumbrance } from "../rules/encumbrance.mjs";

const CARRIED_LOCATIONS = new Set(["carried", "worn", "equipped", "backpack", "beltPouch", "sack"]);
const COIN_KEYS = ["pp", "gp", "ep", "sp", "cp"];
const CONTAINER_TYPES = Object.keys(BECMI_ENCUMBRANCE_RULES.containers);

const safeNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const itemId = (i) => i?.id ?? i?._id ?? "";

function getCarriedCoinEncumbrance(actor) {
  const carried = actor?.system?.currency?.carried ?? {};
  const totalCoins = COIN_KEYS.reduce((sum, k) => sum + Math.max(0, Math.floor(safeNum(carried[k], 0))), 0);
  return totalCoins / safeNum(BECMI_ENCUMBRANCE_RULES.currency.coinsPerCn, 10);
}

export function getContainerTypeOptions() {
  return CONTAINER_TYPES.map((key) => ({ value: key, label: BECMI_ENCUMBRANCE_RULES.containers[key].label }));
}

export function getContainerRules(containerType) {
  return BECMI_ENCUMBRANCE_RULES.containers[containerType] ?? BECMI_ENCUMBRANCE_RULES.containers.genericContainer;
}

export function buildContainerLoadSummary(actor, container) {
  const id = itemId(container);
  const location = getItemLocation(container);
  const rules = getContainerRules(container?.system?.containerType);
  const contents = getActorItems(actor).filter((it) => (it?.system?.containerId ?? "") === id);
  const currentLoadCn = contents.reduce((s, it) => s + getItemTotalWeight(it), 0);
  const maxCapacityCn = safeNum(rules.capacityCn, 0);
  const remainingCapacityCn = maxCapacityCn - currentLoadCn;
  const overflow = remainingCapacityCn < 0;
  const carriedState = CARRIED_LOCATIONS.has(location) ? "carried" : "stored";
  return { containerId: id, name: container?.name ?? "", containerType: rules.containerType, location, capacity: maxCapacityCn, weight: getItemTotalWeight(container), contents, carriedState, currentLoadCn, maxCapacityCn, remainingCapacityCn, overflow };
}

export function calculateTotalEncumbrance(actor) {
  const items = getActorItems(actor).filter((item) => item?.type !== "currency");
  const containers = items.filter((i) => i.type === "container");
  const containerLoadById = new Map(containers.map((c) => [itemId(c), buildContainerLoadSummary(actor, c)]));
  const isCarried = (it) => CARRIED_LOCATIONS.has(getItemLocation(it));

  let carriedWeight = 0;
  let wornWeight = 0;
  let equippedWeight = 0;
  let backpackWeight = 0;
  let beltPouchWeight = 0;
  let sackWeight = 0;
  let treasureWeight = 0;
  let storageWeight = 0;

  for (const item of items) {
    const loc = getItemLocation(item);
    const ownWeight = getItemTotalWeight(item);
    if (item.type !== "container") {
      if (item?.system?.inventory?.countsTowardEncumbrance === false) continue;
      const parent = containerLoadById.get(item?.system?.containerId ?? "");
      const parentCarried = parent?.carriedState === "carried";
      const countAsCarried = isCarried(item) || parentCarried;
      if (countAsCarried) carriedWeight += ownWeight; else storageWeight += ownWeight;
      if (loc === "worn") wornWeight += ownWeight;
      if (loc === "equipped") equippedWeight += ownWeight;
      if (loc === "treasure" && countAsCarried) treasureWeight += ownWeight;
    }
  }

  for (const container of containers) {
    const summary = containerLoadById.get(itemId(container));
    const rules = getContainerRules(summary.containerType);
    const containerEnc = summary.weight + (summary.currentLoadCn * safeNum(rules.encumbranceMultiplier, 1));
    if (summary.carriedState === "carried") carriedWeight += containerEnc; else storageWeight += containerEnc;
    if (summary.location === "backpack") backpackWeight += containerEnc;
    if (summary.location === "beltPouch") beltPouchWeight += containerEnc;
    if (summary.location === "sack") sackWeight += containerEnc;
  }

  const totalCarriedWeight = Math.round((carriedWeight + getCarriedCoinEncumbrance(actor)) * 100) / 100;
  const totalStoredWeight = Math.round(storageWeight * 100) / 100;
  const movementTier = getMovementTierByEncumbrance(totalCarriedWeight);

  return { carriedWeight, equippedWeight, wornWeight, backpackWeight, beltPouchWeight, sackWeight, treasureWeight, storageWeight, totalCarriedWeight, totalStoredWeight, movementTier, movementRate: movementTier.normalFeetPerTurn, containers: [...containerLoadById.values()] };
}
