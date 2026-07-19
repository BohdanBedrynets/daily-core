import { buildDaySummary, getTasksForDate } from "./day.service.js";
import { getDateKey } from "./date.service.js";

const MONTH_NAMES = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
const CATEGORY_ORDER = ["Кар’єра", "Німецька", "Тіло", "Гігієна"];

function safeSummary(day, bonusGroups) {
  return day.finalized && day.summary ? day.summary : buildDaySummary(day, bonusGroups);
}

function longestCalendarStreak(entries) {
  const closed = entries.filter(item => item.closed).map(item => item.date).sort();
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const dateKey of closed) {
    const date = new Date(`${dateKey}T12:00:00`);
    if (previous) {
      const diff = Math.round((date - previous) / 86400000);
      current = diff === 1 ? current + 1 : 1;
    } else current = 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

function getCategoryStats(days, bonusGroups) {
  const stats = Object.fromEntries(CATEGORY_ORDER.map(category => [category, { completed: 0, total: 0 }]));
  for (const day of days) {
    const tasks = getTasksForDate(day.date, bonusGroups).requiredTasks;
    for (const task of tasks) {
      if (!stats[task.category]) continue;
      stats[task.category].total += 1;
      if (day.checks?.[task.id]) stats[task.category].completed += 1;
    }
  }
  return CATEGORY_ORDER.map(category => ({
    category,
    ...stats[category],
    percentage: stats[category].total ? Math.round(stats[category].completed / stats[category].total * 100) : 0
  }));
}

export function getReportYears(state) {
  const years = new Set([new Date().getFullYear()]);
  Object.keys(state.days || {}).forEach(date => years.add(Number(date.slice(0, 4))));
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}

export function buildAnnualReport(state, year, now = new Date()) {
  const todayKey = getDateKey(now);
  const days = Object.values(state.days || {})
    .filter(day => Number(day.date?.slice(0, 4)) === Number(year) && day.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const entries = days.map(day => {
    const summary = safeSummary(day, state.bonusGroups);
    return { date: day.date, day, summary, closed: summary.closed };
  });

  const months = MONTH_NAMES.map((name, index) => ({
    name,
    index,
    days: 0,
    closedDays: 0,
    bonuses: 0,
    career: 0,
    german: 0
  }));

  for (const item of entries) {
    const month = months[Number(item.date.slice(5, 7)) - 1];
    month.days += 1;
    month.closedDays += item.closed ? 1 : 0;
    month.bonuses += item.summary.bonusCount || 0;
    month.career += Number(item.day.time?.career) || 0;
    month.german += Number(item.day.time?.german) || 0;
  }

  const totalTime = months.reduce((result, month) => ({
    career: result.career + month.career,
    german: result.german + month.german
  }), { career: 0, german: 0 });
  const closedDays = entries.filter(item => item.closed).length;
  const totalBonuses = entries.reduce((sum, item) => sum + (item.summary.bonusCount || 0), 0);
  const activeMonths = months.filter(month => month.days > 0);
  const bestMonth = activeMonths.slice().sort((a, b) =>
    b.closedDays - a.closedDays || (b.career + b.german) - (a.career + a.german) || b.bonuses - a.bonuses
  )[0] || null;

  const unlockedAchievements = Object.values(state.achievements?.unlocked || {})
    .filter(value => value && Number(String(value).slice(0, 4)) === Number(year)).length;
  const completedGoals = (state.goals || []).filter(goal => Number(goal.current) >= Number(goal.target)).length;
  const notesCount = days.filter(day => day.note?.trim()).length;

  return {
    year: Number(year),
    generatedAt: now,
    totalDays: entries.length,
    closedDays,
    completionRate: entries.length ? Math.round(closedDays / entries.length * 100) : 0,
    longestStreak: longestCalendarStreak(entries),
    totalBonuses,
    totalTime,
    totalFocusedTime: totalTime.career + totalTime.german,
    bestMonth,
    months,
    categoryStats: getCategoryStats(days, state.bonusGroups),
    unlockedAchievements,
    completedGoals,
    notesCount
  };
}
