import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSK8L9V6lv5_za6-WnURgwcLZCvNrOVZI",
  authDomain: "cowmilk-1a9ed.firebaseapp.com",
  projectId: "cowmilk-1a9ed",
  storageBucket: "cowmilk-1a9ed.firebasestorage.app",
  messagingSenderId: "415957937267",
  appId: "1:415957937267:web:731809a60200287663ce06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Configure Firestore settings for better Vite compatibility
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Ensure we're online
enableNetwork(db).catch(console.error);

