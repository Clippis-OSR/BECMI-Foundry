const SEVERITY_ORDER = Object.freeze({ error: 0, warning: 1, info: 2 });

const CODE_CONFIG = Object.freeze({
  invalidContainer: { severity: "error", actorLevel: false, summary: "Item points to a missing/invalid container.", suggestion: "Remove invalid container reference" },
  orphanedContainedItem: { severity: "error", actorLevel: false, summary: "Item references a container chain with a missing parent.", suggestion: "Clear orphaned container assignment" },
  containerCycle: { severity: "error", actorLevel: false, summary: "Container loop detected.", suggestion: "Break the loop by clearing one container reference" },
  equippedNotCarried: { severity: "warning", actorLevel: false, summary: "Item is equipped but not in a carried location.", suggestion: "Move item to carried inventory" },
  malformedEncumbrance: { severity: "error", actorLevel: false, summary: "Item weight is malformed or negative.", suggestion: "Set a non-negative weight value" },
  invalidQuantity: { severity: "error", actorLevel: false, summary: "Item quantity is malformed or negative.", suggestion: "Set a non-negative quantity value" },
  invalidLocation: { severity: "error", actorLevel: false, summary: "Item inventory location is invalid.", suggestion: "Move item to carried inventory" },
  missingInventoryFields: { severity: "error", actorLevel: false, summary: "Item is missing required inventory fields.", suggestion: "Open item and restore inventory fields" },
  missingCurrencyBucket: { severity: "warning", actorLevel: true, summary: "Currency bucket is missing.", suggestion: "Move currency to treasure hoard" },
  invalidCurrency: { severity: "warning", actorLevel: true, summary: "Currency quantity is malformed or negative.", suggestion: "Set currency amounts to non-negative values" }
});

function normalizeDiagnostic(diag = {}) {
  const config = CODE_CONFIG[diag.code] ?? {};
  const severity = config.severity ?? diag.severity ?? "info";
  return {
    code: String(diag.code ?? "unknown"),
    severity,
    itemId: diag.itemId ? String(diag.itemId) : "",
    message: String(diag.message ?? config.summary ?? "Inventory diagnostic."),
    summary: config.summary ?? String(diag.message ?? "Inventory diagnostic."),
    suggestion: config.suggestion ?? "",
    actorLevel: config.actorLevel ?? !diag.itemId
  };
}

function compareDiagnostics(a, b) {
  const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  if (sev !== 0) return sev;
  const codeCmp = a.code.localeCompare(b.code);
  if (codeCmp !== 0) return codeCmp;
  const itemCmp = String(a.itemId ?? "").localeCompare(String(b.itemId ?? ""));
  if (itemCmp !== 0) return itemCmp;
  return a.message.localeCompare(b.message);
}

export function buildInventoryDiagnosticsPresentation(rawDiagnostics = []) {
  const normalized = rawDiagnostics.map((entry) => normalizeDiagnostic(entry));
  const dedupedMap = new Map();
  for (const diagnostic of normalized) {
    const key = `${diagnostic.severity}|${diagnostic.code}|${diagnostic.itemId}|${diagnostic.message}`;
    if (!dedupedMap.has(key)) dedupedMap.set(key, diagnostic);
  }
  const diagnostics = [...dedupedMap.values()].sort(compareDiagnostics);
  const severityCounts = { error: 0, warning: 0, info: 0 };
  const actorDiagnostics = [];
  const itemDiagnosticsById = {};

  for (const diagnostic of diagnostics) {
    if (severityCounts[diagnostic.severity] !== undefined) severityCounts[diagnostic.severity] += 1;
    if (diagnostic.actorLevel) {
      actorDiagnostics.push(diagnostic);
      continue;
    }
    const itemId = diagnostic.itemId;
    if (!itemId) {
      actorDiagnostics.push(diagnostic);
      continue;
    }
    if (!itemDiagnosticsById[itemId]) itemDiagnosticsById[itemId] = [];
    itemDiagnosticsById[itemId].push(diagnostic);
  }

  return {
    diagnostics,
    actorDiagnostics,
    itemDiagnosticsById,
    severityCounts,
    hasDiagnostics: diagnostics.length > 0
  };
}
