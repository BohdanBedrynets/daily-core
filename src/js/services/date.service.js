export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatHistoryDate(dateKey) {
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parseDateKey(dateKey));
}
