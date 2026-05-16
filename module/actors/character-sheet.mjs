import {
  rollAbilityCheck,
  rollInitiative,
  rollSavingThrow,
  rollThiefSkill,
  rollTurnUndead
} from "../rolls/becmi-rolls.mjs";
import { getActorAttackSources, weaponItemToAttackData } from "../combat/attack.mjs";
import {
  getActorItems,
  getItemLocation,
  getItemTotalWeight,
  normalizeContainerId,
  normalizeItemLocation,
  validateItemContainerAssignment,
  getInventoryDiagnostics
} from "../items/inventory-manager.mjs";
import { calculateTotalEncumbrance } from "../items/encumbrance.mjs";
import * as currencyHelpers from "../items/currency.mjs";
import * as treasureHelpers from "../items/treasure.mjs";
import { importItemToActor } from "../items/item-importer.mjs";
import { ensureActorEquipmentSlots, equipItem, unequipItem } from "../items/equipment-slots.mjs";
import { BECMI_ENCUMBRANCE_RULES } from "../rules/encumbrance.mjs";
import { buildInventoryDiagnosticsPresentation } from "../items/inventory-diagnostics-ui.mjs";

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
    const currencyStorage = system.currencyStorage && typeof system.currencyStorage === "object" && !Array.isArray(system.currencyStorage)
      ? system.currencyStorage
      : {};
    context.system.currencyStorage = {
      note: typeof currencyStorage.note === "string" ? currencyStorage.note : "",
      gpValue: Number(currencyStorage.gpValue ?? 0) || 0
    };
    const coinKeys = ["pp", "gp", "ep", "sp", "cp"];
    const normalizeCoinBucket = (bucket) => Object.fromEntries(
      coinKeys.map((key) => {
        const value = Number(bucket?.[key]);
        const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        return [key, safe];
      })
    );
    const currency = context.system.currency ?? {};
    context.system.currency = {
      carried: normalizeCoinBucket(currency.carried),
      treasureHorde: normalizeCoinBucket(currency.treasureHorde)
    };
    const treasure = context.system.treasure && typeof context.system.treasure === "object" ? context.system.treasure : {};
    context.system.treasure = {
      ...treasure,
      notes: typeof treasure.notes === "string" ? treasure.notes : ""
    };
    // Attacks are item-driven. weaponType is the canonical weapon classification field.
    // Ignore legacy actor.system.attacks for active attack actions.
    const equippedWeaponAttacks = getActorAttackSources(this.actor).map((item) => ({
      itemId: item.id,
      ...weaponItemToAttackData(item)
    }));
    context.combat = context.combat ?? {};
    context.combat.weaponAttacks = equippedWeaponAttacks;

    const derived = system.derived ?? {};
    context.spellcasting = system.spellcasting ?? { casters: {} };
    context.spellcastingDerived = derived.spellcasting ?? {};
    const turnUndead = derived.turnUndead;
    context.turnUndeadList = turnUndead && typeof turnUndead === "object" && !Array.isArray(turnUndead)
      ? Object.entries(turnUndead).map(([target, score]) => ({ target, score }))
      : [];
    context.equipmentSlots = ensureActorEquipmentSlots(this.actor);
    const inventoryDiagnostics = getInventoryDiagnostics(this.actor);
    const diagnosticsPresentation = buildInventoryDiagnosticsPresentation(inventoryDiagnostics);
    context.inventoryGroups = this._buildInventoryGroups(diagnosticsPresentation.itemDiagnosticsById);
    context.inventoryDiagnostics = diagnosticsPresentation;
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
    html.find(".roll-turn-undead").click(this._onRollTurnUndead.bind(this));
    html.find(".becmi-weapon-attack").on("click", async (event) => {
      event.preventDefault();

      const itemId = event.currentTarget?.dataset?.itemId;
      if (!itemId) return;

      const item = this.actor.items.get(itemId);
      if (!item || item.type !== "weapon") return;

      const targetToken = game.user?.targets?.first?.();
      const targetActor = targetToken?.actor;
      if (!targetActor) {
        ui.notifications?.warn("Target a token before attacking.");
        return;
      }

      await game.becmi.combat.rollAttack({
        attacker: this.actor,
        target: targetActor,
        attackData: weaponItemToAttackData(item),
        rollDamageOnHit: true,
        postToChat: true
      });
    });

    html.find('[data-action="toggle-equip-item"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = event.currentTarget?.dataset?.itemId;
      if (!itemId) return;
      const item = this.actor.items.get(itemId);
      if (!item) return;

      if (item.system?.equipped) {
        await unequipItem(this.actor, item);
      } else {
        await equipItem(this.actor, item);
      }

      this.render(false);
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



  async _onRollTurnUndead(event) {
    event.preventDefault();
    const undeadType = event.currentTarget?.dataset?.undeadType || this.element.find('[data-action="turn-undead-target"]').val();
    if (!undeadType) return;
    await rollTurnUndead(this.actor, undeadType);
  }

  _sumGroupWeight(groups, keys = []) {
    const keySet = new Set(keys);
    return (groups ?? [])
      .filter((group) => keySet.has(group.key))
      .reduce((sum, group) => sum + (Number(group.containedWeight) || 0), 0);
  }

  _buildEncumbranceSummary() {
    try {
      const result = calculateTotalEncumbrance(this.actor) ?? {};
      const total = Number.isFinite(Number(result.totalCarriedWeight)) ? Number(result.totalCarriedWeight) : 0;
      const bracket = result.movementTier?.id ?? "0-400";
      const normalSpeed = Number.isFinite(Number(result.movementTier?.normalFeetPerTurn)) ? Number(result.movementTier.normalFeetPerTurn) : 0;
      const encounterSpeed = Number.isFinite(Number(result.movementTier?.encounterFeetPerRound)) ? Number(result.movementTier.encounterFeetPerRound) : 0;
      const milesPerDay = normalSpeed > 0 ? normalSpeed / 5 : 0;

      const inventoryGroups = this._buildInventoryGroups();
      const withoutBackpack = this._sumGroupWeight(inventoryGroups, ["beltPouch", "worn", "sack1", "sack2"]);
      const withoutSacks = this._sumGroupWeight(inventoryGroups, ["beltPouch", "worn", "backpack"]);
      const beltPouchAndWorn = this._sumGroupWeight(inventoryGroups, ["beltPouch", "worn"]);

      return {
        total,
        bracket,
        normalSpeed,
        encounterSpeed,
        milesPerDay,
        withoutBackpack,
        withoutSacks,
        beltPouchAndWorn
      };
    } catch (error) {
      console.warn("BECMI encumbrance summary failed", error);
      return {
        total: 0,
        bracket: "0-400",
        normalSpeed: 0,
        encounterSpeed: 0,
        milesPerDay: 0,
        withoutBackpack: 0,
        withoutSacks: 0,
        beltPouchAndWorn: 0
      };
    }
  }

  _buildCurrencySummary() {
    const denominations = ["pp", "gp", "ep", "sp", "cp"];
    const values = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 5 };
    const carried = this.actor?.system?.currency?.carried ?? {};
    const treasureHorde = this.actor?.system?.currency?.treasureHorde ?? {};
    const coinsPerCn = Number(BECMI_ENCUMBRANCE_RULES?.currency?.coinsPerCn ?? 10);
    const divisor = Number.isFinite(coinsPerCn) && coinsPerCn > 0 ? coinsPerCn : 10;
    const rows = denominations.map((denomination) => ({
      denomination,
      carriedQuantity: 0,
      treasureHordeQuantity: 0,
      carriedValueGp: 0,
      carriedWeightCn: 0
    }));

    try {
      for (const row of rows) {
        const carriedQuantity = Math.max(0, Math.floor(Number(carried?.[row.denomination] ?? 0) || 0));
        const hordeQuantity = Math.max(0, Math.floor(Number(treasureHorde?.[row.denomination] ?? 0) || 0));
        row.carriedQuantity = carriedQuantity;
        row.treasureHordeQuantity = hordeQuantity;
        row.carriedValueGp = carriedQuantity * (values[row.denomination] ?? 0);
        row.carriedWeightCn = carriedQuantity / divisor;
      }

      const totalValueGp = rows.reduce((sum, row) => sum + row.carriedValueGp, 0);
      const totalWeightCn = rows.reduce((sum, row) => sum + row.carriedWeightCn, 0);
      return {
        rows,
        totalValueGp,
        totalWeightCn
      };
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
      validateItemContainerAssignment(this.actor, item, { containerId: value });
    }

    if (field === "system.inventory.location" || field === "system.location") {
      const isTreasure = item.type === "treasure";
      value = normalizeItemLocation(value);
      if (isTreasure && value === "stored") value = "treasureHorde";

      validateItemContainerAssignment(this.actor, item, { location: value });
      if (item.system?.equipped) {
        await unequipItem(this.actor, item);
      }
      const worn = value === "worn";
      await item.update({ "system.inventory.location": value, "system.location": value, "system.equipped": false, "system.worn": worn });
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

  _buildTreasureGroup() {
    const items = getActorItems(this.actor).filter((item) => item?.type === "treasure");
    const mapped = items.map((item) => this._mapInventoryItem(item));
    const containedWeight = mapped
      .filter((item) => item.location !== "storage")
      .reduce((sum, item) => sum + (Number(item.totalWeight) || 0), 0);

    return {
      key: "treasure",
      label: "Treasure",
      sectionLocation: "treasure",
      items: mapped,
      itemCount: mapped.length,
      containedWeight,
      sectionSummary: `Treasure — ${mapped.length} items — ${containedWeight} cn carried`
    };
  }

  _mapInventoryItem(item, itemDiagnosticsById = {}) {
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

    const diagnostics = Array.isArray(itemDiagnosticsById?.[item?.id]) ? itemDiagnosticsById[item.id] : [];
    return {
      id: item.id,
      name: item.name,
      quantity,
      weight,
      totalWeight,
      value,
      estimatedValue: Number(item?.system?.estimatedValue ?? 0),
      treasureType: String(item?.system?.treasureType ?? ""),
      denomination: String(item?.system?.denomination ?? ""),
      containerId: String(item?.system?.containerId ?? ""),
      location: getItemLocation(item),
      identified: Boolean(item?.system?.identified),
      equipped: Boolean(item?.system?.equipped),
      slot: String(item?.system?.slot ?? ""),
      notes: String(item?.system?.notes ?? ""),
      type: item?.type ?? "",
      diagnostics,
      hasDiagnostics: diagnostics.length > 0,
      diagnosticBadge: diagnostics.length > 0 ? diagnostics[0].severity : ""
    };
  }

  _buildInventoryGroups(itemDiagnosticsById = {}) {
    const items = getActorItems(this.actor).filter((item) => item?.type !== "currency" && item?.type !== "treasure");
    const groupDefinitions = [
      { key: "beltPouch", label: "Items in Belt Pouch" },
      { key: "worn", label: "Items Worn" },
      { key: "backpack", label: "Items in Backpack" },
      { key: "sack1", label: "Items in Sack #1" },
      { key: "sack2", label: "Items in Sack #2" },
      { key: "carried", label: "Carried (Loose/Other)" },
      { key: "storage", label: "Stored / Treasure Hoard Containers" }
    ];

    const groups = groupDefinitions.map((group) => ({
      ...group,
      sectionLocation: group.key,
      items: items
        .filter((item) => {
          const loc = getItemLocation(item);
          if (group.key === "sack1" || group.key === "sack2") return loc === "sack";
          return loc === group.key;
        })
        .map((item) => this._mapInventoryItem(item, itemDiagnosticsById))
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

    const dropLocation = sourceItem.type === "currency" ? "worn" : this._getDropLocation(event);
    if (dropLocation === "treasure" && sourceItem.type !== "treasure") {
      console.warn("Rejected non-treasure item dropped into treasure section", { itemType: sourceItem.type });
      return false;
    }
    await importItemToActor(this.actor, sourceItem, { location: dropLocation });
    this.render(false);
    return true;
  }

  _getDropLocation(event) {
    if (!(event?.target instanceof Element)) return "worn";
    const sectionElement = event.target.closest("[data-location]");
    if (!sectionElement) return "treasure";
    return normalizeItemLocation(sectionElement?.dataset?.location ?? "worn");
  }






  async _onRollSave(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const saveKey = button.dataset.saveType;
    console.log("BECMI saves data", this.actor?.system?.saves);
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

  async _addKnownSpellFromItem(sourceItem, casterKey = "magicUser", level = null) {
    const spellKey = sourceItem?.system?.spellKey;
    if (!spellKey) return false;
    const spellLevel = String(level ?? sourceItem?.system?.level ?? 1);
    const system = foundry.utils.deepClone(this.actor.system ?? {});
    const caster = system?.spellcasting?.casters?.[casterKey];
    if (!caster?.known?.[spellLevel]) return false;
    const ref = { spellKey, uuid: sourceItem.uuid ?? "", itemId: sourceItem.id ?? "" };
    if (caster.known[spellLevel].some((entry) => entry.spellKey === spellKey)) return false;
    caster.known[spellLevel].push(ref);
    caster.known[spellLevel].sort((a, b) => String(a.spellKey).localeCompare(String(b.spellKey)));
    await this.actor.update({ "system.spellcasting": system.spellcasting });
    return true;
  }

  async _addPreparedSpellRef(casterKey, level, ref) {
    const system = foundry.utils.deepClone(this.actor.system ?? {});
    const entries = system?.spellcasting?.casters?.[casterKey]?.prepared?.[level];
    if (!Array.isArray(entries) || !ref?.spellKey) return false;
    if (entries.some((entry) => entry.spellKey === ref.spellKey)) return false;
    entries.push({ spellKey: ref.spellKey, uuid: ref.uuid ?? "", itemId: ref.itemId ?? "" });
    entries.sort((a, b) => String(a.spellKey).localeCompare(String(b.spellKey)));
    await this.actor.update({ "system.spellcasting": system.spellcasting });
    return true;
  }

}
