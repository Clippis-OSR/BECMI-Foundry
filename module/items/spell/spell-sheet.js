import { prepareSpellData, normalizeSpellData } from "./spell-data.js";
import { DURATION_TYPES, RANGE_TYPES, SPELL_LISTS, TARGETING_TYPES } from "./spell-constants.js";
import { validateSpellSchema } from "./spell-validation.js";

function parseCsv(value) {
  return String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

export class BECMISpellItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "item", "spell"],
      template: "systems/becmi-foundry/templates/item/spell-sheet.hbs",
      width: 760,
      height: 860,
      submitOnChange: true,
      submitOnClose: true
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    const system = context.system ?? this.item.system ?? {};
    const normalized = normalizeSpellData(system);
    context.system = normalized;
    context.preparedSpell = prepareSpellData(this.item);
    context.spellListOptions = SPELL_LISTS;
    context.rangeTypeOptions = RANGE_TYPES;
    context.durationTypeOptions = DURATION_TYPES;
    context.targetingTypeOptions = TARGETING_TYPES;
    context.tagsString = Array.isArray(normalized.tags) ? normalized.tags.join(", ") : "";
    context.spellListsString = Array.isArray(normalized.spellLists) ? normalized.spellLists.join(", ") : "";
    context.spellKeyLocked = Boolean(this.item.system?.spellKey);

    try {
      validateSpellSchema({ type: "spell", system: normalized }, `spell sheet render for "${this.item.name}"`);
      context.validationErrors = [];
    } catch (error) {
      context.validationErrors = [String(error?.message ?? error)];
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="toggle-collapse"]').on("click", (event) => {
      event.preventDefault();
      const panel = event.currentTarget.closest(".spell-panel");
      panel?.classList.toggle("collapsed");
    });
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    expanded.system = normalizeSpellData(expanded.system ?? {});

    const existingSpellKey = this.item.system?.spellKey;
    const incomingSpellKey = expanded.system?.spellKey;
    if (existingSpellKey && incomingSpellKey !== existingSpellKey) {
      ui.notifications?.error(`Spell Key is immutable after creation. Keeping "${existingSpellKey}".`);
      expanded.system.spellKey = existingSpellKey;
    }

    expanded.system.tags = parseCsv(expanded.system.tagsString);
    expanded.system.spellLists = parseCsv(expanded.system.spellListsString);
    delete expanded.system.tagsString;
    delete expanded.system.spellListsString;

    validateSpellSchema({ ...this.item.toObject(), system: expanded.system }, `spell sheet save for "${this.item.name}"`);
    await this.item.update({ system: expanded.system, name: expanded.name ?? this.item.name });
  }
}
