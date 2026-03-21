'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { Category, CategoryInput, TransactionType } from '@/types';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'categories'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Category[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          name: d.name,
          icon: d.icon,
          color: d.color,
          type: d.type,
          createdAt: d.createdAt?.toDate?.() || new Date(),
        });
      });
      setCategories(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addCategory = useCallback(async (input: CategoryInput) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'categories'), {
      ...input,
      userId: user.uid,
      createdAt: new Date(),
    });
  }, [user]);

  const updateCategory = useCallback(async (id: string, input: Partial<CategoryInput>) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'categories', id), input);
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
  }, [user]);

  const getCategoriesByType = useCallback((type: TransactionType) => {
    return categories.filter((c) => c.type === type);
  }, [categories]);

  const getCategoryById = useCallback((id: string) => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    getCategoryById,
  };
}
