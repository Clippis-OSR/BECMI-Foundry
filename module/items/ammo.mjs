export const BECMI_AMMO_TYPES = ["arrow", "quarrel", "slingStone", "custom"];

export function getAvailableAmmo(actor, ammoType) {
  if (!actor || !ammoType) return [];
  return Array.from(actor.items ?? []).filter((item) => (
    item?.type === "ammo"
    && String(item?.system?.ammoType ?? "") === String(ammoType)
    && Number(item?.system?.quantity ?? 0) > 0
  ));
}

export function hasAvailableAmmo(actor, ammoType) {
  if (ammoType === null || ammoType === undefined || ammoType === "") return true;
  return getAvailableAmmo(actor, ammoType).length > 0;
}

export function getFirstAvailableAmmo(actor, ammoType) {
  return getAvailableAmmo(actor, ammoType)[0] ?? null;
}

export async function consumeAmmo(actor, ammoType, amount = 1) {
  if (ammoType === null || ammoType === undefined || ammoType === "") return false;

  const ammoItem = getFirstAvailableAmmo(actor, ammoType);
  if (!ammoItem) return false;

  const quantity = Number(ammoItem?.system?.quantity ?? 0);
  const nextQuantity = Math.max(0, quantity - Number(amount || 1));
  await ammoItem.update({ "system.quantity": nextQuantity });
  return true;
}
