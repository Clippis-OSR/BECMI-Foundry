import { BECMICharacterSheet } from "./module/actors/character-sheet.mjs";
import { BECMICreatureSheet } from "./module/actors/creature-sheet.mjs";
import { loadClassData, loadMonsterProgression } from "./module/utils/rules-data.mjs";
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
  saveAs: {
    class: "fighter",
    level: 1
  },
  attacks: [],
  specialNotes: ""
};

Hooks.once("init", async function () {
  console.log("BECMI Foundry | Init");

  CONFIG.BECMI = CONFIG.BECMI || {};
  CONFIG.BECMI.classTables = {};
  CONFIG.BECMI.monsterProgression = {};

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

  const classTables = await loadClassData();
  const monsterProgression = await loadMonsterProgression();

  CONFIG.BECMI.classTables = classTables ?? {};
  CONFIG.BECMI.monsterProgression = monsterProgression ?? {};

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
    hasMonsterProgression:
      Object.keys(CONFIG.BECMI.monsterProgression?.hitDice ?? {}).length > 0
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
