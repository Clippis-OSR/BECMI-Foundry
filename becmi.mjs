import { BECMIActor } from "./module/actors/becmi-actor.mjs";
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
import {
  validateClassTable,
  validateMonsterProgression
} from "./module/utils/validate-rules-data.mjs";

const BECMI_CREATURE_SHEET_ID = "becmi-foundry.BECMICreatureSheet";
const BECMI_CHARACTER_SHEET_ID = "becmi-foundry.BECMICharacterSheet";

const BECMI_CREATURE_DEFAULTS = {
  creatureRole: "monster",
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

Hooks.once("ready", async function () {
  game.becmi = game.becmi || {};
  game.becmi.rules = becmiRules;
  game.becmi.inventory = inventoryManager;
  game.becmi.encumbrance = encumbrance;

  const actors = game.actors?.contents ?? [];
  for (const actor of actors) {
    const legacySaves = actor.system?.saves;
    const canonicalSaves = canonicalizeActorSavesForMigration(legacySaves);
    if (!canonicalSaves) continue;

    await actor.update({
      "system.saves": canonicalSaves,
      "system.saves.-=death": null,
      "system.saves.-=wands": null,
      "system.saves.-=paralysis": null,
      "system.saves.-=breath": null,
      "system.saves.-=spells": null
    });
  }
});
