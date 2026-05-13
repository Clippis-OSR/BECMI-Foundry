const SHARED_SYSTEM_DEFAULTS = {
  description: "",
  quantity: 0,
  stackable: false,
  weight: 0,
  value: 0,
  identified: false,
  containerId: "",
  equipped: false,
  worn: false,
  rarity: "",
  tags: [],
  notes: ""
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

    context.safeSystem = {
      ...SHARED_SYSTEM_DEFAULTS,
      ...system
    };

    context.tagsString = Array.isArray(context.safeSystem.tags)
      ? context.safeSystem.tags.join(", ")
      : "";

    context.effectDataString = typeof context.safeSystem.effectData === "string"
      ? context.safeSystem.effectData
      : JSON.stringify(context.safeSystem.effectData ?? "", null, 2);

    context.isWeapon = this.item.type === "weapon";
    context.isArmor = this.item.type === "armor";
    context.isContainer = this.item.type === "container";
    context.isCurrency = this.item.type === "currency";
    context.isTreasure = this.item.type === "treasure";
    context.isConsumable = this.item.type === "consumable";

    return context;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const updates = foundry.utils.flattenObject(expanded);

    const tagsString = expanded.system?.tagsString;
    delete updates["system.tagsString"];

    if (typeof tagsString === "string") {
      updates["system.tags"] = tagsString
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

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
