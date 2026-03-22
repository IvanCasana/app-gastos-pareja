import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDCpDDjoEJ-_stxAI_1sN7G81atjzjKYBU",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "app-gastos-pareja.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "app-gastos-pareja",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "app-gastos-pareja.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "535141164572",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:535141164572:web:1ed4a4a22ec48f9b55a1d9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
