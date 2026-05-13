import {
  rollAbilityCheck,
  rollCharacterAttack,
  rollInitiative,
  rollSavingThrow,
  rollThiefSkill
} from "../rolls/becmi-rolls.mjs";
import {
  getActorItems,
  getItemTotalWeight,
  normalizeContainerId,
  normalizeItemLocation
} from "../items/inventory-manager.mjs";
import { calculateTotalEncumbrance } from "../items/encumbrance.mjs";
import * as currencyHelpers from "../items/currency.mjs";
import * as treasureHelpers from "../items/treasure.mjs";
import { importItemToActor } from "../items/item-importer.mjs";

const DEBUG_INVENTORY = false;
const debugInventory = (...args) => {
  if (DEBUG_INVENTORY) console.debug("[BECMI inventory]", ...args);
};

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
    context.inventoryGroups = this._buildInventoryGroups();
    context.currencySummary = this._buildCurrencySummary();
    context.treasureSummary = this._buildTreasureSummary();
    context.encumbranceSummary = this._buildEncumbranceSummary();

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

    html.find('[data-action="item-edit"]').on("click", (event) => {
      event.preventDefault();
      const item = this.actor.items.get(event.currentTarget.dataset.itemId);
      item?.sheet?.render(true);
    });

    html.find('[data-action="item-delete"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = event.currentTarget.dataset.itemId;
      if (!itemId) return;
      await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
    });

    html.find('[data-action="change-currency-quantity"]').on("change", this._onCurrencyQuantityChange.bind(this));
    html.find('[data-action="update-inventory-item"]').on("change", this._onUpdateInventoryItem.bind(this));
    html.find('[data-action="update-inventory-item"]').on("click", (event) => event.stopPropagation());
  }


  _buildEncumbranceSummary() {
    try {
      const result = calculateTotalEncumbrance(this.actor) ?? {};
      const total = Number.isFinite(Number(result.total)) ? Number(result.total) : 0;
      const bracket = result.bracket ?? "0-400";
      const normalSpeed = Number.isFinite(Number(result.normalSpeed)) ? Number(result.normalSpeed) : 0;
      const encounterSpeed = Number.isFinite(Number(result.encounterSpeed)) ? Number(result.encounterSpeed) : 0;
      const containers = Array.isArray(result.containers)
        ? result.containers.map((entry) => ({
          containerId: entry?.containerId ?? "",
          containerWeight: Number.isFinite(Number(entry?.containerWeight)) ? Number(entry.containerWeight) : 0,
          contentsWeight: Number.isFinite(Number(entry?.contentsWeight)) ? Number(entry.contentsWeight) : 0,
          total: Number.isFinite(Number(entry?.total)) ? Number(entry.total) : 0,
          itemCount: Number.isFinite(Number(entry?.itemCount)) ? Number(entry.itemCount) : 0
        }))
        : [];

      return { total, bracket, normalSpeed, encounterSpeed, containers };
    } catch (error) {
      console.warn("BECMI encumbrance summary failed", error);
      return { total: 0, bracket: "0-400", normalSpeed: 0, encounterSpeed: 0, containers: [] };
    }
  }

  _buildCurrencySummary() {
    const denominations = ["cp", "sp", "ep", "gp", "pp"];
    const values = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 5 };
    const rows = denominations.map((denomination) => ({
      denomination,
      quantity: 0,
      valueGp: 0,
      weightCn: 0
    }));

    try {
      const getCurrencyItems = currencyHelpers?.getCurrencyItems;
      if (typeof getCurrencyItems !== "function") {
        return { rows, totalValueGp: 0, totalWeightCn: 0 };
      }

      const byDenomination = new Map();
      for (const item of getCurrencyItems(this.actor)) {
        const key = String(item?.system?.denomination ?? "").trim().toLowerCase();
        if (!denominations.includes(key)) continue;
        byDenomination.set(key, item);
      }

      for (const row of rows) {
        const item = byDenomination.get(row.denomination);
        const quantity = Math.max(0, Number(item?.system?.quantity ?? 0) || 0);
        const weightPerUnit = Number(item?.system?.weightPerUnit ?? 1);
        row.quantity = quantity;
        row.valueGp = quantity * (values[row.denomination] ?? 0);
        row.weightCn = quantity * (Number.isFinite(weightPerUnit) ? weightPerUnit : 1);
      }

      const getCurrencyTotalValue = currencyHelpers?.getCurrencyTotalValue;
      const getCurrencyWeight = currencyHelpers?.getCurrencyWeight;
      const totalValueGp = typeof getCurrencyTotalValue === "function"
        ? Number(getCurrencyTotalValue(this.actor)) || 0
        : rows.reduce((sum, row) => sum + row.valueGp, 0);
      const totalWeightCn = typeof getCurrencyWeight === "function"
        ? Number(getCurrencyWeight(this.actor)) || 0
        : rows.reduce((sum, row) => sum + row.weightCn, 0);

      return { rows, totalValueGp, totalWeightCn };
    } catch (error) {
      console.warn("BECMI currency summary failed", error);
      return { rows, totalValueGp: 0, totalWeightCn: 0 };
    }
  }

  _buildTreasureSummary() {
    const empty = { totalValue: 0, identifiedValue: 0, totalWeight: 0, count: 0 };
    try {
      const getTreasureItems = treasureHelpers?.getTreasureItems;
      const getTreasureTotalValue = treasureHelpers?.getTreasureTotalValue;
      const getTreasureWeight = treasureHelpers?.getTreasureWeight;
      if (typeof getTreasureItems !== "function") return empty;

      const items = getTreasureItems(this.actor);
      return {
        count: Array.isArray(items) ? items.length : 0,
        totalValue: typeof getTreasureTotalValue === "function" ? Number(getTreasureTotalValue(this.actor, false)) || 0 : 0,
        identifiedValue: typeof getTreasureTotalValue === "function" ? Number(getTreasureTotalValue(this.actor, true)) || 0 : 0,
        totalWeight: typeof getTreasureWeight === "function" ? Number(getTreasureWeight(this.actor)) || 0 : 0
      };
    } catch (error) {
      console.warn("BECMI treasure summary failed", error);
      return empty;
    }
  }

  async _onCurrencyQuantityChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const denomination = String(input?.dataset?.denomination ?? "").toLowerCase();
    const normalize = currencyHelpers?.normalizeCurrencyDenomination;
    const safeDenomination = typeof normalize === "function" ? normalize(denomination) : null;
    if (!safeDenomination) return;

    const requestedQuantity = Math.max(0, Math.floor(Number(input?.value ?? 0) || 0));
    const items = typeof currencyHelpers?.getCurrencyItems === "function"
      ? currencyHelpers.getCurrencyItems(this.actor)
      : [];
    const existing = items.find((item) => String(item?.system?.denomination ?? "").toLowerCase() === safeDenomination);
    const currentQuantity = Math.max(0, Math.floor(Number(existing?.system?.quantity ?? 0) || 0));
    const delta = requestedQuantity - currentQuantity;
    if (delta === 0) return;

    if (delta > 0 && typeof currencyHelpers?.addCurrency === "function") {
      await currencyHelpers.addCurrency(this.actor, safeDenomination, delta);
    } else if (delta < 0 && typeof currencyHelpers?.removeCurrency === "function") {
      await currencyHelpers.removeCurrency(this.actor, safeDenomination, Math.abs(delta));
    } else if (!existing && requestedQuantity > 0 && typeof currencyHelpers?.createCurrencyItem === "function") {
      await currencyHelpers.createCurrencyItem(this.actor, safeDenomination, requestedQuantity);
    } else if (existing?.update) {
      // Safer/simple path: keep currency items with quantity 0 rather than deleting items.
      await existing.update({ "system.quantity": requestedQuantity });
    }

    this.render(false);
  }

  async _onUpdateInventoryItem(event) {
    event.preventDefault();
    event.stopPropagation();

    const input = event.currentTarget;
    const itemId = input?.dataset?.itemId;
    const field = input?.dataset?.field;
    if (!itemId || !field) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    let value;
    if (input.type === "checkbox") {
      value = Boolean(input.checked);
    } else if (input.type === "number") {
      const parsed = Number(input.value);
      value = Number.isNaN(parsed) ? 0 : parsed;
    } else {
      value = String(input.value ?? "");
    }

    debugInventory("inline field change", { itemId, field, parsedValue: value });

    if (field === "system.containerId") {
      value = normalizeContainerId(value);
    }

    if (field === "system.location") {
      value = normalizeItemLocation(value);
      const syncMap = {
        equipped: { "system.equipped": true, "system.worn": false },
        worn: { "system.equipped": false, "system.worn": true },
        storage: { "system.equipped": false, "system.worn": false }
      };
      await item.update({ [field]: value, ...(syncMap[value] ?? {}) });
      this.render(false);
      return;
    }

    await item.update({ [field]: value });
    const updated = this.actor.items.get(item.id);
    const updatedValue = field === "name"
      ? updated?.name
      : foundry.utils.getProperty(updated, field);
    debugInventory("post item.update", { itemId, field, updatedValue });
    this.render(false);
  }

  _buildInventoryGroups() {
    // Placeholder for future slot enforcement, e.g. rings: 2, amulet: 1, belt: 1, gloves: 1, boots/shoes: 1, helmet: 1.
    const items = getActorItems(this.actor);
    const groupDefinitions = [
      { key: "equipped", label: "Equipped" },
      { key: "worn", label: "Worn" },
      { key: "storage", label: "Storage" }
    ];

    const groups = groupDefinitions.map((group) => ({
      ...group,
      sectionLocation: group.key,
      items: items.filter((item) => normalizeItemLocation(item?.system?.location) === group.key).map((item) => {
        const quantityRaw = item?.system?.quantity;
        const weightRaw = item?.system?.weight;
        const valueRaw = item?.system?.value;
        const quantity = Number(quantityRaw ?? 1);
        const weight = Number(weightRaw ?? 0);
        const totalWeight = getItemTotalWeight(item);
        const value = Number(valueRaw ?? 0);
        debugInventory("build inventory row", {
          itemId: item?.id ?? null,
          quantity,
          weight,
          value,
          source: { quantity: quantityRaw, weight: weightRaw, value: valueRaw }
        });

        return {
          id: item.id,
          name: item.name,
          quantity,
          weight,
          totalWeight,
          value,
          estimatedValue: Number(item?.system?.estimatedValue ?? 0),
          denomination: String(item?.system?.denomination ?? ""),
          containerId: String(item?.system?.containerId ?? ""),
          location: normalizeItemLocation(item?.system?.location),
          identified: Boolean(item?.system?.identified),
          notes: String(item?.system?.notes ?? ""),
          type: item?.type ?? ""
        };
      })
    }));

    return groups.map((group) => {
      const containedWeight = (group.items ?? []).reduce((sum, item) => sum + (Number(item.totalWeight) || 0), 0);
      const sectionSummary = `${group.label} — ${(group.items ?? []).length} items — ${containedWeight} cn`;

      return {
        ...group,
        itemCount: (group.items ?? []).length,
        containedWeight,
        sectionSummary
      };
    });
  }

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if (data?.type !== "Item") {
      return super._onDrop(event);
    }

    let sourceItem = null;
    try {
      sourceItem = await Item.fromDropData(data);
    } catch (error) {
      console.warn("BECMI drop failed to resolve Item", { data, error });
      return super._onDrop(event);
    }

    if (!sourceItem) {
      console.warn("BECMI drop ignored unsupported Item data", data);
      return super._onDrop(event);
    }

    const droppedInSpellsTab = event.target instanceof Element
      && event.target.closest(".tab[data-tab=\"spells\"]");
    if (sourceItem.type === "spell" && droppedInSpellsTab) {
      await this._addKnownSpellFromItem(sourceItem);
      return true;
    }

    const supportedTypes = new Set(["equipment", "weapon", "armor", "container", "currency", "treasure", "consumable"]);
    if (!supportedTypes.has(sourceItem.type)) {
      return super._onDrop(event);
    }

    const dropLocation = this._getDropLocation(event);
    await importItemToActor(this.actor, sourceItem, { location: dropLocation });
    this.render(false);
    return true;
  }

  _getDropLocation(event) {
    if (!(event?.target instanceof Element)) return "worn";
    const sectionElement = event.target.closest("[data-location]");
    return normalizeItemLocation(sectionElement?.dataset?.location ?? "worn");
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
