import { prepareSpellData } from "./spell-data.js";
import { AUTOMATION_MODES, DURATION_TYPES, RANGE_TYPES, SPELL_LISTS, TARGETING_TYPES } from "./spell-constants.js";

export class BECMISpellItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "item", "spell"],
      template: "systems/becmi-foundry/templates/item/spell-sheet.hbs",
      width: 700,
      height: 780,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    context.system = context.system ?? this.item.system ?? {};
    context.preparedSpell = prepareSpellData(this.item);
    context.spellListOptions = SPELL_LISTS;
    context.rangeTypeOptions = RANGE_TYPES;
    context.durationTypeOptions = DURATION_TYPES;
    context.targetingTypeOptions = TARGETING_TYPES;
    context.automationModeOptions = AUTOMATION_MODES;
    context.tagsString = Array.isArray(context.system.tags) ? context.system.tags.join(", ") : "";
    context.spellListsString = Array.isArray(context.system.spellLists) ? context.system.spellLists.join(", ") : "";
    return context;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const updates = foundry.utils.flattenObject(expanded);

    const tagsString = expanded.system?.tagsString;
    delete updates["system.tagsString"];
    if (typeof tagsString === "string") {
      updates["system.tags"] = tagsString.split(",").map((tag) => tag.trim()).filter(Boolean);
    }

    const spellListsString = expanded.system?.spellListsString;
    delete updates["system.spellListsString"];
    if (typeof spellListsString === "string") {
      updates["system.spellLists"] = spellListsString.split(",").map((entry) => entry.trim()).filter(Boolean);
    }

    await this.item.update(updates);
  }
}
