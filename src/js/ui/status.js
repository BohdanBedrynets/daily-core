export function updateDayStatus(
  element,
  summary
) {
  const {
    completedRequired,
    totalRequired,
    closed
  } = summary;

  element.textContent =
    closed
      ? `День закритий · ${completedRequired}/${totalRequired}`
      : `День не закритий · ${completedRequired}/${totalRequired}`;

  element.classList.toggle(
    "status--done",
    closed
  );

  element.classList.toggle(
    "status--open",
    !closed
  );
}

export function updateBonusStatus(
  element,
  bonusCount
) {
  if (bonusCount < 5) {
    element.textContent =
      `Бонусів: ${bonusCount}/5`;
    return;
  }

  if (bonusCount === 5) {
    element.textContent =
      "Бонусів: 5/5 · норма";
    return;
  }

  element.textContent =
    `Бонусів: ${bonusCount} · понад норму`;
}
