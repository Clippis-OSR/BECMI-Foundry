const SPELL_KEY_PATTERN = /^[a-z]+(?:_[a-z]+)*$/;
const CANONICAL_KEYS = ["spellKey", "uuid", "itemId"];
const LEGACY_ALIAS_KEYS = ["spellID", "spellName", "spellUuid", "spell_id"];

export function validateSpellReference(ref) {
  const errors = [];
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
    return { valid: false, errors: ["malformed reference"] };
  }

  for (const key of Object.keys(ref)) {
    if (!CANONICAL_KEYS.includes(key)) errors.push(`unexpected field: ${key}`);
  }
  for (const key of LEGACY_ALIAS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(ref, key)) errors.push(`legacy alias not supported: ${key}`);
  }

  if (typeof ref.spellKey !== "string" || !ref.spellKey || !SPELL_KEY_PATTERN.test(ref.spellKey)) {
    errors.push("spellKey must be lowercase snake_case");
  }
  if (typeof ref.uuid !== "string") errors.push("uuid must be a string");
  if (typeof ref.itemId !== "string") errors.push("itemId must be a string");

  return { valid: errors.length === 0, errors };
}
