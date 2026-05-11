const { ActorSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BECMICreatureSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["becmi", "sheet", "actor", "creature"],
    position: {
      width: 720,
      height: 700
    }
  };

  static PARTS = {
    form: {
      template: "systems/becmi-foundry/templates/actor/creature-sheet-v2.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system ?? {};

    console.log("BECMICreatureSheetV2 prepare context fired");

    return {
      ...context,
      actor,
      system
    };
  }
}
