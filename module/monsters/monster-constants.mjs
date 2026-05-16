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
  "attacks",
  "damage",
  "numberAppearing",
  "saveAs",
  "morale",
  "treasureType",
  "alignment",
  "xp"
]);

export const OPTIONAL_MONSTER_FIELDS = Object.freeze([
  "lairChance",
  "notes",
  "specialAbilities",
  "movementModes",
  "damageParts",
  "treasure",
  "description"
]);
