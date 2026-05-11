import { BECMICharacterSheet } from "./module/actors/character-sheet.mjs";
import { BECMICreatureSheet } from "./module/actors/creature-sheet.mjs";



const BECMI_CREATURE_SHEET_ID = "becmi-foundry.BECMICreatureSheet";
const BECMI_CHARACTER_SHEET_ID = "becmi-foundry.BECMICharacterSheet";

const BECMI_CREATURE_DEFAULTS = {
  creatureRole: "monster",
  hd: "1",
  thac0: 19,
  specialNotes: "",
  saveAs: {
    class: "fighter",
    level: 1
  },
  attacks: [],
  combat: {
    ac: 9,
    morale: 8
  },
  hp: {
    value: 1,
    max: 1,
    wounds: 0
  }
};

const BECMI_CHARACTER_DEFAULTS = {
  details: {
    class: "fighter",
    alignment: "",
    sex: "",
    age: "",
    level: 1,
    xp: 0,
    primeReqAdjustment: 0
  },
  abilities: {
    str: { value: 10, mod: 0 },
    int: { value: 10, mod: 0 },
    wis: { value: 10, mod: 0 },
    dex: { value: 10, mod: 0 },
    con: { value: 10, mod: 0 },
    cha: { value: 10, mod: 0 }
  },
  combat: {
  ac: 9,
  wrestlingRating: 0,
  thac0: 19,
  initiative: 1,
  attackModifier: 0,
  damageRoll: "1d6",
  damageModifier: 0
},
  hp: {
    value: 4,
    max: 4,
    wounds: 0
  },
  saves: {
  death: 12,
  wands: 13,
  paralysis: 14,
  breath: 15,
  spells: 16
},

languages: "",

specialAbilities: "",

weaponMastery: [
  { weapon: "", level: "", damage: "", range: "", defense: "", special: "" },
  { weapon: "", level: "", damage: "", range: "", defense: "", special: "" },
  { weapon: "", level: "", damage: "", range: "", defense: "", special: "" },
  { weapon: "", level: "", damage: "", range: "", defense: "", special: "" },
  { weapon: "", level: "", damage: "", range: "", defense: "", special: "" }
],

generalSkills: [
  { name: "", ability: "", score: 0, notes: "" },
  { name: "", ability: "", score: 0, notes: "" },
  { name: "", ability: "", score: 0, notes: "" },
  { name: "", ability: "", score: 0, notes: "" },
  { name: "", ability: "", score: 0, notes: "" },
  { name: "", ability: "", score: 0, notes: "" }
],

coinage: {
  carried: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
  hoard: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }
},

treasure: "",

encumbrance: {
  total: 0,
  withoutBackpack: 0,
  withoutSacks: 0,
  beltPouchAndWorn: 0,
  normalSpeed: 120,
  encounterSpeed: 40
},

containers: {
  beltPouch: { items: "", enc: 0 },
  worn: { items: "", enc: 0 },
  backpack: { items: "", enc: 0 },
  sack1: { items: "", enc: 0 },
  sack2: { items: "", enc: 0 }
},

spells: {
  magicUser: {
    known: {
      1: "", 2: "", 3: "", 4: "", 5: "", 6: ""
    },
    slots: {
      1: { max: 0, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 0, used: 0 },
      4: { max: 0, used: 0 },
      5: { max: 0, used: 0 },
      6: { max: 0, used: 0 }
    }
  },

  cleric: {
    slots: {
      1: { max: 0, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 0, used: 0 },
      4: { max: 0, used: 0 },
      5: { max: 0, used: 0 },
      6: { max: 0, used: 0 }
    }
  },

  elf: {
    known: {
      1: "", 2: "", 3: "", 4: "", 5: ""
    },
    slots: {
      1: { max: 0, used: 0 },
      2: { max: 0, used: 0 },
      3: { max: 0, used: 0 },
      4: { max: 0, used: 0 },
      5: { max: 0, used: 0 }
    }
  }
},

turnUndead: {
  skeleton: "",
  zombie: "",
  ghoul: "",
  wight: "",
  wraith: "",
  mummy: "",
  spectre: "",
  vampire: "",
  phantom: "",
  haunt: "",
  spirit: "",
  nightshade: ""
},

  thiefSkills: {
    openLocks: 0,
    findTraps: 0,
    removeTraps: 0,
    climbWalls: 0,
    moveSilently: 0,
    hideInShadows: 0,
    pickPockets: 0,
    hearNoise: 0
  }
};

Hooks.once("init", async function () {
  console.log("BECMI Foundry | Init");

  Actors.unregisterSheet("core", ActorSheet);

  console.warn("Registering BECMICharacterSheet for character");
  Actors.registerSheet("becmi-foundry", BECMICharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "BECMI Character Sheet"
  });

  console.warn("Registering BECMICreatureSheet for creature");
  Actors.registerSheet("becmi-foundry", BECMICreatureSheet, {
    types: ["creature"],
    makeDefault: true,
    label: "BECMI Creature Sheet"
  });

  console.warn("BECMI actor types:", game.system.template.Actor);
  console.warn("BECMI registered actor sheets:", CONFIG.Actor.sheetClasses);
  console.warn("Creature sheet registration:", CONFIG.Actor.sheetClasses?.creature);
});

Hooks.on("preCreateActor", (actor, data, options, userId) => {
  if (actor.type === "character") {
    const existing = actor.system ?? {};
    const system = foundry.utils.mergeObject(
      foundry.utils.deepClone(BECMI_CHARACTER_DEFAULTS),
      existing
    );

    actor.updateSource({ system });
    return;
  }

  if (actor.type === "creature") {
    const existing = actor.system ?? {};
    const system = foundry.utils.mergeObject(
      foundry.utils.deepClone(BECMI_CREATURE_DEFAULTS),
      existing
    );

    actor.updateSource({ system });
  }
});
