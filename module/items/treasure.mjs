import { getItemLocation } from "./inventory-manager.mjs";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const TREASURE_WEIGHT_DEFAULTS = {
  gem: 1,
  jewelry: 10,
  potion: 10,
  scroll: 1,
  rod: 20,
  staff: 40,
  wand: 10
};

export function normalizeTreasureType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "want") return "wand";
  return normalized;
}

export function getDefaultTreasureWeight(treasureType) {
  const normalizedType = normalizeTreasureType(treasureType);
  return TREASURE_WEIGHT_DEFAULTS[normalizedType] ?? 0;
}

export function getTreasureItems(actor) {
  const items = Array.from(actor?.items ?? []);
  return items.filter((item) => item?.type === "treasure");
}

export function getTreasureTotalValue(actor, identifiedOnly = false) {
  return getTreasureItems(actor).reduce((sum, item) => {
    if (identifiedOnly && !item?.system?.identified) return sum;
    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const explicitValue = toNumber(item?.system?.value, NaN);
    const estimatedValue = toNumber(item?.system?.estimatedValue, 0);
    const unitValue = Number.isFinite(explicitValue) ? explicitValue : estimatedValue;
    return sum + (quantity * unitValue);
  }, 0);
}

export function getTreasureWeight(actor) {
  return getTreasureItems(actor).reduce((sum, item) => {
    if (getItemLocation(item) === "storage") return sum;
    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const rawWeight = item?.system?.weight;
    const parsedWeight = Number(rawWeight);
    const hasExplicitWeight = Number.isFinite(parsedWeight);
    const fallbackWeight = getDefaultTreasureWeight(item?.system?.treasureType);
    const weight = Math.max(0, hasExplicitWeight ? parsedWeight : fallbackWeight);
    return sum + (quantity * weight);
  }, 0);
}
