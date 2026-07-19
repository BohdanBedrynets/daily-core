export function createGoal(title, target, current = 0) {
  return { id: `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: title.trim(), target: Number(target), current: Number(current), createdAt: new Date().toISOString() };
}
export function getGoalPercentage(goal) {
  if (!goal.target || goal.target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(goal.current / goal.target * 100)));
}
