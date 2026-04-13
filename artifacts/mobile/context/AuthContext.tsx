import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  role: 'admin' | 'responder' | 'guest';
  isGuest: boolean;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  userRole: string;
  isGuest: boolean;
  isLoading: boolean;
  authError: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_USER_STORAGE_KEY = 'unifyos.authUser';

function makeGuestUser(): AuthUser {
  const rand = Math.random().toString(36).slice(2, 9);
  return {
    uid: `guest_${rand}`,
    name: 'Guest User',
    email: '',
    role: 'guest',
    isGuest: true,
  };
}

async function saveUserToFirestore(user: any) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        role: 'admin',
        createdAt: new Date(),
      });
    }
  } catch {}
}

async function persistAuthUser(user: AuthUser | null) {
  try {
    if (user && !user.isGuest) {
      await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch {}
}

async function getPersistedAuthUser(): Promise<AuthUser | null> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AuthUser;
    return parsed?.uid && parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function buildAuthUser(firebaseUser: any, role: string): AuthUser {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    photo: firebaseUser.photoURL || undefined,
    role: role as 'admin' | 'responder',
    isGuest: false,
  };
}

function parseFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'responder' | 'guest'>('guest');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const loginAsGuest = useCallback(() => {
    const guest = makeGuestUser();
    setCurrentUser(guest);
    setUserRole('guest');
    setIsLoading(false);
    persistAuthUser(null);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let authUser: AuthUser;
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          const role = userSnap.exists() ? (userSnap.data().role || 'admin') : 'admin';
          authUser = buildAuthUser(firebaseUser, role);
          setCurrentUser(authUser);
          setUserRole(role as 'admin' | 'responder');
        } catch {
          authUser = buildAuthUser(firebaseUser, 'admin');
          setCurrentUser(authUser);
          setUserRole('admin');
        }
        await persistAuthUser(authUser);
        setAuthError(null);
        setIsLoading(false);
      } else {
        await persistAuthUser(null);
        setCurrentUser(null);
        setUserRole('guest');
        setIsLoading(false);
        router.replace('/');
      }
    });
    return unsub;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(parseFirebaseAuthError(err?.code || ''));
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await saveUserToFirestore(result.user);
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(parseFirebaseAuthError(err?.code || ''));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await persistAuthUser(null);
      setCurrentUser(null);
      setUserRole('guest');
      setIsLoading(false);
      router.replace('/');
      await firebaseSignOut(auth);
    } catch {
      setCurrentUser(null);
      setUserRole('guest');
      setIsLoading(false);
      router.replace('/');
    }
  }, []);

  const isGuest = currentUser?.isGuest ?? false;

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    userRole,
    isGuest,
    isLoading,
    authError,
    loginWithEmail,
    signUpWithEmail,
    loginAsGuest,
    logout,
    clearAuthError,
  }), [currentUser, userRole, isGuest, isLoading, authError, loginWithEmail, signUpWithEmail, loginAsGuest, logout, clearAuthError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
