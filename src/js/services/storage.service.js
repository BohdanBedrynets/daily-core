const STORAGE_KEY = "yadro-dnya-state-v7";
const LEGACY_KEYS = ["yadro-dnya-state-v6", "yadro-dnya-state-v5", "yadro-dnya-state-v4", "yadro-dnya-state-v3", "yadro-dnya-state-v2"];

export const DEFAULT_BONUS_GROUPS = [
  { id: "one-time", title: "Одноразові справи", tasks: [
    "Finanzamt / Kindergeld", "Полагодити вікно", "Банківський додаток на телефон",
    "Написати Саші за телефон", "Перейти на новий раціон",
    "Домовитися з сусідом за меблі", "Скористатися акцією Too Good To Go"
  ]},
  { id: "home", title: "Дім", tasks: ["Прибрати кімнату", "Прання"] },
  { id: "culture", title: "Культура", tasks: ["Читати 10%", "Новий альбом", "Кіно / серіал", "Комп’ютерні ігри"] },
  { id: "rest", title: "Відпочинок", tasks: ["Лежати на ліжку і нічого не робити", "Прогулянка"] },
  { id: "people", title: "Люди", tasks: ["Написати комусь", "Поговорити з кимось", "Зустріч / церква / знайомства"] }
].map(group => ({
  ...group,
  tasks: group.tasks.map((label, index) => ({
    id: `bonus-${group.id}-${index + 1}`,
    label,
    category: group.title
  }))
}));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultState() {
  return {
    version: 7,
    meta: { updatedAt: new Date().toISOString() },
    preferences: { theme: "system" },
    activeDate: null,
    days: {},
    goals: [],
    timeTracking: { activeTimer: null },
    achievements: { unlocked: {} },
    bonusGroups: clone(DEFAULT_BONUS_GROUPS)
  };
}

export function normalizeState(parsed = {}) {
  const defaults = getDefaultState();
  return {
    version: 7,
    meta: { updatedAt: parsed.meta?.updatedAt || new Date().toISOString() },
    preferences: { theme: ["light", "dark", "system"].includes(parsed.preferences?.theme) ? parsed.preferences.theme : "system" },
    activeDate: parsed.activeDate ?? null,
    days: parsed.days ?? {},
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    timeTracking: parsed.timeTracking && typeof parsed.timeTracking === "object" ? parsed.timeTracking : { activeTimer: null },
    achievements: parsed.achievements && typeof parsed.achievements === "object" ? parsed.achievements : { unlocked: {} },
    bonusGroups: Array.isArray(parsed.bonusGroups) && parsed.bonusGroups.length
      ? parsed.bonusGroups
      : defaults.bonusGroups
  };
}

export function loadAppState() {
  try {
    let rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      for (const key of LEGACY_KEYS) {
        rawState = localStorage.getItem(key);
        if (rawState) break;
      }
    }
    return rawState ? normalizeState(JSON.parse(rawState)) : getDefaultState();
  } catch (error) {
    console.error("Не вдалося прочитати localStorage:", error);
    return getDefaultState();
  }
}

export function saveAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function exportAppState(state) {
  return JSON.stringify({
    app: "Ядро дня",
    exportedAt: new Date().toISOString(),
    data: normalizeState(state)
  }, null, 2);
}

export function importAppState(rawText) {
  const parsed = JSON.parse(rawText);
  const candidate = parsed?.data ?? parsed;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Файл не містить коректних даних застосунку.");
  }
  return normalizeState(candidate);
}
