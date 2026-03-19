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

  // ✅ FIX: Wrapped getRedirectResult with safety check for Expo dev environment
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        // Check if getRedirectResult is actually available (might not be in Expo dev)
        if (typeof getRedirectResult === 'function') {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            await saveUserToFirestore(result.user);
          }
        }
      } catch (error: any) {
        // Silently fail - this is expected in Expo dev environment
        console.debug('Redirect result check skipped (Expo dev):', error?.code);
      }
    };

    handleRedirectResult();
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
    console.log('🔐 Login attempt starting...');
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      try {
        console.log('🔐 Attempting signInWithPopup...');
        const result = await signInWithPopup(auth, provider);
        console.log('🔐 Sign-in successful for:', result.user.email);
        await saveUserToFirestore(result.user);
      } catch (popupError: any) {
        console.log('🔐 Sign-in error code:', popupError?.code);
        console.log('🔐 Sign-in error message:', popupError?.message);
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          console.log('🔐 Popup blocked/closed — falling back to guest mode');
          continueAsGuest();
        } else if (
          popupError.code === 'auth/operation-not-supported-in-this-environment' ||
          popupError.code === 'auth/invalid-oauth-provider'
        ) {
          console.log('🔐 Auth not supported in this environment — falling back to guest mode');
          continueAsGuest();
        } else {
          console.error('🔐 Unexpected sign-in error:', popupError);
          continueAsGuest();
        }
      }
    } catch (err: any) {
      console.error('🔐 Login error:', err?.code, err?.message);
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