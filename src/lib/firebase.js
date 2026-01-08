// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC-yq8-WrafQPCfSsWk6LQAIT8-h3GofyQ",
  authDomain: "actions-a8e4c.firebaseapp.com",
  projectId: "actions-a8e4c",
  storageBucket: "actions-a8e4c.firebasestorage.app",
  messagingSenderId: "209650413048",
  appId: "1:209650413048:web:249592156a9d07793cba0d",
  measurementId: "G-PQJ4G00GRH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export service agar bisa dipakai di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export App ID (Default ke "klien-demo" jika env tidak ada)
export const appId = import.meta.env.VITE_APP_ID || "klien-demo";