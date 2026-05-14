import { CANONICAL_ITEM_SLOTS } from "../utils/schema-validation.mjs";

const LEGACY_SLOT_ALIASES = Object.freeze({
  weapon: "weaponMain",
  bothHands: "weaponMain",
  mainhand: "weaponMain",
  offhand: "weaponOffhand"
});

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function looksLikeShield(item) {
  const text = [item?.name, item?.system?.subtype, item?.system?.key, item?.system?.armorType]
    .map((entry) => String(entry ?? "").toLowerCase())
    .join(" ");
  return text.includes("shield") || text.includes("buckler");
}

function inferWeaponSlot(item) {
  const weaponType = String(item?.system?.weaponType ?? "").toLowerCase();
  if (weaponType === "natural") return "natural";

  const rangeText = String(item?.system?.range ?? "").toLowerCase();
  const ammoType = String(item?.system?.ammoType ?? "").toLowerCase();
  const hasMissileSignal = weaponType === "missile" || ammoType.length > 0 || /(bow|crossbow|sling|thrown|missile|ranged)/.test(rangeText);
  if (hasMissileSignal) return "missile";

  return "weaponMain";
}

export function normalizeLegacyItemSlotForMigration(item) {
  const raw = item?.system?.slot;
  const normalized = String(raw ?? "").trim();

  if (!isBlank(raw)) {
    const alias = LEGACY_SLOT_ALIASES[normalized];
    const slot = alias ?? normalized;
    return {
      slot,
      shouldValidate: true
    };
  }

  const itemType = String(item?.type ?? "").toLowerCase();
  if (itemType === "armor") {
    return { slot: looksLikeShield(item) ? "shield" : "armor", shouldValidate: true };
  }

  if (itemType === "weapon") {
    return { slot: inferWeaponSlot(item), shouldValidate: true };
  }

  return { slot: "", shouldValidate: false };
}

export function isCanonicalSlot(slot) {
  return CANONICAL_ITEM_SLOTS.includes(String(slot ?? "").trim());
}
