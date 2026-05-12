import { getActorTHAC0, getActorSaves } from "../rules/index.mjs";
import { getActorClassId, getActorLevel } from "../rules/lookups.mjs";

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
    const level = getActorLevel(this);

    const existingDerived = system.derived ?? {};
    const calculatedSaves = getActorSaves(this) ?? {};

    system.derived = {
      ...existingDerived,
      thac0: getActorTHAC0(this) ?? null,
      saves: {
        death: calculatedSaves.death ?? null,
        wands: calculatedSaves.wands ?? null,
        paralysis: calculatedSaves.paralysis ?? null,
        breath: calculatedSaves.breath ?? null,
        spells: calculatedSaves.spells ?? null
      }
    };

    const debugDerivedData = game?.settings?.get?.("becmi-foundry", "debugDerivedData") ?? false;
    if (debugDerivedData) {
      console.debug("[BECMI] Character derived inputs.", {
        actorName: this.name,
        actorType: this.type,
        detectedClassId: classId,
        detectedLevel: level
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
        death: calculatedSaves.death ?? null,
        wands: calculatedSaves.wands ?? null,
        paralysis: calculatedSaves.paralysis ?? null,
        breath: calculatedSaves.breath ?? null,
        spells: calculatedSaves.spells ?? null
      },
      hitDice: system.hd ?? system.hitDice ?? null,
      savesAs: system.savesAs ?? null
    };
  }
}
