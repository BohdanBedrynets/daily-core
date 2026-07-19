import { getTasksForDate, buildDaySummary } from "./day.service.js";
import { getDateKey } from "./date.service.js";
const CATEGORY_ORDER = ["Кар’єра", "Німецька", "Тіло", "Гігієна"];

function comparableDays(state) {
  const todayKey = getDateKey();
  return Object.values(state.days)
    .filter(day => day.date <= todayKey)
    .map(day => ({ day, summary: day.finalized && day.summary ? day.summary : buildDaySummary(day, state.bonusGroups) }))
    .sort((a, b) => a.day.date.localeCompare(b.day.date));
}
function currentStreak(days) {
  let index = days.length - 1;
  const todayKey = getDateKey();
  // Незакритий поточний день ще не перериває серію: вона обривається лише після завершення дня.
  if (index >= 0 && days[index].day.date === todayKey && !days[index].summary.closed && !days[index].day.finalized) index--;
  let streak = 0;
  for (let i = index; i >= 0; i--) {
    if (!days[i].summary.closed) break;
    streak++;
  }
  return streak;
}
function longestStreak(days) { let best=0, cur=0; days.forEach(x=>{cur=x.summary.closed?cur+1:0;best=Math.max(best,cur)}); return best; }
function categoryStats(days, bonusGroups) {
  const stats=Object.fromEntries(CATEGORY_ORDER.map(c=>[c,{completed:0,total:0}]));
  days.forEach(({day})=>getTasksForDate(day.date, bonusGroups).requiredTasks.forEach(task=>{
    if(!stats[task.category]) return; stats[task.category].total++; if(day.checks[task.id]) stats[task.category].completed++;
  }));
  return CATEGORY_ORDER.map(category=>({category,...stats[category],percentage:stats[category].total?Math.round(stats[category].completed/stats[category].total*100):0}));
}
export function calculateStatistics(state) {
  const days=comparableDays(state);
  return { totalDays:days.length, closedDays:days.filter(x=>x.summary.closed).length,
    currentStreak:currentStreak(days), longestStreak:longestStreak(days),
    totalBonuses:days.reduce((a,x)=>a+x.summary.bonusCount,0), categories:categoryStats(days,state.bonusGroups) };
}
