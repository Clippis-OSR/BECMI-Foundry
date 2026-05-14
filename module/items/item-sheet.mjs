import { VALID_ITEM_EQUIP_SLOTS } from "./equipment-slots.mjs";
import { BECMI_ARMOR_TYPES } from "../rules/armor-types.mjs";
import { BECMI_DAMAGE_TYPES, BECMI_WEAPONS } from "../rules/weapons.mjs";
import { BECMI_AMMO_TYPES } from "./ammo.mjs";

const SHARED_SYSTEM_DEFAULTS = {
  description: "",
  quantity: 1,
  stackable: false,
  weight: 0,
  encumbrance: 0,
  value: 0,
  identified: false,
  containerId: "",
  equipped: false,
  tags: [],
  notes: ""
};

const WEAPON_SYSTEM_DEFAULTS = {
  weaponKey: "custom",
  damage: "1d8",
  damageTypes: ["normal"],
  weaponType: "melee",
  hands: "one",
  masteryOverride: null,
  range: {
    short: null,
    medium: null,
    long: null
  }
};

export class BECMIItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "item", "inventory-item"],
      template: "systems/becmi-foundry/templates/item/item-sheet.hbs",
      width: 640,
      height: 720,
      submitOnChange: true,
      submitOnClose: true,
      closeOnSubmit: false
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    context.item = context.item ?? this.item ?? null;
    context.system = context.system ?? context.item?.system ?? this.item?.system ?? {};
    const system = context.system ?? {};

    const weaponDefaults = this.item.type === "weapon" ? WEAPON_SYSTEM_DEFAULTS : {};
    context.safeSystem = foundry.utils.mergeObject(
      foundry.utils.deepClone({ ...SHARED_SYSTEM_DEFAULTS, ...weaponDefaults }),
      system,
      { inplace: false }
    );

    context.tagsString = Array.isArray(context.safeSystem.tags)
      ? context.safeSystem.tags.join(", ")
      : "";
    context.damageTypeOptions = BECMI_DAMAGE_TYPES;
    context.weaponOptions = Object.values(BECMI_WEAPONS);
    context.selectedDamageTypes = new Set(Array.isArray(context.safeSystem.damageTypes) ? context.safeSystem.damageTypes : []);

    context.effectDataString = typeof context.safeSystem.effectData === "string"
      ? context.safeSystem.effectData
      : JSON.stringify(context.safeSystem.effectData ?? "", null, 2);

    context.isWeapon = this.item.type === "weapon";
    context.isArmor = this.item.type === "armor";
    context.isContainer = this.item.type === "container";
    context.isCurrency = this.item.type === "currency";
    context.isTreasure = this.item.type === "treasure";
    context.isConsumable = this.item.type === "consumable";
    context.isAmmo = this.item.type === "ammo";
    context.equipSlotOptions = VALID_ITEM_EQUIP_SLOTS;
    context.weaponEquipSlotOptions = ["weaponMain", "weaponOffhand", "bothHands", "natural", "missile"];
    context.armorEquipSlotOptions = ["armor", "shield"];
    context.armorTypeOptions = Object.entries(BECMI_ARMOR_TYPES).map(([key, value]) => ({ key, ...value }));
    context.ammoTypeOptions = ["", ...BECMI_AMMO_TYPES];
    const selectedArmorType = context.safeSystem.armorType ?? "none";
    context.selectedArmorTypeData = BECMI_ARMOR_TYPES[selectedArmorType] ?? BECMI_ARMOR_TYPES.none;

    return context;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const updates = foundry.utils.flattenObject(expanded);

    const tagsString = expanded.system?.tagsString;
    delete updates["system.tagsString"];
    const damageTypes = expanded.system?.damageTypes;

    if (typeof tagsString === "string") {
      updates["system.tags"] = tagsString
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
    updates["system.damageTypes"] = Array.isArray(damageTypes) ? damageTypes.filter(Boolean) : (damageTypes ? [damageTypes] : []);

    const effectDataInput = expanded.system?.effectData;
    if (typeof effectDataInput === "string") {
      const trimmed = effectDataInput.trim();

      if (trimmed.length === 0) {
        updates["system.effectData"] = "";
      } else {
        try {
          updates["system.effectData"] = JSON.parse(trimmed);
        } catch (_error) {
          updates["system.effectData"] = effectDataInput;
        }
      }
    }


    if (this.item.type === "weapon") {
      const weaponKey = String(expanded.system?.weaponKey ?? "custom").trim();
      const definition = BECMI_WEAPONS[weaponKey];
      if (weaponKey !== "custom" && definition) {
        // Standard BECMI weapons are rule-driven and auto-fill core fields.
        updates["system.weaponKey"] = definition.id;
        updates["system.damage"] = definition.damage;
        updates["system.encumbrance"] = definition.encumbrance;
        updates["system.weight"] = definition.encumbrance;
        updates["system.cost"] = definition.cost;
        updates["system.value"] = definition.cost;
        updates["system.weaponType"] = definition.weaponType;
        updates["system.damageTypes"] = Array.from(definition.damageTypes ?? []);
        updates["system.ammoType"] = definition.ammoType ?? null;
        // TODO: Future: merge ammo damageTypes with weapon damageTypes for magical/silver/fire ammunition.
        updates["system.range"] = definition.range ?? { short: null, medium: null, long: null };
        const hands = definition.hands === "oneOrTwo" ? "one" : definition.hands;
        updates["system.hands"] = hands;
        updates["system.slot"] = hands === "two" ? "bothHands" : (expanded.system?.slot || "weaponMain");
      }
    }

    if (this.item.type === "armor") {
      const armorType = String(expanded.system?.armorType ?? "none").trim().toLowerCase();
      const armorData = BECMI_ARMOR_TYPES[armorType] ?? BECMI_ARMOR_TYPES.none;
      updates["system.armorType"] = armorType;
      updates["system.slot"] = armorData.slot;
      updates["system.weight"] = armorData.encumbrance;
      updates["system.baseAC"] = Number.isFinite(armorData.baseAC) ? armorData.baseAC : 9;
      updates["system.acBonus"] = Number.isFinite(armorData.acBonus) ? armorData.acBonus : 0;
    }

    await this.item.update(updates);
  }

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if (data?.type !== "Item") {
      return super._onDrop(event);
    }

    let droppedItem = null;

    if (data.uuid) {
      droppedItem = await fromUuid(data.uuid);
    }

    if (!droppedItem && data.data) {
      droppedItem = data.data;
    }

    if (!droppedItem || droppedItem.type !== "spell") {
      return super._onDrop(event);
    }

    const current = this.item.system?.actions;
    const actions = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

    actions.push({
      id: droppedItem?.id ?? null,
      name: droppedItem?.name ?? "",
      type: "spell",
      source: droppedItem?.pack || droppedItem?.compendium ? "compendium" : "item",
      itemUuid: droppedItem?.uuid ?? null,
      uses: {
        max: null,
        value: null,
        per: null
      },
      notes: ""
    });

    await this.item.update({
      "system.actions": actions
    });

    return this.item;
  }
}
