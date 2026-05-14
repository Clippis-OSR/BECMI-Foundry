export function installFoundryStubs() {
  globalThis.foundry = {
    utils: {
      getProperty: (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj),
      deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
      mergeObject: (base, other) => ({ ...base, ...other })
    }
  };

  globalThis.ui = {
    notifications: {
      warn: () => {},
      error: () => {},
      info: () => {}
    }
  };
}

export function installDeterministicRolls(totals) {
  const queue = [...totals];
  globalThis.Roll = class Roll {
    constructor(formula) {
      this.formula = formula;
      this.total = null;
    }
    async evaluate() {
      if (queue.length === 0) throw new Error(`No queued roll total left for formula ${this.formula}`);
      this.total = queue.shift();
      return this;
    }
  };
}

export function createItem({ id, name = id, type = "weapon", system = {} } = {}) {
  return {
    id,
    name,
    type,
    system: { ...system },
    async update(changes) {
      applyDotPaths(this, changes);
      return this;
    }
  };
}

export function createActor({ id = "a1", type = "character", system = {}, items = [] } = {}) {
  const map = new Map(items.map((i) => [i.id, i]));
  const collection = Object.assign(Array.from(map.values()), { get: (id) => map.get(id) });
  const actor = {
    id,
    name: id,
    type,
    system: {
      combat: { thac0: 20, ac: 9 },
      equipmentSlots: {},
      ...system
    },
    items: collection,
    async update(changes) {
      applyDotPaths(this, changes);
      return this;
    }
  };
  return actor;
}

function applyDotPaths(target, changes) {
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split('.');
    let cur = target;
    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      if (!(key in cur) || typeof cur[key] !== 'object' || cur[key] === null) cur[key] = {};
      cur = cur[key];
    }
    cur[keys[keys.length - 1]] = value;
  }
}
