'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { Budget, BudgetInput } from '@/types';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'budgets'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Budget[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          categoryId: d.categoryId,
          categoryName: d.categoryName,
          categoryColor: d.categoryColor,
          amount: Number(d.amount) || 0,
          month: d.month,
          rollover: d.rollover || false,
          createdAt: d.createdAt?.toDate?.() || new Date(),
        });
      });
      setBudgets(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addBudget = useCallback(async (input: BudgetInput) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'budgets'), {
      ...input,
      userId: user.uid,
      createdAt: new Date(),
    });
  }, [user]);

  const updateBudget = useCallback(async (id: string, input: Partial<BudgetInput>) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'budgets', id), input);
  }, [user]);

  const deleteBudget = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
  }, [user]);

  const getBudgetsForMonth = useCallback((month: string) => {
    return budgets.filter((b) => b.month === month);
  }, [budgets]);

  const getOverallBudget = useCallback((month: string) => {
    return budgets.find((b) => b.month === month && b.categoryId === null);
  }, [budgets]);

  const getCategoryBudget = useCallback((month: string, categoryId: string) => {
    return budgets.find((b) => b.month === month && b.categoryId === categoryId);
  }, [budgets]);

  return {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudgetsForMonth,
    getOverallBudget,
    getCategoryBudget,
  };
}
