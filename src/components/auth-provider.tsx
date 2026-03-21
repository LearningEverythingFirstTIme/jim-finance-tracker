'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getClientAuth, getClientDb } from '@/lib/firebase/client';
import { getDefaultCategories } from '@/lib/default-categories';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getClientAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const auth = getClientAuth();
    const db = getClientDb();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      createdAt: new Date(),
    });

    const defaultCategories = getDefaultCategories();
    for (const category of defaultCategories) {
      const categoryRef = doc(db, 'users', uid, 'categories', crypto.randomUUID());
      await setDoc(categoryRef, {
        ...category,
        userId: uid,
        createdAt: new Date(),
      });
    }

    await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), {
      userId: uid,
      currency: 'USD',
      darkMode: true,
      weekStartsOn: 0,
      updatedAt: new Date(),
    });
  };

  const signOut = async () => {
    const auth = getClientAuth();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
