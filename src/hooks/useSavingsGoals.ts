'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { SavingsGoal, SavingsGoalInput } from '@/types';

export function useSavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'savingsGoals'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SavingsGoal[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          name: d.name,
          targetAmount: Number(d.targetAmount) || 0,
          currentAmount: Number(d.currentAmount) || 0,
          icon: d.icon || 'Target',
          color: d.color || '#22c55e',
          deadline: d.deadline || null,
          createdAt: d.createdAt?.toDate?.() || new Date(),
          updatedAt: d.updatedAt?.toDate?.() || new Date(),
        });
      });
      setGoals(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addGoal = useCallback(async (input: SavingsGoalInput) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'savingsGoals'), {
      ...input,
      userId: user.uid,
      currentAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [user]);

  const updateGoal = useCallback(async (id: string, input: Partial<SavingsGoalInput>) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'savingsGoals', id), {
      ...input,
      updatedAt: new Date(),
    });
  }, [user]);

  const updateGoalAmount = useCallback(async (id: string, newAmount: number) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'savingsGoals', id), {
      currentAmount: newAmount,
      updatedAt: new Date(),
    });
  }, [user]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', id));
  }, [user]);

  const getGoalById = useCallback((id: string) => {
    return goals.find((g) => g.id === id);
  }, [goals]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalAmount,
    deleteGoal,
    getGoalById,
  };
}
