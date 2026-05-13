export class BECMIItemSheet extends ItemSheet {
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if (data?.type !== "Item") {
      return super._onDrop(event);
    }

    let droppedItem = null;

    if (data.uuid) {
      droppedItem = await fromUuid(data.uuid);
    }

    if (!droppedItem && data.data) {
      droppedItem = data.data;
    }

    if (!droppedItem || droppedItem.type !== "spell") {
      return super._onDrop(event);
    }

    const current = this.item.system?.actions;
    const actions = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

    actions.push({
      id: droppedItem?.id ?? null,
      name: droppedItem?.name ?? "",
      type: "spell",
      source: droppedItem?.pack || droppedItem?.compendium ? "compendium" : "item",
      itemUuid: droppedItem?.uuid ?? null,
      uses: {
        max: null,
        value: null,
        per: null
      },
      notes: ""
    });

    await this.item.update({
      "system.actions": actions
    });

    return this.item;
  }
}
