import { getDateKey, formatLongDate, formatHistoryDate } from "./services/date.service.js";
import { loadAppState, saveAppState, exportAppState, importAppState, normalizeState } from "./services/storage.service.js";
import { ensureDay, getTasksForDate, buildDaySummary, finalizeDay, finalizePastDays } from "./services/day.service.js";
import { calculateStatistics } from "./services/statistics.service.js";
import { getMonthMatrix, getDayCalendarStatus, shiftMonth } from "./services/calendar.service.js";
import { createGoal } from "./services/goals.service.js";
import { startTimer, pauseTimer, addManualMinutes, commitActiveTimer, getLiveSeconds, getActiveTimer, getTimeTotals, formatDuration, TIME_CATEGORIES } from "./services/time.service.js";
import { renderTaskList, renderBonusGroups, renderHistory, renderStatistics, renderDayDetails, renderGoals, renderBonusEditor, renderMonthlyTimeStats, renderAchievements, renderAnnualReport } from "./ui/render.js";
import { updateDayStatus, updateBonusStatus } from "./ui/status.js";
import { refreshAchievements, getAchievementProgress, getAchievementMetrics, getNextStreakMilestone, ACHIEVEMENT_GROUPS } from "./services/achievements.service.js";
import { getReportYears, buildAnnualReport } from "./services/annual-report.service.js";
import { createSyncService } from "./services/sync.service.js";

const $ = id => document.getElementById(id);
const elements = {
  currentDate: $("currentDate"), dayStatus: $("dayStatus"), bodyNote: $("bodyNote"), careerTasks: $("careerTasks"), germanTasks: $("germanTasks"), bodyTasks: $("bodyTasks"), morningHygieneTasks: $("morningHygieneTasks"), eveningHygieneTasks: $("eveningHygieneTasks"), bonusGroups: $("bonusGroups"), bonusStatus: $("bonusStatus"), dayNote: $("dayNote"), noteSaved: $("noteSaved"),
  careerTimerValue: $("careerTimerValue"), germanTimerValue: $("germanTimerValue"), careerTodayTime: $("careerTodayTime"), germanTodayTime: $("germanTodayTime"), careerTimerToggle: $("careerTimerToggle"), germanTimerToggle: $("germanTimerToggle"), activeTimerStatus: $("activeTimerStatus"),
  historyList: $("historyList"), categoryStats: $("categoryStats"), closedDaysStat: $("closedDaysStat"), currentStreakStat: $("currentStreakStat"), longestStreakStat: $("longestStreakStat"), totalBonusesStat: $("totalBonusesStat"), careerTotalTimeStat: $("careerTotalTimeStat"), germanTotalTimeStat: $("germanTotalTimeStat"), monthlyTimeStats: $("monthlyTimeStats"),
  todayCurrentStreak: $("todayCurrentStreak"), todayLongestStreak: $("todayLongestStreak"), streakNextLabel: $("streakNextLabel"), streakNextValue: $("streakNextValue"), streakProgressBar: $("streakProgressBar"),
  achievementsList: $("achievementsList"), unlockedAchievementsStat: $("unlockedAchievementsStat"), achievementCurrentStreak: $("achievementCurrentStreak"), achievementLongestStreak: $("achievementLongestStreak"), annualReportYear: $("annualReportYear"), printAnnualReport: $("printAnnualReport"), annualReportContent: $("annualReportContent"),
  calendarTitle: $("calendarTitle"), calendarGrid: $("calendarGrid"), prevMonth: $("prevMonth"), nextMonth: $("nextMonth"), goalsList: $("goalsList"), goalForm: $("goalForm"), goalTitle: $("goalTitle"), goalCurrent: $("goalCurrent"), goalTarget: $("goalTarget"),
  quickThemeToggle: $("quickThemeToggle"), syncStatus: $("syncStatus"), syncUser: $("syncUser"), syncMessage: $("syncMessage"), syncLastTime: $("syncLastTime"), syncSignIn: $("syncSignIn"), syncSignOut: $("syncSignOut"), syncNow: $("syncNow"), syncDownload: $("syncDownload"), themeSelector: $("themeSelector"), themeMessage: $("themeMessage"), themeColorMeta: $("themeColorMeta"), installAppButton: $("installAppButton"), pwaMessage: $("pwaMessage"), exportButton: $("exportButton"), importButton: $("importButton"), importFile: $("importFile"), dataMessage: $("dataMessage"), bonusEditor: $("bonusEditor"), addBonusGroup: $("addBonusGroup"), dayDialog: $("dayDialog"), dialogDate: $("dialogDate"), dayDetails: $("dayDetails"), closeDialog: $("closeDialog"), tabButtons: document.querySelectorAll(".tab-button"), tabPanels: document.querySelectorAll(".tab-panel")
};

let state = loadAppState();
let activeDateKey = getDateKey();
const now = new Date();
let calendarView = { year: now.getFullYear(), monthIndex: now.getMonth() };
let noteTimer;
let deferredInstallPrompt = null;
let syncService = null;
let lastSyncAt = null;

const saveLocalOnly = () => saveAppState(state);
const save = ({ sync = true, touch = true } = {}) => {
  if (touch) {
    state.meta = { ...(state.meta || {}), updatedAt: new Date().toISOString() };
  }
  saveAppState(state);
  if (sync) syncService?.scheduleUpload();
};
const activeDay = () => ensureDay(state, activeDateKey);

function formatSyncTime(value) {
  if (!value) return "Ще не синхронізовано";
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function renderSyncStatus(info = {}) {
  const signedIn = Boolean(info.user);
  const labels = {
    "not-configured": "Не налаштовано",
    initializing: "Підключення…",
    connecting: "Підключення…",
    syncing: "Синхронізація…",
    synced: "Синхронізовано",
    "cloud-newer": "Потрібна увага",
    offline: "Офлайн",
    error: "Помилка",
    "signed-out": "Не виконано вхід"
  };
  if (info.lastSyncAt) lastSyncAt = info.lastSyncAt;
  if (elements.syncStatus) {
    elements.syncStatus.textContent = labels[info.status] || "Хмара";
    elements.syncStatus.dataset.status = info.status || "unknown";
  }
  if (elements.syncUser) {
    elements.syncUser.textContent = signedIn
      ? `${info.user.displayName || "Google"}${info.user.email ? ` · ${info.user.email}` : ""}`
      : "Обліковий запис не підключено";
  }
  if (elements.syncMessage) elements.syncMessage.textContent = info.message || "";
  if (elements.syncLastTime) elements.syncLastTime.textContent = formatSyncTime(lastSyncAt);
  if (elements.syncSignIn) elements.syncSignIn.hidden = signedIn;
  if (elements.syncSignOut) elements.syncSignOut.hidden = !signedIn;
  if (elements.syncNow) elements.syncNow.disabled = !signedIn;
  if (elements.syncDownload) elements.syncDownload.disabled = !signedIn;
}

async function applyRemoteState(remoteState) {
  commitActiveTimer(state);
  state = normalizeState(remoteState);
  activeDateKey = getDateKey();
  state.activeDate = activeDateKey;
  ensureDay(state, activeDateKey);
  save({ sync: false, touch: false });
  renderAll();
}

function getResolvedTheme(choice = state.preferences?.theme || "system") {
  return choice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
}

function applyTheme(choice = state.preferences?.theme || "system", shouldSave = false) {
  const normalized = ["light", "dark", "system"].includes(choice) ? choice : "system";
  state.preferences = { ...(state.preferences || {}), theme: normalized };
  const resolved = getResolvedTheme(normalized);
  document.documentElement.dataset.theme = resolved;
  elements.themeColorMeta?.setAttribute("content", resolved === "dark" ? "#0b1120" : "#f4f7fb");
  if (elements.quickThemeToggle) {
    elements.quickThemeToggle.textContent = resolved === "dark" ? "☀" : "☾";
    elements.quickThemeToggle.title = resolved === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему";
  }
  elements.themeSelector?.querySelectorAll("[data-theme-choice]").forEach(button => {
    const active = button.dataset.themeChoice === normalized;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (elements.themeMessage) {
    const labels = { light: "Світла тема активна.", dark: "Темна тема активна.", system: `Системна тема: зараз ${resolved === "dark" ? "темна" : "світла"}.` };
    elements.themeMessage.textContent = labels[normalized];
  }
  if (shouldSave) save();
}

function handleTaskChange(id, checked) {
  const day = activeDay();
  day.checks[id] = checked;
  day.updatedAt = new Date().toISOString();
  day.finalized = false;
  day.summary = null;
  save();
  updateCurrentStatus();
  renderStatisticsTab();
  renderCalendar();
  renderAchievementsTab();
  renderStreakSummary();
}

function updateCurrentStatus() {
  const summary = buildDaySummary(activeDay(), state.bonusGroups);
  updateDayStatus(elements.dayStatus, summary);
  updateBonusStatus(elements.bonusStatus, summary.bonusCount);
}

function renderTimerDisplay() {
  const current = new Date();
  const active = getActiveTimer(state);
  for (const category of Object.keys(TIME_CATEGORIES)) {
    const seconds = getLiveSeconds(state, activeDateKey, category, current);
    const value = elements[`${category}TimerValue`];
    const today = elements[`${category}TodayTime`];
    const toggle = elements[`${category}TimerToggle`];
    const card = document.querySelector(`[data-time-category="${category}"]`);
    const running = active?.category === category;
    if (value) value.textContent = formatDuration(seconds, true);
    if (today) today.textContent = `Сьогодні: ${formatDuration(seconds)}`;
    if (toggle) toggle.textContent = running ? "⏸ Пауза" : "▶ Почати";
    card?.classList.toggle("is-running", running);
  }
  if (active) {
    elements.activeTimerStatus.textContent = `Працює: ${TIME_CATEGORIES[active.category]}`;
    elements.activeTimerStatus.classList.add("is-running");
  } else {
    elements.activeTimerStatus.textContent = "Таймер не запущено";
    elements.activeTimerStatus.classList.remove("is-running");
  }
}

function toggleTimer(category) {
  const active = getActiveTimer(state);
  if (active?.category === category) pauseTimer(state);
  else startTimer(state, category);
  save();
  renderTimerDisplay();
  renderStatisticsTab();
  renderAchievementsTab();
}

function addTime(category, minutes) {
  if (!addManualMinutes(state, activeDateKey, category, minutes)) return;
  save();
  renderTimerDisplay();
  renderStatisticsTab();
  renderAchievementsTab();
}

function updateAchievements() {
  const result = refreshAchievements(state);
  if (result.newlyUnlocked.length) save();
  return result;
}

function renderStreakSummary() {
  const metrics = getAchievementMetrics(state);
  const current = metrics.currentStreak;
  const next = getNextStreakMilestone(current);
  elements.todayCurrentStreak.textContent = `${current} днів`;
  elements.todayLongestStreak.textContent = `${metrics.longestStreak} днів`;
  if (next) {
    elements.streakNextLabel.textContent = `Наступна ціль: ${next} днів`;
    elements.streakNextValue.textContent = `${current} / ${next}`;
    elements.streakProgressBar.style.width = `${Math.min(100, Math.round(current / next * 100))}%`;
  } else {
    elements.streakNextLabel.textContent = "Максимальна серія досягнень отримана";
    elements.streakNextValue.textContent = `${current} днів`;
    elements.streakProgressBar.style.width = "100%";
  }
}

function renderAchievementsTab() {
  updateAchievements();
  const groups = getAchievementProgress(state);
  const all = groups.flatMap(group => group.achievements);
  const metrics = getAchievementMetrics(state);
  elements.unlockedAchievementsStat.textContent = `${all.filter(item => item.unlockedAt).length} / ${all.length}`;
  elements.achievementCurrentStreak.textContent = `${metrics.currentStreak} днів`;
  elements.achievementLongestStreak.textContent = `${metrics.longestStreak} днів`;
  renderAchievements(elements.achievementsList, groups);
}

function renderToday() {
  const day = activeDay();
  const tasks = getTasksForDate(activeDateKey, state.bonusGroups);
  elements.currentDate.textContent = formatLongDate();
  elements.bodyNote.textContent = tasks.bodyNote;
  renderTaskList(elements.careerTasks, tasks.career, day.checks, handleTaskChange);
  renderTaskList(elements.germanTasks, tasks.german, day.checks, handleTaskChange);
  renderTaskList(elements.bodyTasks, tasks.body, day.checks, handleTaskChange);
  renderTaskList(elements.morningHygieneTasks, tasks.hygiene.morning, day.checks, handleTaskChange);
  renderTaskList(elements.eveningHygieneTasks, tasks.hygiene.evening, day.checks, handleTaskChange);
  renderBonusGroups(elements.bonusGroups, state.bonusGroups, day.checks, handleTaskChange);
  elements.dayNote.value = day.note || "";
  updateCurrentStatus();
  renderTimerDisplay();
  renderStreakSummary();
}

function renderStatisticsTab() {
  const stats = calculateStatistics(state);
  const time = getTimeTotals(state);
  elements.closedDaysStat.textContent = `${stats.closedDays} / ${stats.totalDays}`;
  elements.currentStreakStat.textContent = `${stats.currentStreak} днів`;
  elements.longestStreakStat.textContent = `${stats.longestStreak} днів`;
  elements.totalBonusesStat.textContent = String(stats.totalBonuses);
  elements.careerTotalTimeStat.textContent = formatDuration(time.totals.career);
  elements.germanTotalTimeStat.textContent = formatDuration(time.totals.german);
  renderMonthlyTimeStats(elements.monthlyTimeStats, time.byMonth);
  renderStatistics(elements.categoryStats, stats.categories);
}

function openDayDetails(dateKey) {
  const day = state.days[dateKey] || ensureDay(state, dateKey);
  elements.dialogDate.textContent = formatHistoryDate(dateKey);
  renderDayDetails(elements.dayDetails, day, state);
  elements.dayDialog.showModal();
}

function renderHistoryTab() { renderHistory(elements.historyList, state, openDayDetails); }

function renderCalendar() {
  elements.calendarTitle.textContent = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(new Date(calendarView.year, calendarView.monthIndex, 1));
  elements.calendarGrid.innerHTML = "";
  getMonthMatrix(calendarView.year, calendarView.monthIndex).forEach(date => {
    if (!date) {
      const blank = document.createElement("span");
      blank.className = "calendar-day calendar-day--blank";
      elements.calendarGrid.append(blank);
      return;
    }
    const status = getDayCalendarStatus(state, date);
    const key = getDateKey(date);
    const button = document.createElement("button");
    button.className = `calendar-day calendar-day--${status}`;
    button.textContent = String(date.getDate());
    button.title = status === "future" ? "Майбутній день" : "Відкрити деталі";
    if (status !== "future") button.onclick = () => openDayDetails(key);
    elements.calendarGrid.append(button);
  });
}

function renderAnnualReportTab() {
  commitActiveTimer(state);
  const years = getReportYears(state);
  const currentSelection = Number(elements.annualReportYear.value) || years[0];
  elements.annualReportYear.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join("");
  elements.annualReportYear.value = String(years.includes(currentSelection) ? currentSelection : years[0]);
  renderAnnualReport(elements.annualReportContent, buildAnnualReport(state, Number(elements.annualReportYear.value)));
}

function renderGoalsTab() {
  renderGoals(elements.goalsList, state.goals, (id, current) => {
    const goal = state.goals.find(item => item.id === id);
    if (goal) { goal.current = current; save(); renderGoalsTab(); renderAchievementsTab(); }
  }, id => {
    if (confirm("Видалити цю ціль?")) { state.goals = state.goals.filter(goal => goal.id !== id); save(); renderGoalsTab(); }
  });
}

function renderBonusEditorTab() {
  renderBonusEditor(elements.bonusEditor, state.bonusGroups, {
    renameGroup: (id, title) => { const group = state.bonusGroups.find(item => item.id === id); if (group && title.trim()) { group.title = title.trim(); group.tasks.forEach(task => task.category = group.title); save(); renderToday(); } },
    deleteGroup: id => { if (confirm("Видалити категорію та всі її завдання?")) { state.bonusGroups = state.bonusGroups.filter(group => group.id !== id); save(); renderBonusEditorTab(); renderToday(); } },
    addTask: (id, label) => { const group = state.bonusGroups.find(item => item.id === id); if (group && label.trim()) { group.tasks.push({ id: `bonus-${id}-${Date.now()}`, label: label.trim(), category: group.title }); save(); renderBonusEditorTab(); renderToday(); } },
    renameTask: (groupId, taskId, label) => { const task = state.bonusGroups.find(group => group.id === groupId)?.tasks.find(item => item.id === taskId); if (task && label.trim()) { task.label = label.trim(); save(); renderToday(); } },
    deleteTask: (groupId, taskId) => { const group = state.bonusGroups.find(item => item.id === groupId); if (group) { group.tasks = group.tasks.filter(task => task.id !== taskId); save(); renderBonusEditorTab(); renderToday(); } }
  });
}

function switchTab(name) {
  elements.tabPanels.forEach(panel => panel.hidden = panel.id !== `${name}Tab`);
  elements.tabButtons.forEach(button => button.classList.toggle("is-active", button.dataset.tab === name));
  if (name === "statistics") renderStatisticsTab();
  if (name === "calendar") renderCalendar();
  if (name === "goals") renderGoalsTab();
  if (name === "achievements") renderAchievementsTab();
  if (name === "annual-report") renderAnnualReportTab();
  if (name === "history") renderHistoryTab();
  if (name === "settings") renderBonusEditorTab();
}

function downloadBackup() {
  commitActiveTimer(state);
  const blob = new Blob([exportAppState(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yadro-dnya-backup-${getDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  save();
  elements.dataMessage.textContent = "Резервну копію створено.";
}

async function handleImport(file) {
  try {
    const imported = importAppState(await file.text());
    if (!confirm("Замінити поточні дані даними з резервної копії?")) return;
    state = imported;
    activeDateKey = getDateKey();
    state.activeDate = activeDateKey;
    ensureDay(state, activeDateKey);
    save();
    renderAll();
    elements.dataMessage.textContent = "Дані успішно відновлено.";
  } catch (error) {
    elements.dataMessage.textContent = `Помилка імпорту: ${error.message}`;
  } finally { elements.importFile.value = ""; }
}

function closeCurrentDayIfNeeded() {
  const nowKey = getDateKey();
  if (nowKey === activeDateKey) return;
  commitActiveTimer(state);
  const previous = activeDay();
  if (!previous.finalized) finalizeDay(previous, state.bonusGroups);
  activeDateKey = nowKey;
  state.activeDate = nowKey;
  finalizePastDays(state, nowKey);
  ensureDay(state, nowKey);
  save();
  renderAll();
}

function renderAll() {
  applyTheme();
  renderToday();
  renderStatisticsTab();
  renderCalendar();
  renderGoalsTab();
  renderAchievementsTab();
  renderAnnualReportTab();
  renderHistoryTab();
  renderBonusEditorTab();
}

function bindEvents() {
  elements.tabButtons.forEach(button => button.onclick = () => switchTab(button.dataset.tab));
  elements.prevMonth.onclick = () => { calendarView = shiftMonth(calendarView.year, calendarView.monthIndex, -1); renderCalendar(); };
  elements.nextMonth.onclick = () => { calendarView = shiftMonth(calendarView.year, calendarView.monthIndex, 1); renderCalendar(); };
  elements.closeDialog.onclick = () => elements.dayDialog.close();
  elements.dayDialog.onclick = event => { if (event.target === elements.dayDialog) elements.dayDialog.close(); };
  elements.dayNote.addEventListener("input", () => {
    clearTimeout(noteTimer);
    elements.noteSaved.textContent = "Зберігаю…";
    noteTimer = setTimeout(() => { const day = activeDay(); day.note = elements.dayNote.value; day.updatedAt = new Date().toISOString(); save(); elements.noteSaved.textContent = "Збережено"; }, 350);
  });
  elements.goalForm.onsubmit = event => { event.preventDefault(); state.goals.push(createGoal(elements.goalTitle.value, elements.goalTarget.value, elements.goalCurrent.value)); save(); elements.goalForm.reset(); elements.goalCurrent.value = 0; elements.goalTarget.value = 100; renderGoalsTab(); renderAchievementsTab(); };
  elements.careerTimerToggle.onclick = () => toggleTimer("career");
  elements.germanTimerToggle.onclick = () => toggleTimer("german");
  document.querySelectorAll(".quick-time").forEach(button => button.onclick = () => addTime(button.dataset.category, button.dataset.minutes));
  document.querySelectorAll(".manual-time-form").forEach(form => form.onsubmit = event => { event.preventDefault(); const input = form.querySelector("input"); addTime(form.dataset.category, input.value); input.value = ""; });
  elements.quickThemeToggle.onclick = () => applyTheme(getResolvedTheme() === "dark" ? "light" : "dark", true);
  elements.themeSelector.onclick = event => { const button = event.target.closest("[data-theme-choice]"); if (button) applyTheme(button.dataset.themeChoice, true); };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (state.preferences?.theme === "system") applyTheme("system"); });
  elements.annualReportYear.onchange = renderAnnualReportTab;
  elements.printAnnualReport.onclick = () => { document.body.classList.add("printing-annual-report"); window.print(); setTimeout(() => document.body.classList.remove("printing-annual-report"), 300); };
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-annual-report"));
  elements.syncSignIn.onclick = async () => {
    try { await syncService.signIn(); }
    catch (error) { renderSyncStatus({ status: "error", message: `Не вдалося увійти: ${error.message}` }); }
  };
  elements.syncSignOut.onclick = async () => {
    try { await syncService.signOut(); }
    catch (error) { renderSyncStatus({ status: "error", message: `Не вдалося вийти: ${error.message}` }); }
  };
  elements.syncNow.onclick = async () => {
    try { await syncService.uploadNow(); }
    catch (error) { renderSyncStatus({ status: "error", user: syncService.getUser(), message: `Помилка синхронізації: ${error.message}` }); }
  };
  elements.syncDownload.onclick = async () => {
    if (!confirm("Замінити локальні дані останньою копією з хмари?")) return;
    try { await syncService.downloadNow({ force: true }); }
    catch (error) { renderSyncStatus({ status: "error", user: syncService.getUser(), message: `Не вдалося завантажити дані: ${error.message}` }); }
  };
  elements.installAppButton.onclick = installPwa;
  elements.exportButton.onclick = downloadBackup;
  elements.importButton.onclick = () => elements.importFile.click();
  elements.importFile.onchange = event => { if (event.target.files[0]) handleImport(event.target.files[0]); };
  elements.addBonusGroup.onclick = () => { const title = prompt("Назва нової категорії:"); if (title?.trim()) { const id = `group-${Date.now()}`; state.bonusGroups.push({ id, title: title.trim(), tasks: [] }); save(); renderBonusEditorTab(); renderToday(); } };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
  window.addEventListener("beforeunload", save);
}

function initializePwa() {
  if (!("serviceWorker" in navigator)) { elements.pwaMessage.textContent = "Цей браузер не підтримує встановлення PWA."; return; }
  navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).then(() => {
    elements.pwaMessage.textContent = window.matchMedia("(display-mode: standalone)").matches ? "Застосунок уже встановлено та працює окремо від браузера." : "Застосунок готовий до офлайн-роботи. Для встановлення відкрий меню браузера або скористайся кнопкою нижче.";
  }).catch(() => { elements.pwaMessage.textContent = "Не вдалося підготувати офлайн-режим. Відкрий застосунок через Live Server або HTTPS."; });
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt = event; elements.installAppButton.hidden = false; elements.pwaMessage.textContent = "Застосунок можна встановити на цей пристрій."; });
  window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; elements.installAppButton.hidden = true; elements.pwaMessage.textContent = "Застосунок встановлено."; });
}

async function installPwa() {
  if (!deferredInstallPrompt) { elements.pwaMessage.textContent = "Відкрий меню браузера та вибери «Встановити застосунок» або «Додати на головний екран»."; return; }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installAppButton.hidden = true;
}

function initialize() {
  applyTheme();
  initializePwa();
  activeDateKey = getDateKey();
  commitActiveTimer(state);
  finalizePastDays(state, activeDateKey);
  state.activeDate = activeDateKey;
  ensureDay(state, activeDateKey);
  refreshAchievements(state);
  save({ sync: false, touch: false });
  syncService = createSyncService({
    getState: () => state,
    applyRemoteState,
    onStatus: renderSyncStatus
  });
  bindEvents();
  syncService.initialize();
  renderAll();
  setInterval(() => { closeCurrentDayIfNeeded(); renderTimerDisplay(); }, 1000);
  setInterval(() => { if (getActiveTimer(state)) { commitActiveTimer(state); save(); } }, 60000);
}

initialize();
