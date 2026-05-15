export const MONSTER_SCHEMA_VERSION = 1;

export const MONSTER_KEY_PATTERN = /^[a-z]+(?:_[a-z]+)*$/;

export const LEGACY_MONSTER_ALIAS_FIELDS = Object.freeze([
  "id",
  "sourceBook",
  "sourcePage",
  "armorClass",
  "move",
  "attack",
  "special",
  "notesText",
  "avgHP"
]);

export const REQUIRED_MONSTER_FIELDS = Object.freeze([
  "monsterKey",
  "schemaVersion",
  "name",
  "source",
  "ac",
  "hitDice",
  "movement",
  "movementModes",
  "attacks",
  "damage",
  "damageParts",
  "numberAppearing",
  "saveAs",
  "morale",
  "treasureType",
  "treasure",
  "alignment",
  "xp",
  "specialAbilities"
]);
