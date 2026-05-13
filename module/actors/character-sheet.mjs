import {
  rollAbilityCheck,
  rollCharacterAttack,
  rollInitiative,
  rollSavingThrow,
  rollThiefSkill
} from "../rolls/becmi-rolls.mjs";

export class BECMICharacterSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "actor"],
      template: "systems/becmi-foundry/templates/actor/character-sheet.hbs",
      width: 760,
      height: 780,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "main"
        }
      ]
    });
  }

  getData() {
    if (this.actor?.type !== "character") {
      console.error("BECMI sheet routing mismatch", {
        actorName: this.actor?.name,
        actorType: this.actor?.type,
        sheetClass: this.constructor.name,
        template: this.template,
        system: this.actor?.system
      });

      return {
        actor: this.actor,
        cssClass: this.options.classes?.join(" ") ?? "",
        editable: this.isEditable,
        owner: this.actor?.isOwner,
        limited: this.actor?.limited,
        title: this.title,
        system: this.actor?.system ?? {}
      };
    }

    const context = super.getData();
    context.system = context.system ?? this.actor?.system ?? {};
    context.actor = context.actor ?? this.actor ?? null;
    const system = context.system ?? {};
    const attacks = Array.isArray(system.attacks) ? system.attacks : [];
    context.attacks = attacks;

    const derived = system.derived ?? {};
    const spellSlots = derived.spellSlots;
    const spellsKnown = system.spellsKnown;
    const spellLevels = ["1", "2", "3", "4", "5", "6"];

    context.spellSlotsList = spellLevels.map((level) => ({
      level,
      slots: spellSlots && typeof spellSlots === "object" && !Array.isArray(spellSlots)
        ? spellSlots[level] ?? 0
        : 0
    }));

    context.spellsKnownGroups = spellLevels.map((level) => {
      const levelEntries = spellsKnown && typeof spellsKnown === "object" && !Array.isArray(spellsKnown)
        ? spellsKnown[level]
        : [];

      const spells = Array.isArray(levelEntries)
        ? levelEntries.map((entry, index) => {
          const normalized = this._normalizeKnownSpellEntry(entry, Number(level));
          return {
            index,
            id: normalized.id,
            name: normalized.name,
            prepared: normalized.prepared,
            source: normalized.source,
            itemUuid: normalized.itemUuid,
            notes: normalized.notes
          };
        })
        : [];

      return { level, spells };
    });
    const turnUndead = derived.turnUndead;
    context.turnUndeadList = turnUndead && typeof turnUndead === "object" && !Array.isArray(turnUndead)
      ? Object.entries(turnUndead).map(([target, score]) => ({ target, score }))
      : [];

    console.warn("BECMICharacterSheet getData");
    console.warn("BECMI sheet debug", {
      actorName: this.actor?.name,
      actorType: this.actor?.type,
      sheetClass: this.constructor.name,
      template: this.template,
      system: this.actor?.system
    });
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".roll-save").click(this._onRollSave.bind(this));
    html.find(".roll-ability").click(this._onRollAbility.bind(this));
    html.find(".roll-thief-skill").click(this._onRollThiefSkill.bind(this));
    html.find(".roll-initiative").click(this._onRollInitiative.bind(this));
    html.find('[data-action="roll-character-attack"]').on("click", async (event) => {
      event.preventDefault();

      const index = Number(event.currentTarget.dataset.index);

      if (!Number.isInteger(index)) return;

      const attacks = Array.isArray(this.actor.system.attacks)
        ? this.actor.system.attacks
        : [];

      const attack = attacks[index];

      if (!attack) return;

      await rollCharacterAttack(this.actor, attack);
    });

    html.find('[data-action="add-character-attack"]').on("click", async (event) => {
      event.preventDefault();

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      attacks.push({
        name: "Weapon",
        attackMod: 0,
        damage: "1d6",
        damageMod: 0
      });

      await this.actor.update({
        "system.attacks": attacks
      });
    });

    html.find('[data-action="remove-character-attack"]').on("click", async (event) => {
      event.preventDefault();

      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isInteger(index)) return;

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      attacks.splice(index, 1);

      await this.actor.update({
        "system.attacks": attacks
      });
    });

    html.find('[data-action="change-character-attack-field"]').on("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const input = event.currentTarget;
      const index = Number(input.dataset.index);
      const field = input.dataset.field;

      if (!Number.isInteger(index)) return;
      if (!["name", "attackMod", "damage", "damageMod"].includes(field)) return;

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      if (!attacks[index]) {
        attacks[index] = {
          name: "Weapon",
          attackMod: 0,
          damage: "1d6",
          damageMod: 0
        };
      }

      let value = input.value;
      if (["attackMod", "damageMod"].includes(field)) {
        value = Number(value || 0);
      }

      attacks[index][field] = value;

      await this.actor.update({
        "system.attacks": attacks
      });
    });

    html.find(".add-known-spell").on("click", async (event) => {
      event.preventDefault();

      const level = String(event.currentTarget.dataset.level ?? "");
      if (!level) return;

      const current = this.actor.system.spellsKnown;
      const spellsKnown = current && typeof current === "object" && !Array.isArray(current)
        ? foundry.utils.deepClone(current)
        : {};

      const levelEntries = Array.isArray(spellsKnown[level]) ? spellsKnown[level] : [];
      levelEntries.push(this._createManualKnownSpell(level));
      spellsKnown[level] = levelEntries;

      await this.actor.update({
        "system.spellsKnown": spellsKnown
      });
    });

    html.find(".remove-known-spell").on("click", async (event) => {
      event.preventDefault();

      const level = String(event.currentTarget.dataset.level ?? "");
      const index = Number(event.currentTarget.dataset.index ?? -1);
      if (!level || !Number.isInteger(index) || index < 0) return;

      const current = this.actor.system.spellsKnown;
      const spellsKnown = current && typeof current === "object" && !Array.isArray(current)
        ? foundry.utils.deepClone(current)
        : {};

      const levelEntries = Array.isArray(spellsKnown[level]) ? spellsKnown[level] : [];
      if (!levelEntries[index]) return;

      levelEntries.splice(index, 1);
      spellsKnown[level] = levelEntries;

      await this.actor.update({
        "system.spellsKnown": spellsKnown
      });
    });
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

    const droppedInSpellsTab = event.target instanceof Element
      && event.target.closest(".tab[data-tab=\"spells\"]");

    if (!droppedInSpellsTab) {
      return super._onDrop(event);
    }

    await this._addKnownSpellFromItem(droppedItem);
    return true;
  }


  _createManualKnownSpell(level) {
    const numericLevel = Number(level);
    return {
      id: null,
      name: "",
      level: Number.isFinite(numericLevel) ? numericLevel : 1,
      type: this.actor.system.derived?.spellcastingType ?? this.actor.system.class ?? null,
      source: "manual",
      itemUuid: null,
      prepared: false,
      notes: ""
    };
  }

  async _addKnownSpellFromItem(item) {
    const level = Number(item?.system?.level);

    if (!Number.isFinite(level) || level <= 0) {
      ui.notifications?.warn("Dropped spell is missing a valid spell level and was not added.");
      return;
    }

    const knownSpell = {
      id: item?.id ?? null,
      name: item?.name ?? "",
      level,
      type: item?.system?.tradition ?? null,
      source: item?.pack || item?.compendium ? "compendium" : "item",
      itemUuid: item?.uuid ?? null,
      prepared: false,
      notes: ""
    };

    const current = this.actor.system.spellsKnown;
    const spellsKnown = current && typeof current === "object" && !Array.isArray(current)
      ? foundry.utils.deepClone(current)
      : {};

    const levelKey = String(level);
    const entries = Array.isArray(spellsKnown[levelKey]) ? spellsKnown[levelKey] : [];
    entries.push(knownSpell);
    spellsKnown[levelKey] = entries;

    await this.actor.update({
      "system.spellsKnown": spellsKnown
    });
  }

  _normalizeKnownSpellEntry(entry, level) {
    const numericLevel = Number.isInteger(level) && level > 0 ? level : 1;
    return {
      id: entry?.id ?? null,
      name: entry?.name ?? "",
      level: Number.isInteger(entry?.level) ? entry.level : numericLevel,
      type: entry?.type ?? null,
      source: entry?.source ?? "manual",
      itemUuid: entry?.itemUuid ?? null,
      prepared: Boolean(entry?.prepared),
      notes: entry?.notes ?? ""
    };
  }

  async _onRollSave(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const saveKey = button.dataset.save;
    const label = button.dataset.label;

    await rollSavingThrow(this.actor, saveKey, label);
  }

  async _onRollAbility(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const abilityKey = button.dataset.ability;
    const label = button.dataset.label;

    await rollAbilityCheck(this.actor, abilityKey, label);
  }

  async _onRollThiefSkill(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const skillKey = button.dataset.skill;
    const label = button.dataset.label;

    await rollThiefSkill(this.actor, skillKey, label);
  }

  async _onRollInitiative(event) {
    event.preventDefault();

    await rollInitiative(this.actor);
  }
}
