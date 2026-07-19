import { FIREBASE_CONFIG, FIREBASE_ENABLED } from "../firebase-config.js";

const SDK_VERSION = "12.16.0";
const APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;
const FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;
const DEVICE_ID_KEY = "yadro-dnya-device-id";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceLabel() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return mobile ? "Телефон" : "Комп’ютер";
}

function getStateTimestamp(state) {
  return Date.parse(state?.meta?.updatedAt || "") || 0;
}

function makeCloudSafeState(state) {
  const copy = JSON.parse(JSON.stringify(state));
  if (copy.sync) delete copy.sync;
  return copy;
}

export function createSyncService({ getState, applyRemoteState, onStatus }) {
  let auth;
  let db;
  let api;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let uploadTimer = null;
  let initializePromise = null;
  let applyingRemote = false;
  let lastCloudState = null;
  const deviceId = getDeviceId();

  const emit = (status, extra = {}) => onStatus?.({
    status,
    configured: FIREBASE_ENABLED,
    user: currentUser,
    ...extra
  });

  async function loadSdk() {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(APP_URL), import(AUTH_URL), import(FIRESTORE_URL)
    ]);
    const app = appModule.initializeApp(FIREBASE_CONFIG);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    try {
      await firestoreModule.enableMultiTabIndexedDbPersistence(db);
    } catch (error) {
      if (!['failed-precondition', 'unimplemented'].includes(error?.code)) {
        console.warn("Firestore persistence:", error);
      }
    }
    api = { ...authModule, ...firestoreModule };
  }

  function getDocumentRef() {
    if (!currentUser) throw new Error("Спочатку увійди в обліковий запис.");
    return api.doc(db, "users", currentUser.uid, "app", "state");
  }

  async function uploadNow({ force = false } = {}) {
    if (!currentUser || applyingRemote) return false;
    clearTimeout(uploadTimer);
    uploadTimer = null;
    const state = getState();
    const localTs = getStateTimestamp(state);
    const cloudTs = Date.parse(lastCloudState?.clientUpdatedAt || "") || 0;
    if (!force && cloudTs > localTs) {
      emit("cloud-newer", { message: "У хмарі є новіші дані. Завантаж їх перед відправленням локальних змін." });
      return false;
    }
    emit("syncing", { message: "Відправляю зміни…" });
    await api.setDoc(getDocumentRef(), {
      state: makeCloudSafeState(state),
      clientUpdatedAt: state.meta?.updatedAt || new Date().toISOString(),
      serverUpdatedAt: api.serverTimestamp(),
      deviceId,
      deviceLabel: getDeviceLabel(),
      schemaVersion: state.version || 7
    });
    emit("synced", { message: "Дані синхронізовано.", lastSyncAt: new Date().toISOString() });
    return true;
  }

  function scheduleUpload(delay = 1200) {
    if (!currentUser || applyingRemote) return;
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => uploadNow().catch(error => {
      console.error(error);
      emit(navigator.onLine ? "error" : "offline", { message: navigator.onLine ? `Помилка синхронізації: ${error.message}` : "Немає інтернету. Зміни залишилися на пристрої." });
    }), delay);
  }

  async function applyCloudState(cloudRecord, { force = false } = {}) {
    if (!cloudRecord?.state) return false;
    const localTs = getStateTimestamp(getState());
    const cloudTs = Date.parse(cloudRecord.clientUpdatedAt || cloudRecord.state?.meta?.updatedAt || "") || 0;
    if (!force && localTs > cloudTs) return false;
    applyingRemote = true;
    try {
      await applyRemoteState(cloudRecord.state);
      emit("synced", { message: "Отримано нові дані з хмари.", lastSyncAt: new Date().toISOString() });
      return true;
    } finally {
      applyingRemote = false;
    }
  }

  async function handleSnapshot(snapshot) {
    if (!snapshot.exists()) {
      lastCloudState = null;
      await uploadNow({ force: true });
      return;
    }
    const cloudRecord = snapshot.data();
    lastCloudState = cloudRecord;
    if (snapshot.metadata.hasPendingWrites) return;
    const localTs = getStateTimestamp(getState());
    const cloudTs = Date.parse(cloudRecord.clientUpdatedAt || cloudRecord.state?.meta?.updatedAt || "") || 0;
    if (cloudTs > localTs) await applyCloudState(cloudRecord);
    else if (localTs > cloudTs) scheduleUpload(300);
    else emit("synced", { message: "Дані синхронізовано.", lastSyncAt: new Date().toISOString() });
  }

  function subscribe() {
    unsubscribeSnapshot?.();
    unsubscribeSnapshot = api.onSnapshot(getDocumentRef(), { includeMetadataChanges: true }, snapshot => {
      handleSnapshot(snapshot).catch(error => {
        console.error(error);
        emit("error", { message: `Не вдалося прочитати хмарні дані: ${error.message}` });
      });
    }, error => {
      console.error(error);
      emit("error", { message: `Синхронізація недоступна: ${error.message}` });
    });
  }

  function initialize() {
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      if (!FIREBASE_ENABLED) {
        emit("not-configured", { message: "Firebase ще не підключено. Заповни src/js/firebase-config.js за інструкцією." });
        return;
      }
      emit("initializing", { message: "Підключаю Firebase…" });
      try {
        await loadSdk();
        api.onAuthStateChanged(auth, user => {
          currentUser = user;
          if (user) {
            emit("connecting", { message: "Підключаю хмарні дані…" });
            subscribe();
          } else {
            unsubscribeSnapshot?.();
            unsubscribeSnapshot = null;
            lastCloudState = null;
            emit("signed-out", { message: "Увійди через Google, щоб синхронізувати пристрої." });
          }
        });
      } catch (error) {
        console.error(error);
        emit("error", { message: `Не вдалося запустити Firebase: ${error.message}` });
        throw error;
      }
    })();
    return initializePromise;
  }

  async function signIn() {
    if (!FIREBASE_ENABLED) throw new Error("Спочатку додай Firebase-конфігурацію.");
    if (!auth) await initialize();
    if (!auth || !api) throw new Error("Firebase ще не готовий. Спробуй ще раз за кілька секунд.");
    const provider = new api.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await api.signInWithPopup(auth, provider);
    } catch (error) {
      if (["auth/popup-blocked", "auth/cancelled-popup-request", "auth/operation-not-supported-in-this-environment"].includes(error?.code)) {
        await api.signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  }

  async function signOut() {
    if (auth) await api.signOut(auth);
  }

  async function downloadNow({ force = false } = {}) {
    if (!currentUser) throw new Error("Спочатку увійди в обліковий запис.");
    emit("syncing", { message: "Завантажую дані…" });
    const snapshot = await api.getDocFromServer(getDocumentRef());
    if (!snapshot.exists()) {
      await uploadNow({ force: true });
      return false;
    }
    lastCloudState = snapshot.data();
    return applyCloudState(lastCloudState, { force });
  }

  return {
    initialize,
    signIn,
    signOut,
    scheduleUpload,
    uploadNow,
    downloadNow,
    isConfigured: () => FIREBASE_ENABLED,
    isSignedIn: () => Boolean(currentUser),
    getUser: () => currentUser
  };
}
