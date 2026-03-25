'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { RecurringIncome, RecurringIncomeInput } from '@/types';

export function useRecurringIncome() {
  const { user } = useAuth();
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecurringIncomes([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'recurringIncome'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RecurringIncome[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          name: d.name,
          amount: Number(d.amount) || 0,
          dayOfMonth: d.dayOfMonth,
          categoryId: d.categoryId,
          categoryName: d.categoryName,
          categoryColor: d.categoryColor,
          note: d.note || '',
          createdAt: d.createdAt?.toDate?.() || new Date(),
        });
      });
      setRecurringIncomes(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addRecurringIncome = useCallback(async (
    input: RecurringIncomeInput,
    categoryId: string,
    categoryName: string,
    categoryColor: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'recurringIncome'), {
      ...input,
      userId: user.uid,
      categoryId,
      categoryName,
      categoryColor,
      createdAt: new Date(),
    });
  }, [user]);

  const updateRecurringIncome = useCallback(async (
    id: string,
    input: Partial<RecurringIncomeInput>,
    categoryId?: string,
    categoryName?: string,
    categoryColor?: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = { ...input };
    if (categoryId) updateData.categoryId = categoryId;
    if (categoryName) updateData.categoryName = categoryName;
    if (categoryColor) updateData.categoryColor = categoryColor;

    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'recurringIncome', id), updateData);
  }, [user]);

  const deleteRecurringIncome = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'recurringIncome', id));
  }, [user]);

  return {
    recurringIncomes,
    loading,
    addRecurringIncome,
    updateRecurringIncome,
    deleteRecurringIncome,
  };
}
