# Daily Core

A personal productivity Progressive Web App for building a stable daily routine, tracking focused work, and reviewing long-term progress.

Daily Core works offline, stores data locally, can be installed as an app, and supports optional cloud synchronization through Firebase.

## Features

- Daily core tasks with completion tracking
- Automatic day creation and history
- Current and longest streaks
- Career and German study time tracking
- Manual time entries and persistent timers
- Bonus tasks and editable daily notes
- Goals with progress tracking
- Statistics and monthly summaries
- Achievement system
- Annual reports with PDF export
- Light, dark, and system themes
- JSON backup and restore
- Installable PWA with offline support
- Optional Google sign-in and Firestore synchronization

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript with ES modules
- Local Storage
- Service Worker and Web App Manifest
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

## Project Structure

```text
.
├── assets/
│   └── icons/
├── src/
│   ├── css/
│   └── js/
│       ├── config/
│       ├── services/
│       └── ui/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── firebase.json
├── firestore.rules
└── SETUP_FIREBASE.md
```

## Local Development

The project does not require a build step.

1. Clone the repository:

```bash
git clone https://github.com/BohdanBedrynets/daily-core.git
cd daily-core
```

2. Open the folder in VS Code.
3. Start `index.html` with the Live Server extension.
4. Open the local address shown by Live Server.

Do not open `index.html` directly through `file://`. Service workers and PWA features require `localhost` or HTTPS.

## Firebase Setup

Cloud synchronization is optional. The application works locally without Firebase.

To enable synchronization:

1. Create a Firebase project.
2. Register a Web App.
3. Enable Google Authentication.
4. Create a Cloud Firestore database.
5. Copy the Firebase configuration into:

```text
src/js/firebase-config.js
```

6. Deploy the included Firestore security rules.
7. Deploy the app with Firebase Hosting.

Detailed instructions are available in [`SETUP_FIREBASE.md`](./SETUP_FIREBASE.md).

## Data and Privacy

Without Firebase, all application data remains in the browser's Local Storage.

When cloud synchronization is enabled:

- the user signs in through Google;
- data is stored under that user's Firebase UID;
- Firestore rules restrict access to the authenticated owner;
- the Firebase Web App configuration is public by design and is not treated as a secret.

Do not commit service-account keys, `.env` files, or other private credentials.

## Backup

Daily Core supports JSON export and import. Keeping occasional local backups is recommended even when cloud synchronization is enabled.

## PWA Installation

After opening the hosted application in a supported browser:

- on desktop, use the install icon in the browser address bar;
- on Android, open the browser menu and select **Install app** or **Add to Home screen**.

After the first successful load, the application can continue working offline.

## Current Status

The main functionality is complete. Remaining work is focused on Firebase deployment, cross-device testing, responsive interface polishing, and final portfolio presentation.