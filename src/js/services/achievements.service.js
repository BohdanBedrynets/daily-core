import { calculateStatistics } from "./statistics.service.js";
import { getTimeTotals } from "./time.service.js";

const hour = value => value * 3600;

export const ACHIEVEMENT_GROUPS = [
  {
    id: "days", title: "Закриті дні", achievements: [
      ["closed-1", "Перший закритий день", "Закрити перший день", 1],
      ["closed-7", "Стабільний тиждень", "Закрити 7 днів", 7],
      ["closed-30", "Місяць опори", "Закрити 30 днів", 30],
      ["closed-100", "Сотня днів", "Закрити 100 днів", 100],
      ["closed-365", "Рік системи", "Закрити 365 днів", 365]
    ].map(([id,title,description,target]) => ({ id,title,description,target,metric:"closedDays",unit:"дн." }))
  },
  {
    id: "streaks", title: "Серії днів", achievements: [
      ["streak-3", "Початок серії", "Закрити 3 дні поспіль", 3],
      ["streak-7", "Тиждень без розриву", "Закрити 7 днів поспіль", 7],
      ["streak-14", "Два тижні", "Закрити 14 днів поспіль", 14],
      ["streak-30", "Місяць без розриву", "Закрити 30 днів поспіль", 30],
      ["streak-100", "Залізна серія", "Закрити 100 днів поспіль", 100]
    ].map(([id,title,description,target]) => ({ id,title,description,target,metric:"longestStreak",unit:"дн." }))
  },
  {
    id: "career", title: "Кар’єра", achievements: [1,10,50,100,500].map(target => ({
      id:`career-${target}`, title: target === 1 ? "Перший фокус" : `${target} годин кар’єри`,
      description:`Вкласти ${target} ${target === 1 ? "годину" : "годин"} у кар’єру`, target:hour(target), metric:"careerSeconds", unit:"time"
    }))
  },
  {
    id: "german", title: "Німецька", achievements: [1,10,50,100,500].map(target => ({
      id:`german-${target}`, title: target === 1 ? "Перша година німецької" : `${target} годин німецької`,
      description:`Вкласти ${target} ${target === 1 ? "годину" : "годин"} у німецьку`, target:hour(target), metric:"germanSeconds", unit:"time"
    }))
  },
  {
    id: "bonuses", title: "Бонусні справи", achievements: [10,50,100,500].map(target => ({
      id:`bonuses-${target}`, title:`${target} бонусних справ`, description:`Виконати ${target} бонусних завдань`, target, metric:"totalBonuses", unit:"шт."
    }))
  },
  {
    id: "goals", title: "Цілі", achievements: [1,5,10].map(target => ({
      id:`goals-${target}`, title: target === 1 ? "Перша завершена ціль" : `${target} завершених цілей`,
      description:`Завершити ${target} ${target === 1 ? "ціль" : "цілей"}`, target, metric:"completedGoals", unit:"ціл."
    }))
  }
];

export function getAchievementMetrics(state) {
  const stats = calculateStatistics(state);
  const time = getTimeTotals(state);
  return {
    closedDays: stats.closedDays,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalBonuses: stats.totalBonuses,
    careerSeconds: time.totals.career || 0,
    germanSeconds: time.totals.german || 0,
    completedGoals: state.goals.filter(goal => Number(goal.current) >= Number(goal.target)).length
  };
}

export function refreshAchievements(state) {
  if (!state.achievements || typeof state.achievements !== "object") state.achievements = { unlocked: {} };
  if (!state.achievements.unlocked || typeof state.achievements.unlocked !== "object") state.achievements.unlocked = {};
  const metrics = getAchievementMetrics(state);
  const newlyUnlocked = [];
  ACHIEVEMENT_GROUPS.flatMap(group => group.achievements).forEach(item => {
    if (metrics[item.metric] >= item.target && !state.achievements.unlocked[item.id]) {
      state.achievements.unlocked[item.id] = new Date().toISOString();
      newlyUnlocked.push(item);
    }
  });
  return { metrics, newlyUnlocked };
}

export function getAchievementProgress(state) {
  const metrics = getAchievementMetrics(state);
  const unlocked = state.achievements?.unlocked || {};
  return ACHIEVEMENT_GROUPS.map(group => ({
    ...group,
    achievements: group.achievements.map(item => ({
      ...item,
      current: Math.max(0, Number(metrics[item.metric]) || 0),
      unlockedAt: unlocked[item.id] || null,
      percentage: Math.min(100, Math.round((Math.max(0, Number(metrics[item.metric]) || 0) / item.target) * 100))
    }))
  }));
}

export function getNextStreakMilestone(streak) {
  const targets = [3, 7, 14, 30, 100, 365];
  return targets.find(target => target > streak) || null;
}
