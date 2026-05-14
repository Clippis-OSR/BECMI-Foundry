import { BECMIActor } from "./module/actors/becmi-actor.mjs";
import { assertCanonicalActorType } from "./module/actors/actor-types.mjs";
import { BECMICharacterSheet } from "./module/actors/character-sheet.mjs";
import { BECMICreatureSheet } from "./module/actors/creature-sheet.mjs";
import { BECMIItemSheet } from "./module/items/item-sheet.mjs";
import { BECMISpellItemSheet } from "./module/items/spell-sheet.mjs";
import {
  loadCharacterTHAC0,
  loadClassData,
  loadMonsterProgression,
  loadMonsterSaves,
  loadMonsterTHAC0
} from "./module/utils/rules-data.mjs";
import * as becmiRules from "./module/rules/index.mjs";
import * as inventoryManager from "./module/items/inventory-manager.mjs";
import * as encumbrance from "./module/items/encumbrance.mjs";
import * as combatEngine from "./module/combat/combat-engine.mjs";
import { applyDamageFromMessage } from "./module/combat/damage-application.mjs";
import {
  validateClassTable,
  validateMonsterProgression
} from "./module/utils/validate-rules-data.mjs";
import { validateActorSchema, validateItemSchema, validateItemSlot } from "./module/utils/schema-validation.mjs";

const BECMI_CREATURE_SHEET_ID = "becmi-foundry.BECMICreatureSheet";
const BECMI_CHARACTER_SHEET_ID = "becmi-foundry.BECMICharacterSheet";

const BECMI_CREATURE_DEFAULTS = {
  creatureRole: "creature",
  hd: "1",
  hp: {
    value: 1,
    max: 1
  },
  ac: 9,
  thac0: 19,
  morale: 7,
  savesAs: {
    class: "fighter",
    level: 1
  },
  attacks: [],
  specialNotes: ""
};

const CANONICAL_SAVE_LABELS = {
  deathRayPoison: "Death Ray / Poison",
  magicWands: "Magic Wands",
  paralysisTurnStone: "Paralysis / Turn to Stone",
  dragonBreath: "Dragon Breath",
  rodStaffSpell: "Rod / Staff / Spell"
};


const LEGACY_ACTOR_TYPE_MAP = Object.freeze({ monster: "creature", npc: "creature" });

async function migrateLegacyActorTypes() {
  if (!game.user?.isGM) return;
  const alreadyMigrated = game.settings.get("becmi-foundry", "actorTypeMigrationVersion");
  if (alreadyMigrated === "1") return;

  const worldActors = Array.from(game.actors ?? []);
  for (const actor of worldActors) {
    const legacyTarget = LEGACY_ACTOR_TYPE_MAP[String(actor.type ?? "").toLowerCase()];
    if (!legacyTarget) continue;
    throw new Error(`[BECMI Migration] Actor "${actor.name}" uses legacy type "${actor.type}". Recreate it as type "${legacyTarget}" before continuing.`);
  }

  await game.settings.set("becmi-foundry", "actorTypeMigrationVersion", "1");
}


function canonicalizeLegacyItemSlot(slot) {
  const normalized = String(slot ?? "").trim();
  if (!normalized) return normalized;
  if (normalized === "weapon" || normalized === "bothHands") {
    console.info(`[BECMI Migration] Converting legacy item slot "${normalized}" -> "weaponMain".`);
    return "weaponMain";
  }
  return normalized;
}

async function migrateLegacyEquipmentSlots() {
  if (!game.user?.isGM) return;
  const actors = game.actors?.contents ?? [];
  for (const actor of actors) {
    const updates = {};
    const eq = actor.system?.equipmentSlots ?? {};
    if (eq.ringLeft || eq.ringRight) {
      updates["system.equipmentSlots.ring"] = eq.ringLeft ?? eq.ringRight ?? null;
      updates["system.equipmentSlots.-=ringLeft"] = null;
      updates["system.equipmentSlots.-=ringRight"] = null;
    }

    for (const item of actor.items ?? []) {
      const slot = canonicalizeLegacyItemSlot(item.system?.slot);
      if (slot !== item.system?.slot) {
        validateItemSlot(slot, `legacy migration for item "${item.name}"`);
        await item.update({ "system.slot": slot });
      }
    }

    if (Object.keys(updates).length > 0) await actor.update(updates);
  }
}


function inferInventoryLocation(item) {
  const invLocation = item?.system?.inventory?.location;
  if (invLocation) return invLocation;
  if (item?.type === "treasure") return "treasureHorde";
  if (item?.type === "currency") return "beltPouch";
  if (item?.system?.equipped === true) return "worn";
  return "backpack";
}

function buildInventoryForMigration(item) {
  const system = item?.system ?? {};
  return {
    location: inferInventoryLocation(item),
    containerId: String(system?.inventory?.containerId ?? system?.containerId ?? ""),
    quantity: Number(system?.inventory?.quantity ?? system?.quantity ?? 1) || 1,
    encumbrance: Number(system?.inventory?.encumbrance ?? system?.weight ?? 0) || 0,
    countsTowardEncumbrance: Boolean(system?.inventory?.countsTowardEncumbrance ?? true),
    isContainer: Boolean(system?.inventory?.isContainer ?? item?.type === "container"),
    containerCapacity: Number(system?.inventory?.containerCapacity ?? system?.capacity ?? 0) || 0,
    notes: String(system?.inventory?.notes ?? system?.notes ?? "")
  };
}

async function migrateCanonicalInventoryModel() {
  if (!game.user?.isGM) return;
  const alreadyMigrated = game.settings.get("becmi-foundry", "inventoryModelMigrationVersion");
  if (alreadyMigrated === "1") return;

  const actors = game.actors?.contents ?? [];
  for (const actor of actors) {
    for (const item of actor.items ?? []) {
      const inventory = buildInventoryForMigration(item);
      await item.update({ "system.inventory": inventory });
    }
  }

  await game.settings.set("becmi-foundry", "inventoryModelMigrationVersion", "1");
}

function canonicalizeActorSavesForMigration(saves) {
  if (!saves || typeof saves !== "object") return null;

  const mapped = {
    deathRayPoison: saves.deathRayPoison?.value ?? saves.deathRayPoison ?? saves.death,
    magicWands: saves.magicWands?.value ?? saves.magicWands ?? saves.wands,
    paralysisTurnStone: saves.paralysisTurnStone?.value ?? saves.paralysisTurnStone ?? saves.paralysis,
    dragonBreath: saves.dragonBreath?.value ?? saves.dragonBreath ?? saves.breath,
    rodStaffSpell: saves.rodStaffSpell?.value ?? saves.rodStaffSpell ?? saves.spells
  };

  const hasAnyValue = Object.values(mapped).some((value) => value !== undefined && value !== null && value !== "");
  if (!hasAnyValue) return null;

  return Object.fromEntries(
    Object.entries(mapped).map(([key, value]) => {
      const numeric = Number(value);
      return [key, { value: Number.isFinite(numeric) ? numeric : null, label: CANONICAL_SAVE_LABELS[key] }];
    })
  );
}

Hooks.once("init", async function () {
  console.log("BECMI Foundry | Init");
  game.becmi = game.becmi || {};
  game.becmi.combat = combatEngine;
  console.log("BECMI Foundry | Combat engine registered at game.becmi.combat");

  CONFIG.BECMI = CONFIG.BECMI || {};
  CONFIG.BECMI.classTables = {};
  CONFIG.BECMI.monsterProgression = {};
  CONFIG.BECMI.characterThac0 = {};
  CONFIG.BECMI.monsterThac0 = {};
  CONFIG.BECMI.monsterSaves = {};

  CONFIG.Actor = CONFIG.Actor || {};
  CONFIG.Actor.documentClass = BECMIActor;

  game.settings.register("becmi-foundry", "debugDerivedData", {
    name: "Debug Derived Data",
    hint: "Log BECMI actor derived data preparation to the console.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("becmi-foundry", "actorTypeMigrationVersion", { name: "Actor Type Migration Version", scope: "world", config: false, type: String, default: "0" });
  game.settings.register("becmi-foundry", "inventoryModelMigrationVersion", { name: "Inventory Model Migration Version", scope: "world", config: false, type: String, default: "0" });

  Actors.unregisterSheet("core", ActorSheet);

  Actors.registerSheet("becmi-foundry", BECMICharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "BECMI Character Sheet"
  });

  Actors.registerSheet("becmi-foundry", BECMICreatureSheet, {
    types: ["creature"],
    makeDefault: true,
    label: "BECMI Creature Sheet"
  });

  Items.registerSheet("becmi-foundry", BECMIItemSheet, {
    // First-pass BECMI inventory architecture: a single sheet handles all non-spell item types
    // while data relationships are modeled via system.containerId only.
    types: ["equipment", "weapon", "armor", "container", "currency", "treasure", "consumable"],
    makeDefault: true,
    label: "BECMI Item Sheet"
  });

  Items.registerSheet("becmi-foundry", BECMISpellItemSheet, {
    types: ["spell"],
    makeDefault: true,
    label: "BECMI Spell Item Sheet"
  });

  const classTables = await loadClassData();
  const monsterProgression = await loadMonsterProgression();
  const characterThac0 = await loadCharacterTHAC0();
  const monsterThac0 = await loadMonsterTHAC0();
  const monsterSaves = await loadMonsterSaves();

  CONFIG.BECMI.classTables = classTables ?? {};
  CONFIG.BECMI.monsterProgression = monsterProgression ?? {};
  CONFIG.BECMI.characterThac0 = characterThac0 ?? {};
  CONFIG.BECMI.monsterThac0 = monsterThac0 ?? {};
  CONFIG.BECMI.monsterSaves = monsterSaves ?? {};

  for (const [classId, classData] of Object.entries(CONFIG.BECMI.classTables)) {
    const warnings = validateClassTable(classData);
    for (const warning of warnings) {
      console.warn(`BECMI rules-data validation warning [class:${classId}] ${warning}`);
    }
  }

  const monsterWarnings = validateMonsterProgression(CONFIG.BECMI.monsterProgression);
  for (const warning of monsterWarnings) {
    console.warn(`BECMI rules-data validation warning [monster-progression] ${warning}`);
  }

  console.log("BECMI Foundry | Rules data loaded into CONFIG.BECMI", {
    classTables: Object.keys(CONFIG.BECMI.classTables),
    hasMonsterProgression: Object.keys(CONFIG.BECMI.monsterProgression?.hitDice ?? {}).length > 0,
    hasCharacterThac0: Object.keys(CONFIG.BECMI.characterThac0?.entries ?? {}).length > 0,
    hasMonsterThac0: Object.keys(CONFIG.BECMI.monsterThac0?.hitDice ?? {}).length > 0,
    hasMonsterSaves: Object.keys(CONFIG.BECMI.monsterSaves ?? {}).length > 0
  });

  console.log("BECMI Foundry | Character THAC0 table loaded", {
    id: CONFIG.BECMI.characterThac0?.id,
    hasEntries: Object.keys(CONFIG.BECMI.characterThac0?.entries ?? {}).length > 0
  });

  console.log("BECMI Foundry | Monster THAC0 table loaded", {
    id: CONFIG.BECMI.monsterThac0?.id,
    hasHitDice: Object.keys(CONFIG.BECMI.monsterThac0?.hitDice ?? {}).length > 0
  });

  console.log("BECMI Foundry | Monster saves table loaded", {
    id: CONFIG.BECMI.monsterSaves?.id,
    hasEntries: Object.keys(CONFIG.BECMI.monsterSaves?.entries ?? {}).length > 0
  });

  console.warn("BECMI init complete");
  console.warn("BECMI Actor templates", game.system.template?.Actor);
  console.warn("BECMI sheet classes", CONFIG.Actor.sheetClasses);
});

Hooks.on("preCreateActor", (actor) => {
  const legacyType = LEGACY_ACTOR_TYPE_MAP[String(actor.type ?? "").toLowerCase()];
  if (legacyType) {
    throw new Error(`[BECMI] Legacy actor type "${actor.type}" is no longer supported. Create actors as type "${legacyType}".`);
  }
  assertCanonicalActorType(actor.type, `preCreateActor for actor "${actor.name ?? "Unknown"}"`);
  validateActorSchema(actor.toObject(), `preCreateActor for actor "${actor.name ?? "Unknown"}"`);

  if (actor.type === "creature") {
    const existing = actor.system ?? {};
    const system = foundry.utils.mergeObject(
      foundry.utils.deepClone(BECMI_CREATURE_DEFAULTS),
      existing
    );

    actor.updateSource({
      system,
      flags: {
        core: {
          sheetClass: BECMI_CREATURE_SHEET_ID
        }
      }
    });
  }

  if (actor.type === "character") {
    actor.updateSource({
      flags: {
        core: {
          sheetClass: BECMI_CHARACTER_SHEET_ID
        }
      }
    });
  }
});

Hooks.on("preUpdateActor", (actor, changes) => {
  const merged = foundry.utils.mergeObject(actor.toObject(), changes, { inplace: false });
  validateActorSchema(merged, `preUpdateActor for actor "${actor.name ?? actor.id ?? "Unknown"}"`);
});

Hooks.on("preCreateItem", (item) => {
  validateItemSchema(item.toObject(), `preCreateItem for item "${item.name ?? "Unknown"}"`);
});

Hooks.on("preUpdateItem", (item, changes) => {
  const merged = foundry.utils.mergeObject(item.toObject(), changes, { inplace: false });
  validateItemSchema(merged, `preUpdateItem for item "${item.name ?? item.id ?? "Unknown"}"`);
});


async function maybePromptInitiativeMode(combat) {
  if (!game.user?.isGM) return;
  if (!combat) return;

  const existingMode = combat.getFlag("becmi-foundry", "initiativeMode");
  if (existingMode === "group" || existingMode === "individual") return;

  try {
    await game.becmi?.combat?.chooseInitiativeMode?.(combat);
  } catch (error) {
    console.warn("BECMI Foundry | Failed to prompt initiative mode.", { error, combatId: combat?.id });
  }
}

Hooks.on("createCombat", async (combat) => {
  await maybePromptInitiativeMode(combat);
});

Hooks.on("combatStart", async (combat) => {
  await maybePromptInitiativeMode(combat);
});

Hooks.on("renderChatMessage", (message, html) => {
  const root = html?.[0];
  if (!root) return;

  const button = root.querySelector(".becmi-apply-damage");
  if (!button) return;

  const alreadyApplied = message.getFlag("becmi-foundry", "damageApplied") === true;
  if (alreadyApplied) {
    button.disabled = true;
    button.style.display = "none";
    return;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await applyDamageFromMessage(message);
      button.style.display = "none";
    } catch (error) {
      console.warn("BECMI Foundry | Failed to apply damage from chat card.", { error, messageId: message?.id });
      ui.notifications.error("Failed to apply damage.");
      button.disabled = false;
    }
  });
});



function getCombatTrackerRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  return null;
}

function findCombatTrackerInsertionTarget(root) {
  if (!root) return null;

  const selectors = [
    ".combat-tracker",
    ".directory-list",
    ".window-content"
  ];

  for (const selector of selectors) {
    const target = root.querySelector(selector);
    if (target) return target;
  }

  return null;
}

async function runBECMICombatTrackerAction(action) {
  try {
    if (action === "group-initiative") {
      await game.becmi.combat.rollGroupInitiative({
        combat: game.combat,
        postToChat: true
      });
      return;
    }

    if (action === "individual-initiative") {
      await game.becmi.combat.rollIndividualInitiative({
        combat: game.combat,
        postToChat: true
      });
      return;
    }

    if (action === "morale") {
      await game.becmi.combat.rollMoraleForSelectedCreatures({
        reason: "Manual morale check",
        postToChat: true
      });
    }
  } catch (error) {
    console.error("BECMI | Combat tracker action failed", error);
    ui.notifications.error(error.message ?? "BECMI combat tracker action failed.");
  }
}

function injectBECMICombatTrackerControls(app, html) {
  console.log("BECMI | Combat Tracker hook fired");
  if (!game.user?.isGM) return;
  if (!game.becmi?.combat) return;

  const root = getCombatTrackerRoot(html);
  if (!root) return;

  const existing = html?.jquery
    ? html.find(".becmi-combat-tracker-controls").length > 0
    : root.querySelector(".becmi-combat-tracker-controls");
  if (existing) return;

  const anchor = findCombatTrackerInsertionTarget(root) ?? root;
  if (!anchor) return;

  console.log("BECMI | Injecting combat tracker controls");
  const controls = document.createElement("div");
  controls.className = "becmi-combat-tracker-controls";
  controls.innerHTML = `
    <button type="button" class="becmi-tracker-button" data-becmi-action="group-initiative">
      <i class="fas fa-users"></i> Group Init
    </button>
    <button type="button" class="becmi-tracker-button" data-becmi-action="individual-initiative">
      <i class="fas fa-dice-d20"></i> Individual Init
    </button>
    <button type="button" class="becmi-tracker-button" data-becmi-action="morale">
      <i class="fas fa-skull"></i> Morale
    </button>
  `;

  controls.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-becmi-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    await runBECMICombatTrackerAction(button.dataset.becmiAction);
  });

  anchor.prepend(controls);
}

function isCombatTrackerApplication(app, html) {
  const constructorName = app?.constructor?.name;
  const appId = app?.id;
  const optionsId = app?.options?.id;
  const tabName = app?.tabName;
  const category = app?.category;

  if (constructorName === "CombatTracker") return true;
  if (appId === "combat" || optionsId === "combat") return true;
  if (tabName === "combat" || category === "combat") return true;

  const root = getCombatTrackerRoot(html);
  if (!root) return false;
  return Boolean(root.querySelector(".combat-tracker") || root.classList?.contains("combat"));
}

function handleCombatTrackerRender(hookName, app, html) {
  console.log(`BECMI | ${hookName} fired`, app);
  if (!isCombatTrackerApplication(app, html)) return;
  injectBECMICombatTrackerControls(app, html);
}

Hooks.once("ready", async function () {
  console.log("BECMI | Registering combat tracker hooks");
  Hooks.on("renderCombatTracker", (app, html) => {
    handleCombatTrackerRender("renderCombatTracker", app, html);
  });

  Hooks.on("renderCombatTrackerConfig", (app, html) => {
    handleCombatTrackerRender("renderCombatTrackerConfig", app, html);
  });

  Hooks.on("renderSidebarTab", (app, html) => {
    handleCombatTrackerRender("renderSidebarTab", app, html);
  });

  Hooks.on("renderApplication", (app, html) => {
    handleCombatTrackerRender("renderApplication", app, html);
  });
  game.becmi = game.becmi || {};
  game.becmi.rules = becmiRules;
  game.becmi.inventory = inventoryManager;
  game.becmi.encumbrance = encumbrance;

  await migrateLegacyActorTypes();
  await migrateLegacyEquipmentSlots();
  await migrateCanonicalInventoryModel();

  const actors = game.actors?.contents ?? [];
  for (const actor of actors) {
    const legacySaves = actor.system?.saves;
    const canonicalSaves = canonicalizeActorSavesForMigration(legacySaves);
    if (!canonicalSaves) continue;

    console.info(`[BECMI Migration] Canonicalizing save keys for actor "${actor.name}".`);
    await actor.update({
      "system.saves": {
        ...canonicalSaves,
        death: foundry.data.operators.ForcedDeletion,
        wands: foundry.data.operators.ForcedDeletion,
        paralysis: foundry.data.operators.ForcedDeletion,
        breath: foundry.data.operators.ForcedDeletion,
        spells: foundry.data.operators.ForcedDeletion
      }
    });
  }
});
