/**
 * Standard BECMI weapon rules are data-driven.
 *
 * NOTE:
 * - Keep this table easy to edit.
 * - If an exact BECMI value is uncertain in current in-repo references, preserve a TODO.
 */

export const BECMI_DAMAGE_TYPES = [
  "normal",
  "silver",
  "magical",
  "fire",
  "cold",
  "acid",
  "poison",
  "holy",
  "cursed"
];

export const BECMI_WEAPONS = {
  // Melee weapons
  club: {
    id: "club", label: "Club", damage: "1d4", encumbrance: 20, value: 0,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  dagger: {
    id: "dagger", label: "Dagger", damage: "1d4", encumbrance: 10, value: 3,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  silverDagger: {
    // TODO(BECMI): verify exact canonical silver dagger cost/encumbrance in chosen reference.
    id: "silverDagger", label: "Silver Dagger", damage: "1d4", encumbrance: 10, value: 30,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal", "silver"]
  },
  handAxe: {
    id: "handAxe", label: "Hand Axe", damage: "1d6", encumbrance: 30, value: 4,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  battleAxe: {
    id: "battleAxe", label: "Battle Axe", damage: "1d8", encumbrance: 50, value: 7,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  mace: {
    id: "mace", label: "Mace", damage: "1d6", encumbrance: 30, value: 5,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  spear: {
    id: "spear", label: "Spear", damage: "1d6", encumbrance: 30, value: 1,
    weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"]
  },
  shortSword: {
    id: "shortSword", label: "Short Sword", damage: "1d6", encumbrance: 30, value: 7,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  sword: {
    id: "sword", label: "Sword", damage: "1d8", encumbrance: 60, value: 10,
    weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"]
  },
  twoHandedSword: {
    id: "twoHandedSword", label: "Two-Handed Sword", damage: "1d10", encumbrance: 100, value: 15,
    weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"]
  },
  polearm: {
    id: "polearm", label: "Pole Arm", damage: "1d10", encumbrance: 150, value: 7,
    weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"]
  },
  staff: {
    id: "staff", label: "Staff", damage: "1d6", encumbrance: 40, value: 0,
    weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"]
  },
  lance: {
    // TODO(BECMI): verify exact BECMI lance damage, encumbrance, and cost in selected rules reference.
    id: "lance", label: "Lance", damage: "1d8", encumbrance: 80, value: 10,
    weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"]
  },

  // Missile weapons
  sling: {
    id: "sling", label: "Sling", damage: "1d4", encumbrance: 20, value: 2,
    weaponType: "missile", hands: "one", range: { short: 50, medium: 100, long: 160 }, ammoType: "stone", damageTypes: ["normal"]
  },
  shortBow: {
    id: "shortBow", label: "Short Bow", damage: "1d6", encumbrance: 30, value: 25,
    weaponType: "missile", hands: "two", range: { short: 50, medium: 100, long: 150 }, ammoType: "arrow", damageTypes: ["normal"]
  },
  longBow: {
    id: "longBow", label: "Long Bow", damage: "1d6", encumbrance: 40, value: 40,
    weaponType: "missile", hands: "two", range: { short: 70, medium: 140, long: 210 }, ammoType: "arrow", damageTypes: ["normal"]
  },
  crossbow: {
    // TODO(BECMI): verify whether this should be split into light/heavy variants for current rules profile.
    id: "crossbow", label: "Crossbow", damage: "1d6", encumbrance: 50, value: 30,
    weaponType: "missile", hands: "two", range: { short: 80, medium: 160, long: 240 }, ammoType: "bolt", damageTypes: ["normal"]
  },

  // Natural attacks
  bite: {
    // TODO(BECMI): verify default bite damage baseline for generic natural attack item.
    id: "bite", label: "Bite", damage: "1d6", encumbrance: 0, value: 0,
    weaponType: "natural", hands: "none", range: null, ammoType: null, damageTypes: ["normal"]
  },
  claw: {
    // TODO(BECMI): verify default claw damage baseline for generic natural attack item.
    id: "claw", label: "Claw", damage: "1d4", encumbrance: 0, value: 0,
    weaponType: "natural", hands: "none", range: null, ammoType: null, damageTypes: ["normal"]
  },
  slam: {
    // TODO(BECMI): verify default slam damage baseline for generic natural attack item.
    id: "slam", label: "Slam", damage: "1d6", encumbrance: 0, value: 0,
    weaponType: "natural", hands: "none", range: null, ammoType: null, damageTypes: ["normal"]
  }
};
