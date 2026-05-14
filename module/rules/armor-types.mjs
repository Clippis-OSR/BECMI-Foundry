// Standard BECMI armor data table.
// Descending AC: lower AC is better. Shields provide an AC bonus that is subtracted from AC.
export const BECMI_ARMOR_TYPES = {
  none: { label: "None / Clothing", baseAC: 9, encumbrance: 0, slot: "armor" },
  leather: { label: "Leather Armor", baseAC: 7, encumbrance: 200, slot: "armor" },
  scale: { label: "Scale Mail", baseAC: 6, encumbrance: 300, slot: "armor" },
  chain: { label: "Chain Mail", baseAC: 5, encumbrance: 400, slot: "armor" },
  banded: { label: "Banded Mail", baseAC: 4, encumbrance: 450, slot: "armor" },
  plate: { label: "Plate Mail", baseAC: 3, encumbrance: 500, slot: "armor" },
  shield: { label: "Shield", acBonus: 1, encumbrance: 100, slot: "shield" }
};

