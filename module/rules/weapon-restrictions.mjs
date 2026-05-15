import { getActorClassId } from "./lookups.mjs";

const ALL = "*";

const CLASS_WEAPON_RULES = Object.freeze({
  fighter: ALL,
  dwarf: ALL,
  elf: ALL,
  halfling: ALL,
  thief: ALL,
  cleric: new Set(["club", "mace", "staff", "warHammer", "sling"]),
  "magic-user": new Set(["dagger", "silverDagger", "staff"])
});

function getWeaponKey(item) {
  const key = item?.system?.weaponId ?? item?.system?.weaponKey ?? item?.flags?.becmi?.weaponKey;
  if (typeof key === "string" && key.trim()) return key.trim();
  return item?.id ?? null;
}

export function canClassUseWeapon(actor, item) {
  if (!actor || actor?.type !== "character") return { allowed: true, reason: null };
  if (!item || item?.type !== "weapon") return { allowed: true, reason: null };
  if (item?.system?.weaponType === "natural" || item?.system?.slot === "natural") return { allowed: true, reason: null };

  const classId = getActorClassId(actor);
  const rule = classId ? CLASS_WEAPON_RULES[classId] : null;
  if (!rule || rule === ALL) return { allowed: true, reason: null };

  const weaponKey = getWeaponKey(item);
  const allowed = Boolean(weaponKey && rule.has(weaponKey));
  if (allowed) return { allowed: true, reason: null };

  return {
    allowed: false,
    reason: `${actor?.name ?? "Character"} cannot use ${item?.name ?? "this weapon"} as a ${classId}.`
  };
}

export function validateWeaponRestrictions({ actor, item, requireEquipped = true } = {}) {
  if (!item || item?.type !== "weapon") return { ok: true, reason: null };
  if (requireEquipped && item?.system?.equipped !== true) return { ok: false, reason: `${item?.name ?? "Weapon"} must be equipped to attack.` };

  const classCheck = canClassUseWeapon(actor, item);
  if (!classCheck.allowed) return { ok: false, reason: classCheck.reason };

  if (item?.system?.hands === "two" && actor?.system?.equipmentSlots?.shield) {
    return { ok: false, reason: `Cannot attack with ${item?.name ?? "two-handed weapon"} while a shield is equipped.` };
  }

  return { ok: true, reason: null };
}
