import { CORE_GROUPS, BODY_SCHEDULE, getHygieneSchedule } from "../config/tasks.js";
import { getDateKey, parseDateKey } from "./date.service.js";

export function getTasksForDate(dateKey, bonusGroups = []) {
  const dayOfWeek = parseDateKey(dateKey).getDay();
  const hygiene = getHygieneSchedule(dayOfWeek);
  const requiredTasks = [
    ...CORE_GROUPS.career,
    ...CORE_GROUPS.german,
    ...BODY_SCHEDULE[dayOfWeek].tasks,
    ...hygiene.morning,
    ...hygiene.evening
  ];
  return {
    dayOfWeek,
    bodyNote: BODY_SCHEDULE[dayOfWeek].note,
    career: CORE_GROUPS.career,
    german: CORE_GROUPS.german,
    body: BODY_SCHEDULE[dayOfWeek].tasks,
    hygiene,
    requiredTasks,
    bonusTasks: bonusGroups.flatMap(group => group.tasks)
  };
}

export function createEmptyDay(dateKey) {
  return { date: dateKey, checks: {}, note: "", time: { career: 0, german: 0 }, finalized: false, summary: null, updatedAt: new Date().toISOString() };
}

export function ensureDay(state, dateKey) {
  if (!state.days[dateKey]) state.days[dateKey] = createEmptyDay(dateKey);
  if (typeof state.days[dateKey].note !== "string") state.days[dateKey].note = "";
  if (!state.days[dateKey].time || typeof state.days[dateKey].time !== "object") state.days[dateKey].time = { career: 0, german: 0 };
  state.days[dateKey].time.career = Math.max(0, Number(state.days[dateKey].time.career) || 0);
  state.days[dateKey].time.german = Math.max(0, Number(state.days[dateKey].time.german) || 0);
  return state.days[dateKey];
}

export function buildDaySummary(day, bonusGroups = []) {
  const tasks = getTasksForDate(day.date, bonusGroups);
  const completedRequired = tasks.requiredTasks.filter(task => Boolean(day.checks[task.id]));
  const missingRequired = tasks.requiredTasks.filter(task => !day.checks[task.id]);
  const completedBonus = tasks.bonusTasks.filter(task => Boolean(day.checks[task.id]));
  return {
    closed: missingRequired.length === 0 && tasks.requiredTasks.length > 0,
    completedRequired: completedRequired.length,
    totalRequired: tasks.requiredTasks.length,
    bonusCount: completedBonus.length,
    missingTasks: missingRequired.map(({ id, label, category }) => ({ id, label, category })),
    finalizedAt: new Date().toISOString()
  };
}

export function finalizeDay(day, bonusGroups = []) {
  day.summary = buildDaySummary(day, bonusGroups);
  day.finalized = true;
  day.updatedAt = new Date().toISOString();
  return day.summary;
}

export function finalizePastDays(state, todayKey = getDateKey()) {
  Object.entries(state.days).forEach(([dateKey, day]) => {
    if (dateKey < todayKey && !day.finalized) finalizeDay(day, state.bonusGroups);
  });
}
