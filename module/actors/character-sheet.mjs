import {
  rollAbilityCheck,
  rollCharacterAttack,
  rollInitiative,
  rollSavingThrow,
  rollThiefSkill
} from "../rolls/becmi-rolls.mjs";
import {
  getActorItems,
  getItemsInContainer,
  getItemTotalWeight,
  moveItemToContainer
} from "../items/inventory-manager.mjs";
import { ensureDefaultContainers } from "../items/default-containers.mjs";
import { calculateTotalEncumbrance } from "../items/encumbrance.mjs";

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
    context.encumbranceSummary = this._buildEncumbranceSummary();
    context.inventoryMoveTargets = this._buildInventoryMoveTargets();

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

    html.find('[data-action="create-default-containers"]').on("click", async (event) => {
      event.preventDefault();
      const result = await ensureDefaultContainers(this.actor);
      if (result.skipped) return;
      const count = Array.isArray(result.created) ? result.created.length : 0;
      if (count > 0) {
        ui.notifications?.info(`Created ${count} default container${count === 1 ? "" : "s"}.`);
      } else {
        ui.notifications?.info("Default containers already exist.");
      }
      this.render(false);
    });

    html.find('[data-action="move-item"]').on("click", async (event) => {
      event.preventDefault();
      const itemId = event.currentTarget.dataset.itemId;
      const row = event.currentTarget.closest("tr");
      const select = row?.querySelector('[data-field="move-target-container"]');
      const targetContainerId = select?.value ?? "";
      const item = this.actor.items.get(itemId);
      if (!item) return;
      if (!this._canMoveItemToContainer(item, targetContainerId)) return;
      await moveItemToContainer(item, targetContainerId);
      this.render(false);
    });
  }



  _buildInventoryMoveTargets() {
    const groups = this._buildInventoryGroups();
    const targets = [{ value: "", label: "None / Carried" }];

    for (const group of groups) {
      if (!group?.containerId) continue;
      targets.push({ value: group.containerId, label: group.label });
    }

    return targets;
  }

  _canMoveItemToContainer(item, targetContainerId) {
    const itemId = item?.id ?? "";
    const targetId = String(targetContainerId ?? "").trim();

    if (!targetId) return true;
    if (!itemId) return false;
    if (itemId === targetId) return false;

    // Prevent obvious circular containment when moving containers.
    if (item?.type === "container") {
      let cursor = this.actor.items.get(targetId);
      const visited = new Set();

      while (cursor && !visited.has(cursor.id)) {
        if (cursor.id === itemId) return false;
        visited.add(cursor.id);
        const parentId = String(cursor?.system?.containerId ?? "").trim();
        if (!parentId) break;
        cursor = this.actor.items.get(parentId);
      }
    }

    return true;
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
  _buildInventoryGroups() {
    const items = getActorItems(this.actor);
    const containers = items.filter((item) => item?.type === "container");
    const rootItems = items.filter((item) => !item?.system?.containerId);

    const findContainerId = ({ containerType, names = [] }) => {
      const byType = containers.find((container) => container?.system?.containerType === containerType);
      if (byType?.id) return byType.id;

      const normalizedNames = names.map((name) => String(name).toLowerCase());
      const byName = containers.find((container) => normalizedNames.includes(String(container?.name ?? "").toLowerCase()));
      return byName?.id ?? "";
    };

    const beltPouchId = findContainerId({ containerType: "belt-pouch", names: ["belt pouch"] });
    const backpackId = findContainerId({ containerType: "backpack", names: ["backpack"] });
    const sackIds = containers
      .filter((container) => container?.system?.containerType === "sack" || String(container?.name ?? "").toLowerCase().includes("sack"))
      .map((container) => container.id)
      .slice(0, 2);

    const equippedOrWorn = rootItems.filter((item) => Boolean(item?.system?.equipped) || Boolean(item?.system?.worn));

    const assignedContainerIds = new Set([beltPouchId, backpackId, ...sackIds].filter(Boolean));
    const otherCarried = rootItems.filter((item) => {
      if (item?.type === "container") return false;
      if (Boolean(item?.system?.equipped) || Boolean(item?.system?.worn)) return false;
      return !assignedContainerIds.has(item.id);
    });

    const groupDefinitions = [
      { key: "equipped", label: "Equipped / Worn", items: equippedOrWorn, containerId: "" },
      { key: "belt", label: "Belt Pouch", items: beltPouchId ? getItemsInContainer(this.actor, beltPouchId) : [], containerId: beltPouchId },
      { key: "backpack", label: "Backpack", items: backpackId ? getItemsInContainer(this.actor, backpackId) : [], containerId: backpackId },
      { key: "sack1", label: "Sack #1", items: sackIds[0] ? getItemsInContainer(this.actor, sackIds[0]) : [], containerId: sackIds[0] ?? "" },
      { key: "sack2", label: "Sack #2", items: sackIds[1] ? getItemsInContainer(this.actor, sackIds[1]) : [], containerId: sackIds[1] ?? "" },
      { key: "other", label: "Other Carried Items", items: otherCarried, containerId: "" }
    ];

    return groupDefinitions.map((group) => ({
      ...group,
      hasContainer: Boolean(group.containerId),
      items: (group.items ?? []).map((item) => {
        const quantity = Number(item?.system?.quantity ?? 1) || 1;
        const weight = Number(item?.system?.weight ?? 0) || 0;
        const totalWeight = getItemTotalWeight(item);
        const value = Number(item?.system?.value ?? 0) || 0;
        return {
          id: item.id,
          name: item.name,
          quantity,
          weight,
          totalWeight,
          value,
          containerId: String(item?.system?.containerId ?? ""),
          type: item?.type ?? "",
          canMoveToGroup: group.key !== "equipped"
        };
      })
    }));
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
