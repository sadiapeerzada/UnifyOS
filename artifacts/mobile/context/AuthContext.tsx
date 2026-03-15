import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

WebBrowser.maybeCompleteAuthSession();

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
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// TODO: Add these client IDs from Firebase Console
// Go to Firebase Console → Project Settings → Your Apps
// Add an Android app and iOS app to get client IDs
// For now app works in demo mode until client IDs are added
const GOOGLE_CLIENT_IDS = {
  androidClientId: '537179931085-REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: '537179931085-REPLACE_WITH_IOS_CLIENT_ID.apps.googleusercontent.com',
  webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const role = userDoc.exists() ? (userDoc.data().role || 'admin') : 'admin';
        setCurrentUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role,
          isDemo: false,
        });
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setIsLoading(true);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              name: user.displayName,
              email: user.email,
              role: 'admin',
              createdAt: new Date(),
            });
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [response]);

  const login = useCallback(() => {
    promptAsync();
  }, [promptAsync]);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
  }, []);

  const isDemo = !currentUser;

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    userRole: currentUser?.role || 'responder',
    isDemo,
    isLoading,
    login,
    logout,
  }), [currentUser, isDemo, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
