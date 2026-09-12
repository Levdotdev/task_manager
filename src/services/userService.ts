// src/services/userService.ts
import { db, auth } from '@/firebase';
import { ref as databaseRef, get, set, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';

const STARTING_OJT_HOURS = 486;

export interface UserRecord {
  displayName: string;
  email: string;
  hoursRemaining: number;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureUserRecord(result.user.uid, result.user.displayName ?? '', result.user.email ?? '');
  return result.user;
}

export function logout() {
  return firebaseSignOut(auth);
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