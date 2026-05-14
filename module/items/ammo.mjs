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
