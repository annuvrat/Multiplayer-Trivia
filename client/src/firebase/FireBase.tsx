import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type FirebaseGoogleUser = {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  idToken: string;
};

export async function signInWithGooglePopup(): Promise<FirebaseGoogleUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    uid: user.uid,
    name: user.displayName ?? "Player",
    email: user.email ?? "",
    photoURL: user.photoURL,
    idToken,
  };
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function getFreshIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function onFirebaseAuthStateChange(
  callback: (user: FirebaseGoogleUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    const idToken = await user.getIdToken();
    callback({
      uid: user.uid,
      name: user.displayName ?? "Player",
      email: user.email ?? "",
      photoURL: user.photoURL,
      idToken,
    });
  });
}

