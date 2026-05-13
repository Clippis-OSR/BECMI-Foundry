function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getTreasureItems(actor) {
  const items = Array.from(actor?.items ?? []);
  return items.filter((item) => item?.type === "treasure");
}

export function getTreasureTotalValue(actor, identifiedOnly = false) {
  return getTreasureItems(actor).reduce((sum, item) => {
    if (identifiedOnly && !Boolean(item?.system?.identified)) return sum;
    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const explicitValue = toNumber(item?.system?.value, NaN);
    const estimatedValue = toNumber(item?.system?.estimatedValue, 0);
    const unitValue = Number.isFinite(explicitValue) ? explicitValue : estimatedValue;
    return sum + (quantity * unitValue);
  }, 0);
}

export function getTreasureWeight(actor) {
  return getTreasureItems(actor).reduce((sum, item) => {
    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const weight = Math.max(0, toNumber(item?.system?.weight, 0));
    return sum + (quantity * weight);
  }, 0);
}
