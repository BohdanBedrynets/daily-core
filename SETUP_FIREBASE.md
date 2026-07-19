# Підключення синхронізації Firebase

Код синхронізації вже є в застосунку. Потрібно один раз створити власний Firebase-проєкт і вставити його конфігурацію.

## 1. Створи Firebase-проєкт

1. Відкрий Firebase Console.
2. Натисни **Create a project**.
3. Назви його, наприклад, `yadro-dnya`.
4. Google Analytics для цього застосунку можна не вмикати.

## 2. Додай Web App

1. На головній сторінці проєкту натисни значок **Web `</>`**.
2. Назва застосунку: `Ядро дня`.
3. Firebase Hosting можна відмітити одразу або налаштувати пізніше.
4. Після реєстрації Firebase покаже об'єкт `firebaseConfig`.
5. Відкрий файл:

```text
src/js/firebase-config.js
```

6. Замінити порожні значення на значення з Firebase Console.

Приклад структури:

```js
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

Цей конфіг не є паролем. Доступ до даних обмежують Firestore Security Rules.

## 3. Увімкни Google-вхід

1. Firebase Console → **Authentication**.
2. Натисни **Get started**.
3. Вкладка **Sign-in method**.
4. Обери **Google** → **Enable**.
5. Вкажи support email і збережи.

## 4. Створи Firestore

1. Firebase Console → **Firestore Database**.
2. Натисни **Create database**.
3. Обери **Production mode**.
4. Обери найближчий регіон, наприклад один із європейських.

## 5. Завантаж правила безпеки

У корені проєкту вже лежить `firestore.rules`. Вони дозволяють кожному користувачу читати й змінювати тільки власні дані.

Через Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

Або скопіюй вміст `firestore.rules` у Firebase Console → Firestore → Rules і натисни **Publish**.

## 6. Розгорни застосунок

Google-вхід не працює на звичайному `file://`. Застосунок потрібно відкрити через HTTPS або локальний сервер.

### Firebase Hosting

У корені папки:

```bash
firebase init hosting
```

Під час налаштування:

- public directory: `.`
- single-page app: `No`
- overwrite index.html: `No`

Потім:

```bash
firebase deploy --only hosting,firestore:rules
```

Firebase покаже адресу на кшталт:

```text
https://YOUR_PROJECT.web.app
```

## 7. Дозволені домени

Firebase Console → Authentication → Settings → Authorized domains.

Переконайся, що там є:

- `localhost`
- `YOUR_PROJECT.web.app`
- `YOUR_PROJECT.firebaseapp.com`

## 8. Перше підключення пристроїв

1. Відкрий застосунок на комп'ютері.
2. `Дані` → `Увійти через Google`.
3. Поточна локальна база автоматично завантажиться в хмару, якщо хмара порожня.
4. Відкрий ту саму HTTPS-адресу на телефоні.
5. Увійди тим самим Google-акаунтом.
6. Хмарні дані завантажаться автоматично.

## Конфлікти

Синхронізація використовує правило **остання зміна перемагає** для цілого стану застосунку. Звичайна робота на одному пристрої за раз безпечна. Не варто одночасно редагувати різні дані на телефоні та комп'ютері, поки обидва пристрої офлайн.

Кнопка **Завантажити з хмари** навмисно просить підтвердження, бо повністю замінює локальну копію.
