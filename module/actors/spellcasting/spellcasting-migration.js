import { normalizeActorSpellcasting } from "./spellcasting-normalization.js";

export function migrateActorSpellcasting(actor) {
  const system = actor?.system ?? {};
  const current = system?.spellcasting;
  if (!current || typeof current !== "object") return normalizeActorSpellcasting(system);
  const version = Number(current.schemaVersion);
  switch (version) {
    case 1:
      return normalizeActorSpellcasting(system);
    default:
      if (version > 1) throw new Error(`[BECMI Spellcasting Migration] Unsupported future schemaVersion ${version}.`);
      throw new Error(`[BECMI Spellcasting Migration] Malformed spellcasting structure. schemaVersion=${current.schemaVersion}`);
  }
}
