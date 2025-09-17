// Firebase Config file
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import { getDatabase, ref } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js";

// Your Firebase credentials
const firebaseConfig = {
  apiKey: "AIzaSyBBm626ggNonKDUbYkhWG44nro2As3ZirM",
  authDomain: "pdf-trial-3019f.firebaseapp.com",
  databaseURL: "https://pdf-trial-3019f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pdf-trial-3019f",
  storageBucket: "pdf-trial-3019f.firebasestorage.app",
  messagingSenderId: "735563593398",
  appId: "1:735563593398:web:713adb8fe1a761eb6a5817"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Export db + ref
export { db, ref };