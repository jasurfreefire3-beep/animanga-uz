import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { UserProfile } from '../types.js';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google provider custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<{
  firebaseUser: FirebaseUser;
  profile: Partial<UserProfile>;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const email = user.email || '';
    const username = user.displayName?.replace(/\s+/g, '_').toLowerCase() || email.split('@')[0] || `user_${user.uid.slice(0, 6)}`;
    const isAdmin = email.toLowerCase() === 'user321admin@gmail.com' || email.toLowerCase().includes('admin');

    const profileData: Partial<UserProfile> = {
      username,
      name: user.displayName || username,
      avatar_url: user.photoURL || 'https://files.catbox.moe/g244x0.jpg',
      isAdmin,
    };

    // Sync to Firestore
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        userId: user.uid,
        username: profileData.username,
        name: profileData.name,
        email: user.email,
        avatar_url: profileData.avatar_url,
        auth_provider: 'google',
        isAdmin,
        last_login: new Date().toISOString()
      }, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore user doc sync error:', dbErr);
    }

    return { firebaseUser: user, profile: profileData };
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      // User closed or cancelled popup window intentionally
      throw err;
    }
    console.error('Google Sign-In Error:', err);
    throw err;
  }
}

export interface TelegramAuthData {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  phone_number?: string;
  phone?: string;
  auth_date?: number;
  hash?: string;
}

/**
 * Handle Telegram Authentication & Firestore Sync
 */
export async function authenticateWithTelegram(data: TelegramAuthData): Promise<Partial<UserProfile>> {
  const rawUsername = data.username ? data.username.replace(/^@/, '').trim() : '';
  const username = rawUsername || `tg_${data.first_name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || username;
  const avatarUrl = data.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
  const phone = data.phone_number || data.phone || '';
  const isAdmin = (username.toLowerCase() === 'admin' || String(data.id) === '8978777660' || username.toLowerCase() === 'user321admin');

  const profileData: Partial<UserProfile> = {
    username,
    name: fullName,
    avatar_url: avatarUrl,
    phone,
    telegram_id: data.id,
    isAdmin,
  };

  try {
    const userDocRef = doc(db, 'users', `tg_${data.id}`);
    await setDoc(userDocRef, {
      userId: `tg_${data.id}`,
      telegramId: data.id,
      username,
      name: fullName,
      avatar_url: avatarUrl,
      phone,
      auth_provider: 'telegram',
      isAdmin,
      last_login: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.warn('Firestore Telegram sync error:', dbErr);
  }

  return profileData;
}
