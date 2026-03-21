'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { Transaction, TransactionInput } from '@/types';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(
      collection(db, 'users', user.uid, 'transactions')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          amount: Number(d.amount) || 0,
          type: d.type,
          categoryId: d.categoryId,
          categoryName: d.categoryName,
          categoryColor: d.categoryColor,
          note: d.note || '',
          date: d.date,
          createdAt: d.createdAt?.toDate?.() || new Date(),
          updatedAt: d.updatedAt?.toDate?.() || new Date(),
        });
      });
      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addTransaction = useCallback(async (input: TransactionInput, categoryId: string, categoryName: string, categoryColor: string) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      ...input,
      userId: user.uid,
      categoryId,
      categoryName,
      categoryColor,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [user]);

  const updateTransaction = useCallback(async (id: string, input: Partial<TransactionInput>, categoryId?: string, categoryName?: string, categoryColor?: string) => {
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };
    if (categoryId) updateData.categoryId = categoryId;
    if (categoryName) updateData.categoryName = categoryName;
    if (categoryColor) updateData.categoryColor = categoryColor;

    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'transactions', id), updateData);
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  }, [user]);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
