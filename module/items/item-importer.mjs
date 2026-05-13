import { normalizeContainerId, normalizeItemLocation } from "./inventory-manager.mjs";
import { addCurrency, getCurrencyItems, normalizeCurrencyDenomination } from "./currency.mjs";

function normalizeSystemForActorCopy(systemData = {}, containerId = "", location = "worn") {
  const normalizedLocation = normalizeItemLocation(location);
  const syncMap = {
    equipped: { equipped: true, worn: false },
    worn: { equipped: false, worn: true },
    storage: { equipped: false, worn: false }
  };

  return {
    ...systemData,
    containerId: normalizeContainerId(containerId),
    location: normalizedLocation,
    ...(syncMap[normalizedLocation] ?? {})
  };
}

function isDescendantContainer(actor, childContainerId, ancestorContainerId) {
  const childId = normalizeContainerId(childContainerId);
  const ancestorId = normalizeContainerId(ancestorContainerId);
  if (!childId || !ancestorId) return false;

  let cursor = actor?.items?.get(childId);
  const seen = new Set();

  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    const parentId = normalizeContainerId(cursor?.system?.containerId);
    if (!parentId) return false;
    if (parentId === ancestorId) return true;
    cursor = actor?.items?.get(parentId);
  }

  return false;
}

export function cloneItemDataForActor(sourceItem, options = {}) {
  const containerId = normalizeContainerId(options.containerId ?? "");
  const location = normalizeItemLocation(options.location ?? "worn");
  const createData = sourceItem?.toObject ? sourceItem.toObject() : foundry.utils.deepClone(sourceItem ?? {});

  delete createData._id;
  createData.system = normalizeSystemForActorCopy(createData.system ?? {}, containerId, location);

  if (createData.type === "currency") {
    createData.system.weightPerUnit = 1;
  }

  return createData;
}

export async function mergeCurrencyItem(actor, itemData) {
  const denomination = normalizeCurrencyDenomination(itemData?.system?.denomination);
  const quantity = Math.max(0, Math.floor(Number(itemData?.system?.quantity ?? 0) || 0));
  if (!denomination || quantity <= 0) return null;

  const before = getCurrencyItems(actor).find(
    (item) => normalizeCurrencyDenomination(item?.system?.denomination) === denomination
  );

  const merged = await addCurrency(actor, denomination, quantity);
  if (merged?.update) {
    await merged.update({ "system.weightPerUnit": 1 });
  }

  return merged ?? before ?? null;
}

export async function importItemToActor(actor, sourceItem, options = {}) {
  if (!actor?.createEmbeddedDocuments || !sourceItem) return { status: "ignored", reason: "invalid" };

  const targetContainerId = normalizeContainerId(options.containerId ?? "");
  const targetContainer = targetContainerId ? actor.items.get(targetContainerId) : null;
  const safeContainerId = targetContainer ? targetContainerId : "";

  // Guard container cycles for same-actor drag/drop moves.
  if (sourceItem.type === "container" && sourceItem.parent?.id === actor.id && sourceItem.parent instanceof Actor) {
    if (sourceItem.id === safeContainerId || isDescendantContainer(actor, safeContainerId, sourceItem.id)) {
      ui.notifications?.warn("Cannot place a container inside itself or one of its contents.");
      return { status: "ignored", reason: "circular" };
    }
  }

  const createData = cloneItemDataForActor(sourceItem, { containerId: safeContainerId, location: options.location ?? "worn" });

  if (sourceItem.type === "currency") {
    const merged = await mergeCurrencyItem(actor, createData);
    if (merged) return { status: "merged", item: merged };
  }

  const [created] = await actor.createEmbeddedDocuments("Item", [createData]);
  return { status: "created", item: created ?? null };
}
