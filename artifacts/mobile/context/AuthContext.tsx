import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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
  authError: string | null;
  login: () => void;
  loginForAuthWindow: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  clearAuthError: () => void;
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

function buildAuthUser(firebaseUser: any, role: string): AuthUser {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    photo: firebaseUser.photoURL || undefined,
    role: role as 'admin' | 'responder',
    isDemo: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser>(GUEST_USER);
  const [userRole, setUserRole] = useState<'admin' | 'responder'>('admin');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const continueAsGuest = useCallback(() => {
    setCurrentUser(GUEST_USER);
    setUserRole('admin');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setIsLoading(false);
      return;
    }

    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('🔐 Redirect sign-in successful for:', result.user.email);
          await saveUserToFirestore(result.user);
          if (isAuthWindowContext()) {
            setTimeout(() => { try { window.close(); } catch {} }, 500);
          }
        } else {
          if (isAuthWindowContext() && !result) {
            setIsLoading(false);
          }
        }
      } catch (error: any) {
        console.log('🔐 Redirect result error:', error?.code, error?.message);
        if (isAuthWindowContext()) {
          setIsLoading(false);
        }
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
          setCurrentUser(buildAuthUser(firebaseUser, role));
          setUserRole(role as 'admin' | 'responder');
        } catch {
          setCurrentUser(buildAuthUser(firebaseUser, 'admin'));
          setUserRole('admin');
        }
        setAuthError(null);
        setIsLoading(false);

        if (Platform.OS === 'web' && isAuthWindowContext()) {
          setTimeout(() => { try { window.close(); } catch {} }, 500);
        }
      } else {
        continueAsGuest();
      }
    });
    return unsub;
  }, [continueAsGuest]);

  const login = useCallback(async () => {
    console.log('🔐 Login attempt — platform:', Platform.OS);
    setAuthError(null);

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In is available on the web version of UnifyOS. Please continue as Guest to access all features, or open the app in a browser to sign in with Google.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isRunningInIframe()) {
      try {
        const baseUrl = window.location.href.split('?')[0].replace(/#.*$/, '');
        const authUrl = `${baseUrl}?__auth=1`;
        const authWin = window.open(
          authUrl,
          'unifyos_google_auth',
          'width=520,height=680,left=200,top=80,resizable=yes,scrollbars=yes'
        );
        if (authWin) {
          authWin.focus();
          return;
        }
      } catch (e) {
        console.log('🔐 window.open failed:', e);
      }
    }

    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      const result = await signInWithPopup(auth, provider);
      console.log('🔐 Sign-in successful for:', result.user.email);
      await saveUserToFirestore(result.user);
    } catch (err: any) {
      console.log('🔐 Sign-in error:', err?.code, err?.message);
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(`Domain not authorized. Add "${domain}" to Firebase Console → Authentication → Authorized Domains.`);
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Pop-up was blocked. Please allow pop-ups for this site and try again.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Sign-in failed. Please try again.');
      }
      continueAsGuest();
    } finally {
      setIsLoading(false);
    }
  }, [continueAsGuest]);

  const loginForAuthWindow = useCallback(async () => {
    console.log('🔐 Auth window: initiating signInWithRedirect...');
    setIsLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('__unifyos_auth_redirect', '1');
      }
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.log('🔐 Auth window redirect error:', err?.code, err?.message);
      setIsLoading(false);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('__unifyos_auth_redirect');
      }
      if (err?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setAuthError(
          `Domain not authorized. In Firebase Console → Authentication → Authorized Domains, add:\n"${domain}"`
        );
      } else {
        setAuthError(err?.message || `Sign-in failed (${err?.code ?? 'unknown'})`);
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
    authError,
    login,
    loginForAuthWindow,
    logout,
    continueAsGuest,
    clearAuthError,
  }), [currentUser, userRole, isDemo, isLoading, authError, login, loginForAuthWindow, logout, continueAsGuest, clearAuthError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
