import { getActorTHAC0, getActorSaves, getCharacterSaves, getCharacterTHAC0 } from "../rules/index.mjs";
import { getActorClassId, getActorLevel, getCharacterLevelFromXP, getClassLevelData } from "../rules/lookups.mjs";

export class BECMIActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.type === "character") this._prepareCharacterDerivedData();

    if (this.type === "creature" || this.type === "monster" || this.type === "npc") {
      this._prepareCreatureDerivedData();
    }

    const debugDerivedData = game?.settings?.get?.("becmi-foundry", "debugDerivedData") ?? false;
    if (debugDerivedData) {
      console.debug("BECMI derived data prepared", {
        name: this.name,
        type: this.type,
        derived: this.system?.derived
      });
    }
  }

  _prepareCharacterDerivedData() {
    const system = this.system;
    const classId = getActorClassId(this);
    const xp = system.experience?.current ?? system.experience ?? system.xp;
    const fallbackLevel = getActorLevel(this);
    const derivedLevel = getCharacterLevelFromXP(classId, xp);
    const level = derivedLevel ?? fallbackLevel;

    const existingDerived = system.derived ?? {};
    const calculatedSaves = classId !== null && level !== null ? getCharacterSaves(classId, level) ?? {} : {};
    const calculatedThac0 = classId !== null && level !== null ? getCharacterTHAC0(classId, level) : null;
    const levelData = classId !== null && derivedLevel !== null ? getClassLevelData(classId, derivedLevel) : null;
    const spellcastingData = levelData?.spellcasting;
    const hasSpellcasting = spellcastingData?.enabled === true;
    const hasThiefSkills = !!levelData?.thiefSkills && typeof levelData.thiefSkills === "object";
    const hasTurnUndead = !!levelData?.turnUndead && typeof levelData.turnUndead === "object";

    system.derived = {
      ...existingDerived,
      level,
      thac0: calculatedThac0 ?? null,
      saves: {
        deathRayPoison: calculatedSaves.deathRayPoison ?? null,
        magicWands: calculatedSaves.magicWands ?? null,
        paralysisTurnStone: calculatedSaves.paralysisTurnStone ?? null,
        dragonBreath: calculatedSaves.dragonBreath ?? null,
        rodStaffSpell: calculatedSaves.rodStaffSpell ?? null
      },
      hasSpellcasting,
      spellSlots: hasSpellcasting ? spellcastingData?.slots ?? null : null,
      spellsKnown: hasSpellcasting ? spellcastingData?.spellsKnown ?? null : null,
      hasThiefSkills,
      thiefSkills: hasThiefSkills ? levelData?.thiefSkills ?? null : null,
      hasTurnUndead,
      turnUndead: hasTurnUndead ? levelData?.turnUndead ?? null : null
    };

    const debugDerivedData = game?.settings?.get?.("becmi-foundry", "debugDerivedData") ?? false;
    if (debugDerivedData) {
      console.debug("[BECMI] Character derived inputs.", {
        actorName: this.name,
        actorType: this.type,
        detectedClassId: classId,
        detectedXP: xp,
        detectedLevel: level,
        fallbackLevel
      });
    }
  }

  _prepareCreatureDerivedData() {
    const system = this.system;

    const existingDerived = system.derived ?? {};
    const calculatedSaves = getActorSaves(this) ?? {};

    system.derived = {
      ...existingDerived,
      thac0: getActorTHAC0(this) ?? null,
      saves: {
        deathRayPoison: calculatedSaves.deathRayPoison ?? null,
        magicWands: calculatedSaves.magicWands ?? null,
        paralysisTurnStone: calculatedSaves.paralysisTurnStone ?? null,
        dragonBreath: calculatedSaves.dragonBreath ?? null,
        rodStaffSpell: calculatedSaves.rodStaffSpell ?? null
      },
      hitDice: system.hd ?? system.hitDice ?? null,
      savesAs: system.savesAs ?? null
    };
  }
}
