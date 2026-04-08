/**
 * Short demographic delta strings for statistics (Summary-style: signed value + "higher" / "less").
 */

const THAN_OTHER_USERS = ' than other users';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function pctDiffFromAverage(userVal: number, avg: number): number {
  if (avg === 0) return userVal === 0 ? 0 : 100;
  return Math.round(((userVal - avg) / avg) * 100);
}

function formatSignedPctVsAvg(userVal: number, avg: number): string | null {
  const d = pctDiffFromAverage(userVal, avg);
  if (d === 0) return null;
  const word = d > 0 ? 'higher' : 'less';
  const sign = d > 0 ? '+' : '-';
  return `${sign}${Math.abs(d)}% ${word}${THAN_OTHER_USERS}`;
}

export function demographicChangeIncome(userVal: number, peerValues: number[]): string | null {
  return formatSignedPctVsAvg(userVal, average(peerValues));
}

/** Same %-vs-average as income; UI inverts green/red (lower spending is better). */
export function demographicChangeExpense(userVal: number, peerValues: number[]): string | null {
  return formatSignedPctVsAvg(userVal, average(peerValues));
}

export function demographicChangeGoalRate(userVal: number, peerValues: number[]): string | null {
  const avg = average(peerValues);
  const raw = userVal - avg;
  const rounded = Math.round(raw * 10) / 10;
  if (Math.abs(rounded) < 0.05) return null;
  const word = rounded > 0 ? 'higher' : 'less';
  const sign = rounded > 0 ? '+' : '-';
  const abs = Math.abs(rounded);
  const numStr = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${sign}${numStr}% ${word}${THAN_OTHER_USERS}`;
}

export function demographicChangePortfolio(userVal: number, peerValues: number[]): string | null {
  return formatSignedPctVsAvg(userVal, average(peerValues));
}

export function demographicChangeHealth(userScore: number, peerScores: number[]): string | null {
  const avg = average(peerScores);
  const d = Math.round(userScore - avg);
  if (d === 0) return null;
  const word = d > 0 ? 'higher' : 'less';
  const sign = d > 0 ? '+' : '-';
  return `${sign}${Math.abs(d)} ${word}${THAN_OTHER_USERS}`;
}
