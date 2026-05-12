import {
  getActorTHAC0,
  getActorSaves,
  actorHasSpellcasting,
  getSpellSlots,
  getSpellsKnown,
  actorHasThiefSkills,
  getThiefSkills,
  actorHasTurnUndead,
  getTurnUndead
} from "../rules/index.mjs";

export class BECMIActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.type === "character") {
      this._prepareCharacterDerivedData();
    }

    if (this.type === "monster" || this.type === "npc") {
      this._prepareMonsterDerivedData();
    }

    if (game.settings.get("becmi-foundry", "debugDerivedData")) {
      console.debug("BECMI derived data prepared", {
        name: this.name,
        type: this.type,
        derived: this.system?.derived
      });
    }
  }

  _prepareCharacterDerivedData() {
    const system = this.system;
    const classId = system.class;
    const level = system.level;

    system.derived = system.derived || {};

    system.derived.thac0 = getActorTHAC0(this);
    system.derived.saves = getActorSaves(this);

    system.derived.hasSpellcasting = actorHasSpellcasting(this);
    system.derived.hasThiefSkills = actorHasThiefSkills(this);
    system.derived.hasTurnUndead = actorHasTurnUndead(this);

    if (system.derived.hasSpellcasting) {
      system.derived.spellSlots = getSpellSlots(classId, level);
      system.derived.spellsKnown = getSpellsKnown(classId, level);
    }

    if (system.derived.hasThiefSkills) {
      system.derived.thiefSkills = getThiefSkills(classId, level);
    }

    if (system.derived.hasTurnUndead) {
      system.derived.turnUndead = getTurnUndead(classId, level);
    }
  }

  _prepareMonsterDerivedData() {
    const system = this.system;
    const hd = system.hd ?? system.hitDice;

    system.derived = system.derived || {};

    system.derived.thac0 = getActorTHAC0(this);
    system.derived.saves = getActorSaves(this);
    system.derived.hitDice = hd;
  }
}
