import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiWuSwOKkY69wWUklD8m86MKB-AOs5LzM",
  authDomain: "busick-recipes.firebaseapp.com",
  projectId: "busick-recipes",
  storageBucket: "busick-recipes.firebasestorage.app",
  messagingSenderId: "960392900060",
  appId: "1:960392900060:web:3b8df6796af0bdba503319",
};

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();

export const auth = getAuth(app);
export const db = getFirestore(app);

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function signOut() {
  return fbSignOut(auth);
}
