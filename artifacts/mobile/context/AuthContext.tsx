import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
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
  loginForAuthWindow: () => Promise<void>;
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

function isRunningInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

function isAuthWindowContext(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('__auth') === '1';
  } catch {
    return false;
  }
}

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

async function runSignInWithPopup(): Promise<{ success: boolean; error?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    console.log('🔐 Attempting signInWithPopup...');
    const result = await signInWithPopup(auth, provider);
    console.log('🔐 Sign-in successful for:', result.user.email);
    await saveUserToFirestore(result.user);
    return { success: true };
  } catch (err: any) {
    console.log('🔐 Sign-in error code:', err?.code);
    console.log('🔐 Sign-in error message:', err?.message);
    return { success: false, error: err?.code };
  }
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
    const handleRedirectResult = async () => {
      try {
        if (typeof getRedirectResult === 'function') {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            await saveUserToFirestore(result.user);
          }
        }
      } catch (error: any) {
        console.debug('🔐 Redirect result check skipped:', error?.code);
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

        if (Platform.OS === 'web' && isAuthWindowContext()) {
          console.log('🔐 Auth window: sign-in complete, closing window...');
          setTimeout(() => {
            try { window.close(); } catch {}
          }, 300);
        }
      } else {
        continueAsGuest();
      }
    });
    return unsub;
  }, [continueAsGuest]);

  const login = useCallback(async () => {
    console.log('🔐 Login attempt starting...');

    if (Platform.OS === 'web' && isRunningInIframe()) {
      console.log('🔐 Detected iframe context — opening new auth window');
      try {
        const baseUrl = window.location.href.split('?')[0].replace(/#.*$/, '');
        const authUrl = `${baseUrl}?__auth=1`;
        const authWin = window.open(
          authUrl,
          'unifyos_google_auth',
          'width=520,height=680,left=200,top=80,resizable=yes,scrollbars=yes'
        );
        if (authWin) {
          console.log('🔐 Auth window opened at:', authUrl);
          authWin.focus();
          return;
        }
        console.log('🔐 Could not open auth window (blocked?) — trying direct sign-in');
      } catch (e) {
        console.log('🔐 window.open failed, trying direct sign-in', e);
      }
    }

    setIsLoading(true);
    const { success, error } = await runSignInWithPopup();
    if (!success) {
      console.log('🔐 Sign-in failed, falling back to guest. Error:', error);
      continueAsGuest();
    }
    setIsLoading(false);
  }, [continueAsGuest]);

  const loginForAuthWindow = useCallback(async () => {
    console.log('🔐 Auth window: starting sign-in...');
    setIsLoading(true);
    const { success, error } = await runSignInWithPopup();
    if (!success) {
      console.log('🔐 Auth window sign-in failed:', error);
      setIsLoading(false);
      if (error === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : '';
        throw new Error(
          `Domain not authorized in Firebase.\n\nAdd "${domain}" to:\nFirebase Console → Authentication → Settings → Authorized Domains`
        );
      }
      if (error === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      }
      if (error !== 'auth/popup-closed-by-user' && error !== 'auth/cancelled-popup-request') {
        throw new Error(`Sign-in error: ${error}`);
      }
    }
  }, []);

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
    loginForAuthWindow,
    logout,
    continueAsGuest,
  }), [currentUser, userRole, isDemo, isLoading, login, loginForAuthWindow, logout, continueAsGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
