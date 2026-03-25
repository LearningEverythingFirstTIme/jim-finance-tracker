'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, deleteDoc, query, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { SavingsContribution, SavingsContributionInput } from '@/types';

export function useSavingsContributions() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<SavingsContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContributions([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'savingsContributions'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SavingsContribution[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          goalId: d.goalId,
          goalName: d.goalName,
          amount: Number(d.amount) || 0,
          date: d.date,
          note: d.note || '',
          createdAt: d.createdAt?.toDate?.() || new Date(),
        });
      });
      // Sort by date descending
      setContributions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addContribution = useCallback(async (input: SavingsContributionInput, goalCurrentAmount: number) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    const batch = writeBatch(db);

    const contributionRef = doc(collection(db, 'users', user.uid, 'savingsContributions'));
    batch.set(contributionRef, { ...input, userId: user.uid, createdAt: new Date() });

    const goalRef = doc(db, 'users', user.uid, 'savingsGoals', input.goalId);
    batch.update(goalRef, { currentAmount: goalCurrentAmount + input.amount, updatedAt: new Date() });

    await batch.commit();
  }, [user]);

  const deleteContribution = useCallback(async (
    id: string,
    goalId: string,
    amount: number,
    goalCurrentAmount: number,
  ) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    const batch = writeBatch(db);

    batch.delete(doc(db, 'users', user.uid, 'savingsContributions', id));

    const goalRef = doc(db, 'users', user.uid, 'savingsGoals', goalId);
    batch.update(goalRef, { currentAmount: goalCurrentAmount - amount, updatedAt: new Date() });

    await batch.commit();
  }, [user]);

  const getContributionsForGoal = useCallback((goalId: string) => {
    return contributions.filter((c) => c.goalId === goalId);
  }, [contributions]);

  const getTotalContributionsForGoal = useCallback((goalId: string) => {
    return contributions
      .filter((c) => c.goalId === goalId)
      .reduce((sum, c) => sum + c.amount, 0);
  }, [contributions]);

  return {
    contributions,
    loading,
    addContribution,
    deleteContribution,
    getContributionsForGoal,
    getTotalContributionsForGoal,
  };
}
