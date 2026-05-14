import { ensureActorEquipmentSlots } from "../items/equipment-slots.mjs";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

export function getACModifiers(actor) {
  const buffs = Array.isArray(actor?.system?.buffs?.ac) ? actor.system.buffs.ac : [];
  const temporaryBonus = buffs.reduce((sum, buff) => sum + asNumber(buff?.acBonus, 0), 0);

  const equippedItems = actor.items.filter((item) => item?.system?.equipped);
  const ringBonus = equippedItems
    .filter((item) => item?.system?.slot === "ring")
    .reduce((sum, item) => sum + asNumber(item?.system?.acBonus, 0), 0);
  const amuletBonus = equippedItems
    .filter((item) => item?.system?.slot === "amulet")
    .reduce((sum, item) => sum + asNumber(item?.system?.acBonus, 0), 0);
  const magicalEquipmentBonus = equippedItems.reduce((sum, item) => sum + asNumber(item?.system?.acBonus, 0), 0);

  const dexBonus = asNumber(actor?.system?.abilities?.dex?.mod, 0);
  const masteryBonus = asNumber(actor?.system?.ac?.masteryBonus, 0);

  return { dexBonus, ringBonus, amuletBonus, temporaryBonus, masteryBonus, magicalEquipmentBonus, buffs };
}

// Descending AC math: lower AC is better, so defensive bonuses are subtracted.
export function calculateActorAC(actor) {
  const type = actor?.type;
  const modifiers = getACModifiers(actor);

  if (type === "character") {
    const armor = getEquippedArmor(actor);
    const shield = getEquippedShield(actor);

    const armorBaseAC = asNumber(armor?.system?.armorClass, 9) || 9;
    const shieldBonus = asNumber(shield?.system?.shieldBonus, shield ? 1 : 0);

    const breakdown = [
      { label: "Armor", value: armorBaseAC },
      { label: "Shield", modifier: -shieldBonus },
      { label: "Dexterity", modifier: -modifiers.dexBonus },
      { label: "Rings", modifier: -modifiers.ringBonus },
      { label: "Amulet", modifier: -modifiers.amuletBonus },
      { label: "Temporary Buffs", modifier: -modifiers.temporaryBonus },
      { label: "Weapon Mastery", modifier: -modifiers.masteryBonus }
    ];

    const finalAC = armorBaseAC
      - shieldBonus
      - modifiers.dexBonus
      - modifiers.ringBonus
      - modifiers.amuletBonus
      - modifiers.temporaryBonus
      - modifiers.masteryBonus;

    return {
      value: finalAC,
      base: armorBaseAC,
      armor: armorBaseAC,
      shieldBonus,
      dexBonus: modifiers.dexBonus,
      magicBonus: modifiers.ringBonus + modifiers.amuletBonus,
      temporaryBonus: modifiers.temporaryBonus,
      masteryBonus: modifiers.masteryBonus,
      breakdown
    };
  }

  const acData = actor?.system?.ac;
  const baseCreatureAC = asNumber(acData?.base, asNumber(acData?.value, asNumber(acData, 9)));
  const breakdown = [
    { label: "Base AC", value: baseCreatureAC },
    { label: "Magical Equipment", modifier: -modifiers.magicalEquipmentBonus },
    { label: "Temporary Buffs", modifier: -modifiers.temporaryBonus },
    { label: "Weapon Mastery", modifier: -modifiers.masteryBonus }
  ];

  const finalAC = baseCreatureAC - modifiers.magicalEquipmentBonus - modifiers.temporaryBonus - modifiers.masteryBonus;

  return {
    value: finalAC,
    base: baseCreatureAC,
    armor: baseCreatureAC,
    shieldBonus: 0,
    dexBonus: 0,
    magicBonus: modifiers.magicalEquipmentBonus,
    temporaryBonus: modifiers.temporaryBonus,
    masteryBonus: modifiers.masteryBonus,
    breakdown
  };
}
