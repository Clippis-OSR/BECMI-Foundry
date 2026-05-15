const TIME_UNITS = Object.freeze({
  combatRoundSeconds: 10,
  explorationTurnMinutes: 10,
  watchHours: 4,
  dayHours: 24
});

export function getTimeUnits() {
  return TIME_UNITS;
}

export function deriveElapsedTimeFromTurns(elapsedTurns) {
  const turns = Number.isFinite(Number(elapsedTurns)) ? Math.max(0, Math.floor(Number(elapsedTurns))) : 0;
  const elapsedMinutes = turns * TIME_UNITS.explorationTurnMinutes;
  const elapsedWatches = elapsedMinutes / (TIME_UNITS.watchHours * 60);
  const elapsedDays = elapsedMinutes / (TIME_UNITS.dayHours * 60);

  return Object.freeze({
    elapsedTurns: turns,
    elapsedRounds: turns * (TIME_UNITS.explorationTurnMinutes * 60) / TIME_UNITS.combatRoundSeconds,
    elapsedMinutes,
    elapsedWatches,
    elapsedDays
  });
}
