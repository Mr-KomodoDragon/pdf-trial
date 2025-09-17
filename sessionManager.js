import { db, ref } from "./firebaseConfig.js";
import { get, set, remove, onValue, off, push, onDisconnect } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js";
import { createWaitingRoom } from "./waitingRoom.js";

// Generate or retrieve a persistent user ID
const userId = localStorage.getItem("userId") || "user-" + Math.random().toString(36).substr(2, 9);
if (!localStorage.getItem("userId")) {
  localStorage.setItem("userId", userId);
}

const lockRef = ref(db, "viewerLock");
const queueRef = ref(db, "queue");

export async function joinSession(onViewerReady) {
  const sessionRef = ref(db, `activeSessions/${userId}`);
  const sessionSnapshot = await get(sessionRef);

  if (sessionSnapshot.exists()) {
    return; // Handle multiple tabs later
  }

  // Register the new session
  await set(sessionRef, { time: Date.now(), tabId: userId + "-" + Date.now() });
  await onDisconnect(sessionRef).remove();

  const lockSnapshot = await get(lockRef);
  if (!lockSnapshot.exists()) {
    await set(lockRef, { user: userId, time: Date.now() });
    await onDisconnect(lockRef).remove();
    onViewerReady();
  } else {
    const newQueueItem = push(queueRef);
    await set(newQueueItem, { user: userId, time: Date.now() });
    await onDisconnect(newQueueItem).remove();
    setupQueueListeners(newQueueItem.key, onViewerReady);
  }
}

function setupQueueListeners(myQueueKey, onViewerReady) {
  const queueListener = onValue(queueRef, (snap) => {
    const root = document.getElementById("root");
    root.innerHTML = "";

    if (snap.exists()) {
      const entries = Object.entries(snap.val()).sort((a, b) => a[1].time - b[1].time);
      const totalUsers = entries.length;
      const pos = entries.findIndex(e => e[0] === myQueueKey) + 1;
      root.appendChild(createWaitingRoom(pos > 0 ? pos : null, totalUsers));
    } else {
      root.appendChild(createWaitingRoom(null, null));
    }
  });

  const lockListener = onValue(lockRef, async (snap) => {
    if (!snap.exists()) {
      const queueSnap = await get(queueRef);
      if (queueSnap.exists()) {
        const entries = Object.entries(queueSnap.val()).sort((a, b) => a[1].time - b[1].time);
        const [firstKey] = entries[0];
        if (firstKey === myQueueKey) {
          const myQueueRef = ref(db, "queue/" + myQueueKey);
          await onDisconnect(myQueueRef).cancel();
          await remove(myQueueRef);
          await set(lockRef, { user: userId, time: Date.now() });
          await onDisconnect(lockRef).remove();
          off(queueRef, queueListener);
          off(lockRef, lockListener);
          onViewerReady();
        }
      }
    }
  });

  const sessionListener = onValue(ref(db, `activeSessions/${userId}`), (snap) => {
    if (!snap.exists()) {
      off(queueRef, queueListener);
      off(lockRef, lockListener);
    }
  });

  window.addEventListener("unload", () => {
    off(queueRef, queueListener);
    off(lockRef, lockListener);
    off(ref(db, `activeSessions/${userId}`), sessionListener);
  });
}

export { userId };