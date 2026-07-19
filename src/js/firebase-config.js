// Встав сюди конфігурацію свого Web App із Firebase Console.
// Значення firebaseConfig не є секретним: доступ до даних захищають Firestore Rules.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const FIREBASE_ENABLED = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId
);
