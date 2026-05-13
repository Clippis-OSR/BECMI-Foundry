const CURRENCY_DENOMINATIONS = ["cp", "sp", "ep", "gp", "pp"];

const CURRENCY_VALUE_IN_GP = {
  cp: 0.01,
  sp: 0.1,
  ep: 0.5,
  gp: 1,
  pp: 5
};

const DEFAULT_COIN_WEIGHT = 1;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCurrencyDenomination(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return CURRENCY_DENOMINATIONS.includes(normalized) ? normalized : null;
}

/**
 * Currency remains actor-owned items so it can continue to participate in
 * encumbrance and container workflows.
 */
export function getCurrencyItems(actor) {
  const items = Array.from(actor?.items ?? []);
  return items.filter((item) => {
    if (item?.type !== "currency") return false;
    const denomination = normalizeCurrencyDenomination(item?.system?.denomination);
    return Boolean(denomination);
  });
}

export function getCurrencyTotalValue(actor) {
  return getCurrencyItems(actor).reduce((sum, item) => {
    const denomination = normalizeCurrencyDenomination(item?.system?.denomination);
    if (!denomination) return sum;

    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const unitValue = CURRENCY_VALUE_IN_GP[denomination] ?? 0;
    return sum + (quantity * unitValue);
  }, 0);
}

export function getCurrencyWeight(actor) {
  return getCurrencyItems(actor).reduce((sum, item) => {
    const quantity = Math.max(0, toNumber(item?.system?.quantity, 0));
    const weightPerUnit = toNumber(item?.system?.weightPerUnit, DEFAULT_COIN_WEIGHT);
    return sum + (quantity * weightPerUnit);
  }, 0);
}

export async function createCurrencyItem(actor, denomination, quantity = 0) {
  if (!actor?.createEmbeddedDocuments) return null;

  const normalizedDenomination = normalizeCurrencyDenomination(denomination);
  if (!normalizedDenomination) return null;

  const safeQuantity = Math.max(0, Math.floor(toNumber(quantity, 0)));

  const [created] = await actor.createEmbeddedDocuments("Item", [{
    name: normalizedDenomination.toUpperCase(),
    type: "currency",
    system: {
      denomination: normalizedDenomination,
      quantity: safeQuantity,
      weightPerUnit: DEFAULT_COIN_WEIGHT,
      weight: 0
    }
  }]);

  return created ?? null;
}

export async function addCurrency(actor, denomination, quantity = 0) {
  const normalizedDenomination = normalizeCurrencyDenomination(denomination);
  if (!actor || !normalizedDenomination) return null;

  const amountToAdd = Math.max(0, Math.floor(toNumber(quantity, 0)));
  if (amountToAdd <= 0) return null;

  const existing = getCurrencyItems(actor).find(
    (item) => normalizeCurrencyDenomination(item?.system?.denomination) === normalizedDenomination
  );

  if (existing?.update) {
    const current = Math.max(0, Math.floor(toNumber(existing?.system?.quantity, 0)));
    await existing.update({ "system.quantity": current + amountToAdd });
    return existing;
  }

  return createCurrencyItem(actor, normalizedDenomination, amountToAdd);
}

export async function removeCurrency(actor, denomination, quantity = 0) {
  const normalizedDenomination = normalizeCurrencyDenomination(denomination);
  if (!actor || !normalizedDenomination) return null;

  const amountToRemove = Math.max(0, Math.floor(toNumber(quantity, 0)));
  if (amountToRemove <= 0) return null;

  const existing = getCurrencyItems(actor).find(
    (item) => normalizeCurrencyDenomination(item?.system?.denomination) === normalizedDenomination
  );

  if (!existing?.update) return null;

  const current = Math.max(0, Math.floor(toNumber(existing?.system?.quantity, 0)));
  const nextQuantity = Math.max(0, current - amountToRemove);

  await existing.update({ "system.quantity": nextQuantity });
  return existing;
}
