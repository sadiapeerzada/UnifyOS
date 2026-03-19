import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photo?: string;
  role: 'admin' | 'responder';
  isDemo: boolean;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  userRole: string;
  isDemo: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_USER: AuthUser = {
  uid: 'guest-001',
  name: 'Guest User',
  email: '',
  role: 'admin',
  isDemo: true,
};

async function saveUserToFirestore(user: any) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        role: 'admin',
        createdAt: new Date(),
      });
    }
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser>(GUEST_USER);
  const [userRole, setUserRole] = useState<'admin' | 'responder'>('admin');
  const [isLoading, setIsLoading] = useState(true);

  const continueAsGuest = useCallback(() => {
    setCurrentUser(GUEST_USER);
    setUserRole('admin');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          saveUserToFirestore(result.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          const role = userSnap.exists() ? (userSnap.data().role || 'admin') : 'admin';
          setCurrentUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            photo: firebaseUser.photoURL || undefined,
            role,
            isDemo: false,
          });
          setUserRole(role);
        } catch {
          setCurrentUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: 'admin',
            isDemo: false,
          });
        }
        setIsLoading(false);
      } else {
        continueAsGuest();
      }
    });
    return unsub;
  }, [continueAsGuest]);

  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      try {
        const result = await signInWithPopup(auth, provider);
        await saveUserToFirestore(result.user);
      } catch (popupError: any) {
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          continueAsGuest();
        } else {
          console.error('Sign in error:', popupError);
          continueAsGuest();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      continueAsGuest();
    } finally {
      setIsLoading(false);
    }
  }, [continueAsGuest]);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      continueAsGuest();
    }
  }, [continueAsGuest]);

  const isDemo = currentUser.isDemo;

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    userRole,
    isDemo,
    isLoading,
    login,
    logout,
    continueAsGuest,
  }), [currentUser, userRole, isDemo, isLoading, login, logout, continueAsGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
