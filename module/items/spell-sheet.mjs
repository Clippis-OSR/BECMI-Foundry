export class BECMISpellItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "item", "spell"],
      template: "systems/becmi-foundry/templates/item/spell-sheet.hbs",
      width: 640,
      height: 720,
      tabs: []
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    const effects = this.item.system?.effects;

    context.traditionOptions = ["arcane", "divine"];
    context.saveTypeOptions = ["deathRayPoison", "magicWands", "paralysisTurnStone", "dragonBreath", "rodStaffSpell"];
    context.systemEffectsJson = JSON.stringify(Array.isArray(effects) ? effects : [], null, 2);

    return context;
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    const updates = foundry.utils.flattenObject(expanded);

    const effectsJson = expanded.system?.effectsJson;
    delete updates["system.effectsJson"];

    if (typeof effectsJson === "string") {
      const trimmed = effectsJson.trim();
      if (!trimmed) {
        updates["system.effects"] = [];
      } else {
        try {
          const parsed = JSON.parse(trimmed);
          if (!Array.isArray(parsed)) {
            ui.notifications?.error("Spell effects JSON must be an array.");
            return;
          }
          updates["system.effects"] = parsed;
        } catch (err) {
          ui.notifications?.error("Invalid JSON in effects field.");
          return;
        }
      }
    }

    await this.item.update(updates);
  }
}
