import { getDateKey, parseDateKey } from "./date.service.js";
import { buildDaySummary } from "./day.service.js";

export function getMonthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array(startOffset).fill(null);
  for (let day=1; day<=daysInMonth; day++) cells.push(new Date(year, monthIndex, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function getDayCalendarStatus(state, date) {
  const key = getDateKey(date);
  const today = getDateKey();
  if (key > today) return "future";
  if (key === today) {
    const day = state.days[key];
    return day && buildDaySummary(day, state.bonusGroups).closed ? "today-done" : "today";
  }
  const day = state.days[key];
  if (!day) return "empty";
  const summary = day.finalized && day.summary ? day.summary : buildDaySummary(day, state.bonusGroups);
  return summary.closed ? "done" : "missed";
}

export function shiftMonth(year, monthIndex, delta) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}
