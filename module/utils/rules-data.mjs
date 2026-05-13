export const BECMI_RULES_DATA_PATHS = {
  classes: {
    fighter: "systems/becmi-foundry/data/classes/fighter.json",
    cleric: "systems/becmi-foundry/data/classes/cleric.json",
    magicUser: "systems/becmi-foundry/data/classes/magic-user.json",
    thief: "systems/becmi-foundry/data/classes/thief.json",
    dwarf: "systems/becmi-foundry/data/classes/dwarf.json",
    elf: "systems/becmi-foundry/data/classes/elf.json",
    halfling: "systems/becmi-foundry/data/classes/halfling.json"
  },
  monsters: {
    progression: "systems/becmi-foundry/data/monsters/monster-progression.json"
  },
  tables: {
    characterThac0: "systems/becmi-foundry/data/tables/character-thac0.json",
    monsterThac0: "systems/becmi-foundry/data/tables/monster-thac0.json",
    monsterSaves: "systems/becmi-foundry/data/tables/monster-saves.json"
  }
};

export async function loadJSON(path) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to load JSON from ${path}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("BECMI rules-data load error:", error);
    return null;
  }
}

export async function loadClassData() {
  const toCanonicalSaveProfile = (saves) => {
    if (!saves || typeof saves !== "object") return saves;
    return {
      deathRayPoison: saves.deathRayPoison ?? saves.death,
      magicWands: saves.magicWands ?? saves.wands,
      paralysisTurnStone: saves.paralysisTurnStone ?? saves.paralysis,
      dragonBreath: saves.dragonBreath ?? saves.breath,
      rodStaffSpell: saves.rodStaffSpell ?? saves.spells
    };
  };

  const normalizeClassSaves = (classData) => {
    if (!classData || typeof classData !== "object") return classData;
    const levels = classData.levels;
    if (!levels || typeof levels !== "object") return classData;

    const normalizedLevels = Object.fromEntries(
      Object.entries(levels).map(([levelKey, levelData]) => {
        if (!levelData || typeof levelData !== "object") return [levelKey, levelData];
        return [
          levelKey,
          {
            ...levelData,
            saves: toCanonicalSaveProfile(levelData.saves)
          }
        ];
      })
    );

    return { ...classData, levels: normalizedLevels };
  };

  const classEntries = Object.entries(BECMI_RULES_DATA_PATHS.classes);
  const results = await Promise.all(
    classEntries.map(async ([classId, path]) => [classId, normalizeClassSaves(await loadJSON(path))])
  );

  return Object.fromEntries(results);
}

export async function loadMonsterProgression() {
  return await loadJSON(BECMI_RULES_DATA_PATHS.monsters.progression);
}

export async function loadCharacterTHAC0() {
  return await loadJSON(BECMI_RULES_DATA_PATHS.tables.characterThac0);
}

export async function loadMonsterTHAC0() {
  return await loadJSON(BECMI_RULES_DATA_PATHS.tables.monsterThac0);
}

export async function loadMonsterSaves() {
  const data = await loadJSON(BECMI_RULES_DATA_PATHS.tables.monsterSaves);
  if (!data || typeof data !== "object") return data;

  const toCanonicalSaveProfile = (saves) => {
    if (!saves || typeof saves !== "object") return saves;
    return {
      deathRayPoison: saves.deathRayPoison ?? saves.death,
      magicWands: saves.magicWands ?? saves.wands,
      paralysisTurnStone: saves.paralysisTurnStone ?? saves.paralysis,
      dragonBreath: saves.dragonBreath ?? saves.breath,
      rodStaffSpell: saves.rodStaffSpell ?? saves.spells
    };
  };

  const entries = data.entries;
  if (!entries || typeof entries !== "object") return data;

  const normalizedEntries = Object.fromEntries(
    Object.entries(entries).map(([hd, entry]) => {
      if (!entry || typeof entry !== "object") return [hd, entry];
      if (entry.saves) return [hd, { ...entry, saves: toCanonicalSaveProfile(entry.saves) }];
      return [hd, toCanonicalSaveProfile(entry)];
    })
  );

  return { ...data, entries: normalizedEntries };
}
