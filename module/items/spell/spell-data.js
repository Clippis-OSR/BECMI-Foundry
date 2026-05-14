const titleCase = (value) => String(value ?? "").replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase()).trim();

function formatDuration(duration = {}) {
  if (duration.special) return duration.special;
  if (duration.type === "instant") return "Instant";
  if (duration.type === "permanent") return "Permanent";
  return `${Number(duration.value) || 0} ${duration.type ?? ""}`.trim();
}

function formatRange(range = {}) {
  if (range.type === "special") return range.special || "Special";
  if (["self", "touch", "unlimited"].includes(range.type)) return titleCase(range.type);
  return `${Number(range.value) || 0} ${range.type ?? ""}`.trim();
}

export function prepareSpellData(item) {
  if (!item || item.type !== "spell") return {};
  const system = item.system ?? {};
  const spellLists = Array.isArray(system.spellLists) ? system.spellLists : [];
  return {
    labels: {
      spellLists: spellLists.map(titleCase).join(", "),
      duration: formatDuration(system.duration),
      range: formatRange(system.range)
    },
    computed: {
      hasAreaTargeting: Boolean(system.targeting?.area?.shape),
      hasSavingThrow: Boolean(system.savingThrow?.allowed),
      supportsAutomation: Boolean(system.automation?.supported)
    }
  };
}
