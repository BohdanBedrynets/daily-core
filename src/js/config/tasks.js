export const CORE_GROUPS = {
  career: [
    {
      id: "career-60",
      label: "60 хв",
      category: "Кар’єра"
    }
  ],

  german: [
    {
      id: "german-video",
      label: "30 хв відео",
      category: "Німецька"
    },
    {
      id: "german-cards",
      label: "Карточки",
      category: "Німецька"
    },
    {
      id: "german-album",
      label: "Новий альбом",
      category: "Німецька"
    },
    {
      id: "german-song",
      label: "Вчити пісню",
      category: "Німецька"
    },
    {
      id: "german-book",
      label: "Читати книгу",
      category: "Німецька"
    }
  ]
};

export const BODY_SCHEDULE = {
  0: {
    note: "Сьогодні: тільки 10к кроків",
    tasks: [
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      }
    ]
  },

  1: {
    note: "Сьогодні: домашнє тренування",
    tasks: [
      {
        id: "body-home-workout",
        label: "Домашнє тренування",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      },
      {
        id: "body-hang",
        label: "1 хв вис",
        category: "Тіло"
      }
    ]
  },

  2: {
    note: "Сьогодні: турнік",
    tasks: [
      {
        id: "body-pull-up",
        label: "Турнік",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      }
    ]
  },

  3: {
    note: "Сьогодні: домашнє тренування",
    tasks: [
      {
        id: "body-home-workout",
        label: "Домашнє тренування",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      },
      {
        id: "body-hang",
        label: "1 хв вис",
        category: "Тіло"
      }
    ]
  },

  4: {
    note: "Сьогодні: турнік",
    tasks: [
      {
        id: "body-pull-up",
        label: "Турнік",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      }
    ]
  },

  5: {
    note: "Сьогодні: домашнє тренування",
    tasks: [
      {
        id: "body-home-workout",
        label: "Домашнє тренування",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      },
      {
        id: "body-hang",
        label: "1 хв вис",
        category: "Тіло"
      }
    ]
  },

  6: {
    note: "Сьогодні: турнік",
    tasks: [
      {
        id: "body-pull-up",
        label: "Турнік",
        category: "Тіло"
      },
      {
        id: "body-steps",
        label: "10к кроків",
        category: "Тіло"
      }
    ]
  }
};

const MORNING_HYGIENE = [
  {
    id: "hygiene-morning-teeth",
    label: "Почистити зуби",
    category: "Гігієна"
  },
  {
    id: "hygiene-morning-wash",
    label: "Умивалка",
    category: "Гігієна"
  },
  {
    id: "hygiene-morning-nails",
    label: "Мазь для нігтів",
    category: "Гігієна"
  }
];

const EVENING_HYGIENE = [
  {
    id: "hygiene-evening-teeth",
    label: "Почистити зуби",
    category: "Гігієна"
  },
  {
    id: "hygiene-evening-wash",
    label: "Умивалка",
    category: "Гігієна"
  },
  {
    id: "hygiene-evening-nails",
    label: "Мазь для нігтів",
    category: "Гігієна"
  },
  {
    id: "hygiene-lip-balm",
    label: "Помада",
    category: "Гігієна"
  },
  {
    id: "hygiene-cream",
    label: "Крем",
    category: "Гігієна"
  }
];

export function getHygieneSchedule(dayOfWeek) {
  const morning = [...MORNING_HYGIENE];
  const evening = [...EVENING_HYGIENE];

  if ([1, 5].includes(dayOfWeek)) {
    morning.push({
      id: "hygiene-shaving",
      label: "Поголитися",
      category: "Гігієна"
    });
  }

  if ([2, 6].includes(dayOfWeek)) {
    evening.splice(2, 0, {
      id: "hygiene-acid",
      label: "Кислота",
      category: "Гігієна"
    });
  }

  return {
    morning,
    evening
  };
}

export const BONUS_GROUPS = [
  {
    id: "one-time",
    title: "Одноразові справи",
    tasks: [
      "Finanzamt / Kindergeld",
      "Полагодити вікно",
      "Банківський додаток на телефон",
      "Написати Саші за телефон",
      "Перейти на новий раціон",
      "Домовитися з сусідом за меблі",
      "Скористатися акцією Too Good To Go"
    ]
  },
  {
    id: "home",
    title: "Дім",
    tasks: [
      "Прибрати кімнату",
      "Прання"
    ]
  },
  {
    id: "culture",
    title: "Культура",
    tasks: [
      "Читати 10%",
      "Новий альбом",
      "Кіно / серіал",
      "Комп’ютерні ігри"
    ]
  },
  {
    id: "rest",
    title: "Відпочинок",
    tasks: [
      "Лежати на ліжку і нічого не робити",
      "Прогулянка"
    ]
  },
  {
    id: "people",
    title: "Люди",
    tasks: [
      "Написати комусь",
      "Поговорити з кимось",
      "Зустріч / церква / знайомства"
    ]
  }
].map(group => ({
  ...group,
  tasks: group.tasks.map((label, index) => ({
    id: `bonus-${group.id}-${index + 1}`,
    label,
    category: group.title
  }))
}));
