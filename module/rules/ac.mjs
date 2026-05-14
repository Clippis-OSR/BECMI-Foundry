import { ensureActorEquipmentSlots } from "../items/equipment-slots.mjs";
import { BECMI_ARMOR_TYPES } from "./armor-types.mjs";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getItemSlot(item) {
  return String(item?.system?.slot ?? "").trim().toLowerCase();
}

export function getEquippedArmor(actor) {
  const slots = ensureActorEquipmentSlots(actor);
  const direct = slots.armor ? actor.items.get(slots.armor) : null;
  if (direct) return direct;
  return actor.items.find((item) => item?.system?.equipped && (item?.system?.slot === "armor" || item?.type === "armor")) ?? null;
}

export function getEquippedShield(actor) {
  const slots = ensureActorEquipmentSlots(actor);
  const direct = slots.shield ? actor.items.get(slots.shield) : null;
  if (direct) return direct;
  return actor.items.find((item) => item?.system?.equipped && item?.system?.slot === "shield") ?? null;
}

export function getEquippedDefensiveItems(actor) {
  const slots = ensureActorEquipmentSlots(actor);
  const slottedIds = [
    slots.armor,
    slots.shield,
    slots.ring,
    slots.amulet,
    slots.cloak
  ].filter(Boolean);

  // Include slotted defensive items first, then any equipped defensive items for forward compatibility (e.g. bracers).
  const fromSlots = slottedIds.map((id) => actor.items.get(id)).filter((item) => item?.system?.equipped);
  const equippedDefensive = actor.items.filter((item) => {
    if (!item?.system?.equipped) return false;
    const slot = getItemSlot(item);
    return ["armor", "shield", "ring", "amulet", "cloak", "bracers"].includes(slot);
  });

  const deduped = new Map();
  for (const item of [...fromSlots, ...equippedDefensive]) deduped.set(item.id, item);
  return Array.from(deduped.values());
}

// Descending AC math: lower AC is better, so defensive bonuses are subtracted.
export function calculateActorAC(actor) {
  const type = actor?.type;
  const buffs = Array.isArray(actor?.system?.buffs?.ac) ? actor.system.buffs.ac : [];
  const temporaryBonus = buffs.reduce((sum, buff) => sum + asNumber(buff?.acBonus, 0), 0);

  if (type === "character") {
    const armor = getEquippedArmor(actor);
    const shield = getEquippedShield(actor);
    const defensiveItems = getEquippedDefensiveItems(actor);

    // Standard BECMI armor AC should come from the armor type rules table.
    const armorTypeKey = String(armor?.system?.armorType ?? "none").trim().toLowerCase();
    const armorTypeData = BECMI_ARMOR_TYPES[armorTypeKey] ?? BECMI_ARMOR_TYPES.none;
    const baseArmorAC = asNumber(armorTypeData?.baseAC, asNumber(armor?.system?.baseAC, 9));

    const shieldTypeKey = String(shield?.system?.armorType ?? "").trim().toLowerCase();
    const shieldFromType = shieldTypeKey === "shield" ? asNumber(BECMI_ARMOR_TYPES.shield?.acBonus, 1) : 0;
    const shieldBonus = Math.max(0, shieldFromType || asNumber(shield?.system?.acBonus, shield ? 1 : 0));
    const dexBonus = asNumber(actor?.system?.abilities?.dex?.mod, 0);

    const magicalEquipmentBonus = defensiveItems.reduce((sum, item) => {
      if (item.id === armor?.id || item.id === shield?.id) return sum;
      return sum + Math.max(0, asNumber(item?.system?.acBonus, 0));
    }, 0);

    const breakdown = [
      { label: armor?.name ?? "No Armor", value: baseArmorAC },
      { label: "Shield", modifier: -shieldBonus },
      { label: "Dexterity", modifier: -dexBonus },
      { label: "Magical Equipment", modifier: -magicalEquipmentBonus },
      { label: "Temporary Buffs", modifier: -temporaryBonus }
    ];

    const finalAC = baseArmorAC - shieldBonus - dexBonus - magicalEquipmentBonus - temporaryBonus;

    return {
      value: finalAC,
      base: baseArmorAC,
      armor: baseArmorAC,
      shieldBonus,
      dexBonus,
      magicBonus: magicalEquipmentBonus,
      temporaryBonus,
      masteryBonus: 0,
      breakdown
    };
  }

  const defensiveItems = getEquippedDefensiveItems(actor);
  const magicalEquipmentBonus = defensiveItems.reduce((sum, item) => sum + Math.max(0, asNumber(item?.system?.acBonus, 0)), 0);
  const acData = actor?.system?.ac;
  const baseCreatureAC = asNumber(acData?.base, asNumber(acData?.value, asNumber(acData, 9)));

  const breakdown = [
    { label: "Base AC", value: baseCreatureAC },
    { label: "Magical Equipment", modifier: -magicalEquipmentBonus },
    { label: "Temporary Buffs", modifier: -temporaryBonus }
  ];

  const finalAC = baseCreatureAC - magicalEquipmentBonus - temporaryBonus;

  return {
    value: finalAC,
    base: baseCreatureAC,
    armor: baseCreatureAC,
    shieldBonus: 0,
    dexBonus: 0,
    magicBonus: magicalEquipmentBonus,
    temporaryBonus,
    masteryBonus: 0,
    breakdown
  };
}
