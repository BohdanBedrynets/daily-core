import { getDateKey } from "./date.service.js";
import { ensureDay } from "./day.service.js";

export const TIME_CATEGORIES = {
  career: "Кар’єра",
  german: "Німецька"
};

function ensureTimeState(state) {
  if (!state.timeTracking || typeof state.timeTracking !== "object") {
    state.timeTracking = { activeTimer: null };
  }
  if (!("activeTimer" in state.timeTracking)) state.timeTracking.activeTimer = null;
  return state.timeTracking;
}

export function ensureDayTime(day) {
  if (!day.time || typeof day.time !== "object") day.time = {};
  for (const category of Object.keys(TIME_CATEGORIES)) {
    const value = Number(day.time[category]);
    day.time[category] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }
  return day.time;
}

export function getStoredSeconds(state, dateKey, category) {
  const day = state.days?.[dateKey];
  if (!day) return 0;
  return ensureDayTime(day)[category] || 0;
}

export function isTimerRunning(state, category) {
  const active = ensureTimeState(state).activeTimer;
  return Boolean(active && active.category === category && active.startedAt);
}

export function getActiveTimer(state) {
  return ensureTimeState(state).activeTimer;
}

export function getLiveSeconds(state, dateKey, category, now = new Date()) {
  let total = getStoredSeconds(state, dateKey, category);
  const active = getActiveTimer(state);
  if (!active || active.category !== category || !active.startedAt) return total;

  const startedAt = new Date(active.startedAt);
  if (Number.isNaN(startedAt.getTime())) return total;
  if (getDateKey(startedAt) !== dateKey) return total;

  return total + Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}

function addSecondsToDay(state, dateKey, category, seconds) {
  if (seconds <= 0) return;
  const day = ensureDay(state, dateKey);
  const time = ensureDayTime(day);
  time[category] = Math.max(0, Math.floor((time[category] || 0) + seconds));
  day.updatedAt = new Date().toISOString();
}

export function commitActiveTimer(state, now = new Date()) {
  const tracking = ensureTimeState(state);
  const active = tracking.activeTimer;
  if (!active?.startedAt || !TIME_CATEGORIES[active.category]) return false;

  let cursor = new Date(active.startedAt);
  const end = new Date(now);
  if (Number.isNaN(cursor.getTime()) || end <= cursor) {
    active.startedAt = end.toISOString();
    return false;
  }

  while (getDateKey(cursor) !== getDateKey(end)) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    addSecondsToDay(state, getDateKey(cursor), active.category, Math.floor((nextMidnight - cursor) / 1000));
    cursor = nextMidnight;
  }

  addSecondsToDay(state, getDateKey(end), active.category, Math.floor((end - cursor) / 1000));
  active.startedAt = end.toISOString();
  return true;
}

export function startTimer(state, category, now = new Date()) {
  if (!TIME_CATEGORIES[category]) throw new Error("Невідома категорія таймера.");
  const tracking = ensureTimeState(state);
  if (tracking.activeTimer) commitActiveTimer(state, now);
  tracking.activeTimer = { category, startedAt: now.toISOString() };
}

export function pauseTimer(state, now = new Date()) {
  const tracking = ensureTimeState(state);
  if (!tracking.activeTimer) return;
  commitActiveTimer(state, now);
  tracking.activeTimer = null;
}

export function addManualMinutes(state, dateKey, category, minutes) {
  const numeric = Number(minutes);
  if (!TIME_CATEGORIES[category] || !Number.isFinite(numeric) || numeric === 0) return false;
  addSecondsToDay(state, dateKey, category, Math.round(numeric * 60));
  return true;
}

export function setMinutesForDay(state, dateKey, category, minutes) {
  if (!TIME_CATEGORIES[category]) return false;
  const numeric = Math.max(0, Number(minutes) || 0);
  const day = ensureDay(state, dateKey);
  ensureDayTime(day)[category] = Math.round(numeric * 60);
  day.updatedAt = new Date().toISOString();
  return true;
}

export function getTimeTotals(state, now = new Date()) {
  const totals = { career: 0, german: 0 };
  const byMonth = {};

  for (const [dateKey, day] of Object.entries(state.days || {})) {
    const time = ensureDayTime(day);
    const monthKey = dateKey.slice(0, 7);
    byMonth[monthKey] ||= { career: 0, german: 0 };
    for (const category of Object.keys(TIME_CATEGORIES)) {
      totals[category] += time[category] || 0;
      byMonth[monthKey][category] += time[category] || 0;
    }
  }

  const active = getActiveTimer(state);
  if (active?.startedAt && TIME_CATEGORIES[active.category]) {
    const startedAt = new Date(active.startedAt);
    const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
    if (elapsed > 0) {
      totals[active.category] += elapsed;
      const monthKey = getDateKey(now).slice(0, 7);
      byMonth[monthKey] ||= { career: 0, german: 0 };
      byMonth[monthKey][active.category] += elapsed;
    }
  }

  return { totals, byMonth };
}

export function formatDuration(seconds, includeSeconds = false) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (includeSeconds) return [hours, minutes, secs].map(value => String(value).padStart(2, "0")).join(":");
  if (hours === 0) return `${minutes} хв`;
  return `${hours} год ${minutes} хв`;
}
