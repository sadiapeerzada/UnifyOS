import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const DEMO_USER = {
  uid: 'demo-001',
  name: 'Demo Admin',
  email: 'demo@unifyos.com',
  role: 'admin' as const,
  isDemo: true,
};

interface AuthUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'responder';
  isDemo: boolean;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  userRole: string;
  isDemo: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(DEMO_USER);
  const [isDemo, setIsDemo] = useState(true);

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: '537179931085-googleclientid.apps.googleusercontent.com',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      const credential = GoogleAuthProvider.credential(response.params.id_token);
      signInWithCredential(auth, credential).catch(() => {});
    }
  }, [response]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          let role: 'admin' | 'responder' = 'responder';
          if (userDoc.exists()) {
            role = (userDoc.data().role as 'admin' | 'responder') || 'responder';
          } else {
            await setDoc(userDocRef, { role: 'responder', email: user.email, name: user.displayName });
          }
          setCurrentUser({
            uid: user.uid,
            name: user.displayName || user.email || 'User',
            email: user.email || '',
            role,
            isDemo: false,
          });
          setIsDemo(false);
        } catch {
          setCurrentUser(DEMO_USER);
          setIsDemo(true);
        }
      } else {
        setCurrentUser(DEMO_USER);
        setIsDemo(true);
      }
    });
    return unsub;
  }, []);

  const login = useCallback(async () => {
    if (isDemo) {
      await promptAsync();
    }
  }, [isDemo, promptAsync]);

  const logout = useCallback(async () => {
    if (isDemo) {
      Alert.alert('Demo Mode', 'Demo Mode — Real auth coming soon');
      return;
    }
    try {
      await firebaseSignOut(auth);
    } catch {}
  }, [isDemo]);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    userRole: currentUser?.role || 'responder',
    isDemo,
    login,
    logout,
  }), [currentUser, isDemo, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
