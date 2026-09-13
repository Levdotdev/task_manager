import { db, auth } from '@/firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { ref as databaseRef, get, set, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';

const STARTING_OJT_HOURS = 486;
let nativeGoogleInitialization: Promise<void> | undefined;

async function initializeNativeGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    throw Object.assign(new Error('The Android app needs its Google web client ID.'), { code: 'auth/native-not-configured' });
  }
  if (!nativeGoogleInitialization) {
    nativeGoogleInitialization = GoogleSignIn.initialize({ clientId }).catch((error) => {
      nativeGoogleInitialization = undefined;
      throw error;
    });
  }
  await nativeGoogleInitialization;
}

export interface UserRecord {
  displayName: string;
  email: string;
  hoursRemaining: number;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  let result;
  if (Capacitor.getPlatform() === 'android') {
    // The native picker returns a token to this WebView; no browser sessionStorage handoff is needed.
    await initializeNativeGoogle();
    const { idToken } = await GoogleSignIn.signIn();
    if (!idToken) {
      throw Object.assign(new Error('Google did not return an ID token.'), { code: 'auth/invalid-credential' });
    }
    result = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } else {
    result = await signInWithPopup(auth, new GoogleAuthProvider());
  }
  await ensureUserRecord(result.user.uid, result.user.displayName ?? '', result.user.email ?? '');
  return result.user;
}

export async function logout() {
  // Firebase owns the app session and drives the login screen immediately.
  await firebaseSignOut(auth);
  if (Capacitor.getPlatform() === 'android') {
    try {
      await initializeNativeGoogle();
      await GoogleSignIn.signOut();
    } catch {
      // Credential-provider cleanup cannot turn a completed Firebase sign-out into a failure.
    }
  }
}

async function ensureUserRecord(uid: string, displayName: string, email: string) {
  const userRef = databaseRef(db, `users/${uid}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    await set(userRef, { displayName, email, hoursRemaining: STARTING_OJT_HOURS });
  }
}

export function subscribeToUserRecord(uid: string, callback: (record: UserRecord | null) => void): Unsubscribe {
  return onValue(databaseRef(db, `users/${uid}`), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as UserRecord) : null);
  });
}

export async function logHoursRendered(uid: string, hours: number) {
  const userRef = databaseRef(db, `users/${uid}/hoursRemaining`);
  await runTransaction(userRef, (current) => {
    const remaining = typeof current === 'number' ? current : STARTING_OJT_HOURS;
    return Math.max(0, remaining - hours);
  });
}
