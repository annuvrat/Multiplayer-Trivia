import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC-vCyQVrl4pyCgIDSvEOBFEqxtIWRH6ro",
    authDomain: "quizme-1db3a.firebaseapp.com",
    projectId: "quizme-1db3a",
    storageBucket: "quizme-1db3a.firebasestorage.app",
    messagingSenderId: "575346593953",
    appId: "1:575346593953:web:92f58dd58473d900fce0e0",
    measurementId: "G-KVN9DZD38X"
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

