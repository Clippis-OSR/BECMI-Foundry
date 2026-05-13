const DEFAULT_CONTAINERS = [
  {
    name: "Belt Pouch",
    containerType: "belt-pouch",
    capacity: 100,
    worn: true
  },
  {
    name: "Worn Items",
    containerType: "worn",
    capacity: 0,
    worn: true
  },
  {
    name: "Backpack",
    containerType: "backpack",
    capacity: 400,
    worn: true
  },
  {
    name: "Sack #1",
    containerType: "sack",
    capacity: 600
  },
  {
    name: "Sack #2",
    containerType: "sack",
    capacity: 600
  }
];

function supportsDefaultCharacterInventory(actor) {
  return actor?.type === "character";
}

function getExistingContainerMatches(actor, definition) {
  const items = Array.from(actor?.items ?? []);
  const containers = items.filter((item) => item?.type === "container");

  const byType = containers.filter((item) => item?.system?.containerType === definition.containerType);
  if (definition.containerType === "sack") {
    return byType;
  }

  if (byType.length > 0) {
    return byType.slice(0, 1);
  }

  const byName = containers.filter((item) => item?.name === definition.name);
  return byName.slice(0, 1);
}

function toContainerCreateData(definition) {
  return {
    name: definition.name,
    type: "container",
    system: {
      containerType: definition.containerType,
      capacity: definition.capacity,
      quantity: 1,
      worn: Boolean(definition.worn),
      equipped: false,
      weight: 0,
      value: 0,
      containerId: ""
    }
  };
}

export async function ensureDefaultContainers(actor) {
  if (!actor || !supportsDefaultCharacterInventory(actor)) {
    return { created: [], skipped: true };
  }

  const toCreate = [];

  for (const definition of DEFAULT_CONTAINERS) {
    const matches = getExistingContainerMatches(actor, definition);

    if (definition.containerType === "sack") {
      if (matches.length >= 2) continue;
      const missing = 2 - matches.length;
      for (let i = 0; i < missing; i += 1) {
        const name = matches.length + i === 0 ? "Sack #1" : "Sack #2";
        toCreate.push(toContainerCreateData({ ...definition, name }));
      }
      continue;
    }

    if (matches.length > 0) continue;
    toCreate.push(toContainerCreateData(definition));
  }

  if (toCreate.length === 0) {
    return { created: [], skipped: false };
  }

  const created = await actor.createEmbeddedDocuments("Item", toCreate);
  return { created, skipped: false };
}
