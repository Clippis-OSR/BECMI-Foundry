import { calculateActorAC, getActorTHAC0, getActorSaves, getCharacterSaves, getCharacterTHAC0, getCanonicalTurnUndeadTable } from "../rules/index.mjs";
import { getActorClassId, getActorLevel, getCharacterLevelFromXP, getClassLevelData } from "../rules/lookups.mjs";
import { assertCanonicalActorType } from "./actor-types.mjs";
import { calculateTotalEncumbrance } from "../items/encumbrance.mjs";
import { migrateActorSpellcasting } from "./spellcasting/spellcasting-migration.js";
import { validateActorSpellcasting } from "./spellcasting/spellcasting-validation.js";
import { prepareSpellcastingData } from "./spellcasting/spellcasting-data.js";
import { buildCreatureRuntimeFromMonster } from "../monsters/monster-runtime.mjs";


function applyEncumbranceDerivedData(system, actor) {
  const summary = calculateTotalEncumbrance(actor);
  const existingDerived = system.derived ?? {};
  system.derived = {
    ...existingDerived,
    encumbrance: {
      total: Number(summary?.total ?? 0) || 0,
      withoutBackpack: Number(summary?.withoutBackpack ?? 0) || 0,
      withoutSacks: Number(summary?.withoutSacks ?? 0) || 0,
      onlyWornAndBeltPouch: Number(summary?.onlyWornAndBeltPouch ?? 0) || 0
    },
    movement: {
      normalFeetPerTurn: Number(summary?.normalSpeed ?? 0) || 0,
      encounterFeetPerRound: Number(summary?.encounterSpeed ?? 0) || 0
    }
  };
}

export class BECMIActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    const actorType = assertCanonicalActorType(this.type, `prepareDerivedData for actor "${this.name ?? this.id ?? "Unknown"}"`);

    if (actorType === "character") this._prepareCharacterDerivedData();
    if (actorType === "creature") this._prepareCreatureDerivedData();

    applyEncumbranceDerivedData(this.system, this);

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
    migrateActorSpellcasting(this);
    validateActorSpellcasting(this);
    const actorSpellcasting = this.system?.spellcasting;
    const spellcastingData = levelData?.spellcasting;
    const hasSpellcasting = spellcastingData?.enabled === true || Object.values(actorSpellcasting?.casters ?? {}).some((c) => c?.enabled === true);
    const hasThiefSkills = !!levelData?.thiefSkills && typeof levelData.thiefSkills === "object";
    const hasTurnUndead = !!levelData?.turnUndead && typeof levelData.turnUndead === "object";
    const canonicalSaves = {
      deathRayPoison: { value: calculatedSaves.deathRayPoison ?? null, label: "Death Ray / Poison" },
      magicWands: { value: calculatedSaves.magicWands ?? null, label: "Magic Wands" },
      paralysisTurnStone: { value: calculatedSaves.paralysisTurnStone ?? null, label: "Paralysis / Turn to Stone" },
      dragonBreath: { value: calculatedSaves.dragonBreath ?? null, label: "Dragon Breath" },
      rodStaffSpell: { value: calculatedSaves.rodStaffSpell ?? null, label: "Rod / Staff / Spell" }
    };

    system.saves = canonicalSaves;

    const calculatedAC = calculateActorAC(this);
    system.ac = { ...(system.ac ?? {}), ...calculatedAC };

    system.derived = {
      ...existingDerived,
      level,
      thac0: calculatedThac0 ?? null,
      saves: {
        deathRayPoison: canonicalSaves.deathRayPoison.value,
        magicWands: canonicalSaves.magicWands.value,
        paralysisTurnStone: canonicalSaves.paralysisTurnStone.value,
        dragonBreath: canonicalSaves.dragonBreath.value,
        rodStaffSpell: canonicalSaves.rodStaffSpell.value
      },
      hasSpellcasting,
      spellcasting: prepareSpellcastingData(this),
      hasThiefSkills,
      thiefSkills: hasThiefSkills ? levelData?.thiefSkills ?? null : null,
      hasTurnUndead,
      turnUndead: hasTurnUndead ? getCanonicalTurnUndeadTable(levelData?.turnUndead) : null
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
    const monster = system.monster ?? {};
    const monsterRuntime = buildCreatureRuntimeFromMonster(this);

    const existingDerived = system.derived ?? {};
    const calculatedSaves = getActorSaves(this) ?? {};
    const canonicalSaves = {
      deathRayPoison: { value: calculatedSaves.deathRayPoison ?? null, label: "Death Ray / Poison" },
      magicWands: { value: calculatedSaves.magicWands ?? null, label: "Magic Wands" },
      paralysisTurnStone: { value: calculatedSaves.paralysisTurnStone ?? null, label: "Paralysis / Turn to Stone" },
      dragonBreath: { value: calculatedSaves.dragonBreath ?? null, label: "Dragon Breath" },
      rodStaffSpell: { value: calculatedSaves.rodStaffSpell ?? null, label: "Rod / Staff / Spell" }
    };

    system.saves = canonicalSaves;

    const calculatedAC = calculateActorAC(this);
    system.ac = { ...(system.ac ?? {}), ...calculatedAC };

    system.derived = {
      ...existingDerived,
      thac0: getActorTHAC0(this) ?? null,
      saves: {
        deathRayPoison: canonicalSaves.deathRayPoison.value,
        magicWands: canonicalSaves.magicWands.value,
        paralysisTurnStone: canonicalSaves.paralysisTurnStone.value,
        dragonBreath: canonicalSaves.dragonBreath.value,
        rodStaffSpell: canonicalSaves.rodStaffSpell.value
      },
      hitDice: monsterRuntime.hitDice,
      savesAs: monsterRuntime.saveAs,
      monster: {
        monsterKey: monsterRuntime.monsterKey,
        morale: monsterRuntime.morale,
        xp: monsterRuntime.xp,
        treasureType: monsterRuntime.treasureType,
        ac: monsterRuntime.ac,
        damage: monsterRuntime.damage,
        specialAbilitiesRaw: monsterRuntime.specialAbilitiesRaw,
        diagnostics: monsterRuntime.diagnostics,
        movement: {
          summary: [monsterRuntime.movement?.feetPerTurn, monsterRuntime.movement?.feetPerRound]
            .map((n) => Number(n) || 0)
            .some((n) => n > 0)
            ? `${Number(monsterRuntime.movement?.feetPerTurn) || 0}'/turn (${Number(monsterRuntime.movement?.feetPerRound) || 0}'/round)`
            : String(monsterRuntime.movement?.raw ?? "")
        }
      }
    };

  }
}
