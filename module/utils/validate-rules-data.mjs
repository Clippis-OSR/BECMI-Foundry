export function validateClassTable(classData) {
  const warnings = [];

  if (!classData || typeof classData !== "object") {
    warnings.push("Class data is missing or not an object.");
    return warnings;
  }

  if (!classData.id) warnings.push("Class data is missing required field: id.");
  if (!classData.name) warnings.push(`Class '${classData.id ?? "unknown"}' is missing required field: name.`);
  if (!classData.levels || typeof classData.levels !== "object") {
    warnings.push(`Class '${classData.id ?? "unknown"}' is missing required field: levels.`);
    return warnings;
  }

  for (const [levelKey, levelData] of Object.entries(classData.levels)) {
    if (!levelData || typeof levelData !== "object") {
      warnings.push(`Class '${classData.id ?? "unknown"}' level '${levelKey}' is missing level data object.`);
      continue;
    }

    if (!("xp" in levelData)) warnings.push(`Class '${classData.id ?? "unknown"}' level '${levelKey}' is missing field: xp.`);
    if (!("thac0" in levelData)) warnings.push(`Class '${classData.id ?? "unknown"}' level '${levelKey}' is missing field: thac0.`);
    if (!("saves" in levelData)) warnings.push(`Class '${classData.id ?? "unknown"}' level '${levelKey}' is missing field: saves.`);
  }

  return warnings;
}

export function validateMonsterProgression(monsterData) {
  const warnings = [];

  if (!monsterData || typeof monsterData !== "object") {
    warnings.push("Monster progression data is missing or not an object.");
    return warnings;
  }

  if (!monsterData.id) warnings.push("Monster progression is missing required field: id.");
  if (!monsterData.name) warnings.push("Monster progression is missing required field: name.");

  if (!monsterData.hitDice || typeof monsterData.hitDice !== "object") {
    warnings.push("Monster progression is missing required field: hitDice.");
    return warnings;
  }

  for (const [hdKey, hdData] of Object.entries(monsterData.hitDice)) {
    if (!hdData || typeof hdData !== "object") {
      warnings.push(`Monster progression HD '${hdKey}' is missing entry data object.`);
      continue;
    }

    if (!("thac0" in hdData)) warnings.push(`Monster progression HD '${hdKey}' is missing field: thac0.`);
    if (!("savesAs" in hdData)) warnings.push(`Monster progression HD '${hdKey}' is missing field: savesAs.`);
  }

  return warnings;
}
