/**
 * Standard BECMI weapon rules are data-driven.
 * Item sheets should prefer `system.weaponKey` and auto-fill rules fields from this map.
 */
export const BECMI_DAMAGE_TYPES = [
  "normal", "silver", "magical", "fire", "cold", "acid", "poison", "holy", "cursed"
];

export const BECMI_WEAPONS = {
  dagger: { id: "dagger", label: "Dagger", damage: "1d4", encumbrance: 10, value: 3, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  longsword: { id: "longsword", label: "Longsword", damage: "1d8", encumbrance: 60, value: 15, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  shortSword: { id: "shortSword", label: "Short Sword", damage: "1d6", encumbrance: 30, value: 7, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  bastadSword: { id: "bastadSword", label: "Bastard Sword", damage: "1d8", encumbrance: 60, value: 25, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  twoHandedSword: { id: "twoHandedSword", label: "Two-Handed Sword", damage: "1d10", encumbrance: 100, value: 30, weaponType: "melee", hands: "two", range: null, ammoType: "", damageTypes: ["normal"] },
  battleAxe: { id: "battleAxe", label: "Battle Axe", damage: "1d8", encumbrance: 50, value: 7, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  handAxe: { id: "handAxe", label: "Hand Axe", damage: "1d6", encumbrance: 30, value: 4, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  mace: { id: "mace", label: "Mace", damage: "1d6", encumbrance: 30, value: 5, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  club: { id: "club", label: "Club", damage: "1d4", encumbrance: 20, value: 0, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  warhammer: { id: "warhammer", label: "Warhammer", damage: "1d6", encumbrance: 50, value: 5, weaponType: "melee", hands: "one", range: null, ammoType: "", damageTypes: ["normal"] },
  spear: { id: "spear", label: "Spear", damage: "1d6", encumbrance: 30, value: 1, weaponType: "melee", hands: "two", range: null, ammoType: "", damageTypes: ["normal"] },
  polearm: { id: "polearm", label: "Polearm", damage: "1d10", encumbrance: 150, value: 7, weaponType: "melee", hands: "two", range: null, ammoType: "", damageTypes: ["normal"] },
  staff: { id: "staff", label: "Staff", damage: "1d6", encumbrance: 40, value: 0, weaponType: "melee", hands: "two", range: null, ammoType: "", damageTypes: ["normal"] },
  shortBow: { id: "shortBow", label: "Short Bow", damage: "1d6", encumbrance: 30, value: 25, weaponType: "missile", hands: "two", range: { short: 50, medium: 100, long: 150 }, ammoType: "arrow", damageTypes: ["normal"] },
  longBow: { id: "longBow", label: "Long Bow", damage: "1d6", encumbrance: 40, value: 40, weaponType: "missile", hands: "two", range: { short: 70, medium: 140, long: 210 }, ammoType: "arrow", damageTypes: ["normal"] },
  lightcrossbow: { id: "lightcrossbow", label: "Light Crossbow", damage: "1d6", encumbrance: 50, value: 30, weaponType: "missile", hands: "two", range: { short: 60, medium: 120, long: 180 }, ammoType: "bolt", damageTypes: ["normal"] },
  heavycrossbow: { id: "heavycrossbow", label: "Heavy Crossbow", damage: "1d8", encumbrance: 80, value: 50, weaponType: "missile", hands: "two", range: { short: 80, medium: 160, long: 240 }, ammoType: "bolt", damageTypes: ["normal"] },
  sling: { id: "sling", label: "Sling", damage: "1d4", encumbrance: 20, value: 2, weaponType: "missile", hands: "one", range: { short: 40, medium: 80, long: 160 }, ammoType: "stone", damageTypes: ["normal"] },
  natural: { id: "natural", label: "Natural", damage: "1d4", encumbrance: 0, value: 0, weaponType: "natural", hands: "none", range: null, ammoType: "", damageTypes: ["normal"] }
};
