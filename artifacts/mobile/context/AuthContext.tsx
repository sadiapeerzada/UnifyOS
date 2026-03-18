import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import {
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  signOut as firebaseSignOut,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser>(GUEST_USER);
  const [userRole, setUserRole] = useState<'admin' | 'responder'>('admin');
  const [isLoading, setIsLoading] = useState(true);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: '537179931085-jnb1083s5f6ibo4928khjir540t08md2.apps.googleusercontent.com',
    iosClientId: '537179931085-jnb1083s5f6ibo4928khjir540t08md2.apps.googleusercontent.com',
    androidClientId: '537179931085-jnb1083s5f6ibo4928khjir540t08md2.apps.googleusercontent.com',
    redirectUri: "https://auth.expo.io/@sadiapeerzada/unifyos",
    responseType: "id_token",
    usePKCE: false,
  });

  const continueAsGuest = useCallback(() => {
    setCurrentUser(GUEST_USER);
    setUserRole('admin');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
        setIsLoading(false);
      } else {
        continueAsGuest();
      }
    });
    return unsub;
  }, [continueAsGuest]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setIsLoading(true);
      signInWithCredential(auth, credential)
        .then(async (result) => {
          const user = result.user;
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await setDoc(userDocRef, {
              name: user.displayName,
              email: user.email,
              role: 'admin',
              createdAt: new Date(),
            });
          }
          const role = userSnap.exists() ? userSnap.data().role : 'admin';
          setUserRole(role);
        })
        .catch((err) => {
          console.error('Sign in error:', err);
          continueAsGuest();
        })
        .finally(() => setIsLoading(false));
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      continueAsGuest();
    }
  }, [response, continueAsGuest]);

  const login = useCallback(async () => {
    try {
      await promptAsync({ useProxy: true });
    } catch (err) {
      console.error('Login error:', err);
      continueAsGuest();
    }
  }, [promptAsync, continueAsGuest]);

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
