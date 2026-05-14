/**
 * Standard BECMI weapon rules are data-driven for weapon item auto-fill.
 * Excludes catapults, ammo entries, and natural monster attacks.
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
  battleAxe: { id: "battleAxe", label: "Battle Axe", damage: "1d8", cost: 7, encumbrance: 60, weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"] },
  handAxe: { id: "handAxe", label: "Hand Axe", damage: "1d6", cost: 4, encumbrance: 30, weaponType: "melee", hands: "one", range: { short: 10, medium: 20, long: 30 }, damageTypes: ["normal"] },
  crossbow: { id: "crossbow", label: "Crossbow", damage: "1d6", cost: 30, encumbrance: 50, weaponType: "missile", hands: "two", range: { short: 60, medium: 120, long: 180 }, ammoType: "quarrel", damageTypes: ["normal"] },
  longBow: { id: "longBow", label: "Long Bow", damage: "1d6", cost: 40, encumbrance: 30, weaponType: "missile", hands: "two", range: { short: 70, medium: 140, long: 210 }, ammoType: "arrow", damageTypes: ["normal"] },
  shortBow: { id: "shortBow", label: "Short Bow", damage: "1d6", cost: 25, encumbrance: 20, weaponType: "missile", hands: "two", range: { short: 50, medium: 100, long: 150 }, ammoType: "arrow", damageTypes: ["normal"] },
  dagger: { id: "dagger", label: "Dagger", damage: "1d4", cost: 3, encumbrance: 10, weaponType: "melee", hands: "one", range: { short: 10, medium: 20, long: 30 }, damageTypes: ["normal"] },
  silverDagger: { id: "silverDagger", label: "Silver Dagger", damage: "1d4", cost: 30, encumbrance: 10, weaponType: "melee", hands: "one", range: { short: 10, medium: 20, long: 30 }, damageTypes: ["normal", "silver"] },
  shortSword: { id: "shortSword", label: "Short Sword", damage: "1d6", cost: 7, encumbrance: 30, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  sword: { id: "sword", label: "Sword", damage: "1d8", cost: 10, encumbrance: 60, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  twoHandedSword: { id: "twoHandedSword", label: "Two-Handed Sword", damage: "1d10", cost: 15, encumbrance: 100, weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"] },
  mace: { id: "mace", label: "Mace", damage: "1d6", cost: 5, encumbrance: 30, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  club: { id: "club", label: "Club", damage: "1d4", cost: 3, encumbrance: 50, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  javelin: { id: "javelin", label: "Javelin", damage: "1d6", cost: 1, encumbrance: 20, weaponType: "missile", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  lance: { id: "lance", label: "Lance", damage: "1d6", cost: 10, encumbrance: 180, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  poleArm: { id: "poleArm", label: "Pole Arm", damage: "1d10", cost: 7, encumbrance: 150, weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"] },
  sling: { id: "sling", label: "Sling", damage: "1d4", cost: 2, encumbrance: 20, weaponType: "missile", hands: "one", range: { short: 40, medium: 80, long: 160 }, ammoType: "slingStone", damageTypes: ["normal"] },
  spear: { id: "spear", label: "Spear", damage: "1d6", cost: 3, encumbrance: 30, weaponType: "melee", hands: "one", range: { short: 20, medium: 40, long: 60 }, damageTypes: ["normal"] },
  staff: { id: "staff", label: "Staff", damage: "1d4", cost: 2, encumbrance: 20, weaponType: "melee", hands: "two", range: null, ammoType: null, damageTypes: ["normal"] },
  warHammer: { id: "warHammer", label: "War Hammer", damage: "1d6", cost: 5, encumbrance: 50, weaponType: "melee", hands: "one", range: null, ammoType: null, damageTypes: ["normal"] },
  bastardSword: { id: "bastardSword", label: "Bastard Sword", damage: "1d6+1", alternateDamageTwoHanded: "1d8+1", cost: 15, encumbrance: 80, weaponType: "melee", hands: "oneOrTwo", range: null, ammoType: null, damageTypes: ["normal"] },
  heavyCrossbow: { id: "heavyCrossbow", label: "Heavy Crossbow", damage: "1d8", cost: 50, encumbrance: 80, weaponType: "missile", hands: "two", range: { short: 80, medium: 160, long: 240 }, ammoType: "quarrel", damageTypes: ["normal"] },
  trident: { id: "trident", label: "Trident", damage: "1d6", cost: 5, encumbrance: 25, weaponType: "melee", hands: "one", range: { short: 10, medium: 20, long: 30 }, damageTypes: ["normal"] }
};

// TODO(BECMI special weapons): blowgun, bola, blackjack, net, whip require extra rules support.
