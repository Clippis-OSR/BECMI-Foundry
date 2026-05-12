export function normalizeHitDice(hd) {
  const raw = hd;

  if (typeof hd === "number") {
    if (!Number.isFinite(hd)) return null;
    return {
      raw,
      base: Math.trunc(hd),
      modifier: 0,
      numeric: hd
    };
  }

  if (typeof hd !== "string") return null;

  const value = hd.trim().toLowerCase();
  if (!value) return null;

  if (/^\d+\s*\/\s*\d+$/.test(value)) {
    const [num, den] = value.split("/").map((part) => Number(part.trim()));
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;

    return {
      raw,
      base: 0,
      modifier: 0,
      numeric: num / den
    };
  }

  if (/^\d+\s*[+-]\s*\d+$/.test(value)) {
    const match = value.match(/^(\d+)\s*([+-])\s*(\d+)$/);
    const base = Number(match[1]);
    const modifierMagnitude = Number(match[3]);
    if (!Number.isFinite(base) || !Number.isFinite(modifierMagnitude)) return null;

    const sign = match[2] === "-" ? -1 : 1;
    const modifier = sign * modifierMagnitude;
    return {
      raw,
      base,
      modifier,
      numeric: base + modifier / 10
    };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  return {
    raw,
    base: numeric,
    modifier: 0,
    numeric
  };
}

export function compareHitDiceToBracket(hd, bracket) {
  const normalized = normalizeHitDice(hd);
  if (!normalized) return false;

  if (typeof bracket === "number") {
    return normalized.numeric === bracket;
  }

  if (typeof bracket !== "string") return false;

  const text = bracket.trim().toLowerCase();
  if (!text) return false;

  const upToMatch = text.match(/^up to\s+(\d+(?:\.\d+)?)$/);
  if (upToMatch) {
    return normalized.numeric <= Number(upToMatch[1]);
  }

  const andUpMatch = text.match(/^(\d+(?:\.\d+)?)\+\s+and up$/);
  if (andUpMatch) {
    return normalized.numeric >= Number(andUpMatch[1]);
  }

  const plusRangeMatch = text.match(/^(\d+(?:\.\d+)?)\+\s+to\s+(\d+(?:\.\d+)?)$/);
  if (plusRangeMatch) {
    const min = Number(plusRangeMatch[1]);
    const max = Number(plusRangeMatch[2]);
    return normalized.numeric > min && normalized.numeric <= max;
  }

  const rangeMatch = text.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return normalized.numeric >= min && normalized.numeric <= max;
  }

  const bracketHd = normalizeHitDice(bracket);
  return bracketHd ? normalized.numeric === bracketHd.numeric : false;
}
