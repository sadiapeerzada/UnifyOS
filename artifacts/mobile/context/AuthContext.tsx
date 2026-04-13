import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

WebBrowser.maybeCompleteAuthSession();

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
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
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

const AUTH_USER_STORAGE_KEY = 'unifyos.authUser';
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_FOR_REQUEST = GOOGLE_WEB_CLIENT_ID || 'missing-google-web-client-id.apps.googleusercontent.com';
const expoProxyRedirectUri = AuthSession.makeRedirectUri({ useProxy: true } as any);
const redirectUri = expoProxyRedirectUri.includes('auth.expo.io')
  ? expoProxyRedirectUri
  : 'https://auth.expo.io/@sadiapeerzada/unifyos';

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
    if (user && !user.isDemo) {
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
    isDemo: false,
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
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized. Check Firebase Auth settings.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser>(GUEST_USER);
  const [userRole, setUserRole] = useState<'admin' | 'responder'>('admin');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, googleResponse, promptGoogleSignIn] = Google.useAuthRequest(
    {
      expoClientId: GOOGLE_CLIENT_ID_FOR_REQUEST,
      clientId: GOOGLE_CLIENT_ID_FOR_REQUEST,
      webClientId: GOOGLE_CLIENT_ID_FOR_REQUEST,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
      redirectUri,
    } as any
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const continueAsGuest = useCallback(() => {
    setCurrentUser(GUEST_USER);
    setUserRole('admin');
    setIsLoading(false);
    persistAuthUser(null);
  }, []);

  useEffect(() => {
    getPersistedAuthUser().then((persistedUser) => {
      if (persistedUser) {
        setCurrentUser(persistedUser);
        setUserRole(persistedUser.role);
      }
    });
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
        const persistedUser = await getPersistedAuthUser();
        if (persistedUser) {
          setCurrentUser(persistedUser);
          setUserRole(persistedUser.role);
          setIsLoading(false);
        } else {
          continueAsGuest();
        }
      }
    });
    return unsub;
  }, [continueAsGuest]);

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

  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await saveUserToFirestore(result.user);
      setAuthError(null);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('This app domain is not authorized in Firebase Authentication.');
      } else {
        setAuthError(err?.message || 'Google sign-in failed. Please try again.');
      }
      continueAsGuest();
    } finally {
      setIsLoading(false);
    }
  }, [continueAsGuest]);

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (idToken) {
        completeGoogleSignIn(idToken);
      } else {
        setIsLoading(false);
        setAuthError('Google did not return an ID token. Check your Web Client ID configuration.');
      }
      return;
    }

    setIsLoading(false);
    if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setAuthError('Google sign-in was cancelled.');
    } else if (googleResponse.type === 'error') {
      setAuthError(googleResponse.error?.message || 'Google sign-in failed. Please try again.');
    }
  }, [completeGoogleSignIn, googleResponse]);

  const login = useCallback(async () => {
    setAuthError(null);

    if (!GOOGLE_WEB_CLIENT_ID) {
      setAuthError('Google sign-in is not configured. Use email/password instead.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await promptGoogleSignIn({ useProxy: true } as any);
      if (result.type === 'opened') {
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err?.message || 'Unable to start Google sign-in. Please try again.');
    }
  }, [promptGoogleSignIn]);

  const logout = useCallback(async () => {
    try {
      await persistAuthUser(null);
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
    loginWithEmail,
    signUpWithEmail,
    logout,
    continueAsGuest,
    clearAuthError,
  }), [currentUser, userRole, isDemo, isLoading, authError, login, loginWithEmail, signUpWithEmail, logout, continueAsGuest, clearAuthError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
