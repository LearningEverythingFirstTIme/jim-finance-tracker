'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import { uploadReceipt, deleteReceipt as deleteReceiptFromStorage } from '@/lib/receipts';
import { getMonthRange, getTodayDate } from '@/lib/format';
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
          isRecurring: d.isRecurring || false,
          recurringSourceId: d.recurringSourceId || undefined,
          receiptUrl: d.receiptUrl || null,
          receiptPath: d.receiptPath || null,
        });
      });
      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addTransaction = useCallback(async (
    input: TransactionInput,
    categoryId: string,
    categoryName: string,
    categoryColor: string,
    receiptFile?: File
  ) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();

    // Upload receipt FIRST if provided, then create doc in single write
    let receiptUrl: string | undefined;
    let receiptPath: string | undefined;

    if (receiptFile) {
      // Use a temp ID for storage path (doesn't need to match transaction ID)
      const tempId = crypto.randomUUID();
      const receipt = await uploadReceipt(user.uid, tempId, receiptFile);
      receiptUrl = receipt.url;
      receiptPath = receipt.path;
    }

    // Create the doc with all fields in a single write
    await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      ...input,
      userId: user.uid,
      categoryId,
      categoryName,
      categoryColor,
      isRecurring: input.isRecurring || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(receiptUrl && { receiptUrl }),
      ...(receiptPath && { receiptPath }),
    });
  }, [user]);

  const updateTransaction = useCallback(async (
    id: string,
    input: Partial<TransactionInput>,
    categoryId?: string,
    categoryName?: string,
    categoryColor?: string,
    receiptFile?: File | null,
    shouldDeleteReceipt?: boolean,
    existingReceiptPath?: string | null
  ) => {
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };
    if (categoryId) updateData.categoryId = categoryId;
    if (categoryName) updateData.categoryName = categoryName;
    if (categoryColor) updateData.categoryColor = categoryColor;

    // Handle receipt changes
    if (shouldDeleteReceipt && existingReceiptPath) {
      // Delete existing receipt from storage
      await deleteReceiptFromStorage(existingReceiptPath);
      updateData.receiptUrl = null;
      updateData.receiptPath = null;
    } else if (receiptFile) {
      // Replace with new receipt
      if (existingReceiptPath) {
        // Delete old receipt first
        await deleteReceiptFromStorage(existingReceiptPath);
      }
      // Upload new receipt
      const receipt = await uploadReceipt(user.uid, id, receiptFile);
      updateData.receiptUrl = receipt.url;
      updateData.receiptPath = receipt.path;
    }

    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'transactions', id), updateData);
  }, [user]);

  const deleteTransaction = useCallback(async (id: string, receiptPath?: string | null) => {
    if (!user) throw new Error('Not authenticated');
    
    // Delete receipt from storage if exists
    if (receiptPath) {
      try {
        await deleteReceiptFromStorage(receiptPath);
      } catch {
        // Ignore storage errors - the transaction will still be deleted
      }
    }
    
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  }, [user]);

  // Returns recurring source transactions that have no generated copy for the given month yet
  const getPendingRecurring = useCallback((month: string): Transaction[] => {
    const { start, end } = getMonthRange(month);
    const sources = transactions.filter((t) => t.isRecurring && !t.recurringSourceId);
    const generatedSourceIds = new Set(
      transactions
        .filter((t) => t.recurringSourceId && t.date >= start && t.date <= end)
        .map((t) => t.recurringSourceId!)
    );
    return sources.filter((t) => !generatedSourceIds.has(t.id));
  }, [transactions]);

  // Auto-generates copies of recurring transactions for the given month
  const generateRecurringForMonth = useCallback(async (month: string) => {
    if (!user) throw new Error('Not authenticated');
    const pending = getPendingRecurring(month);
    if (pending.length === 0) return 0;

    const [year, monthNum] = month.split('-').map(Number);
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const today = getTodayDate();
    const db = getClientDb();

    let count = 0;
    for (const source of pending) {
      const sourceDay = parseInt(source.date.split('-')[2]);
      const day = Math.min(sourceDay, lastDayOfMonth);
      const newDate = `${month}-${String(day).padStart(2, '0')}`;
      // Only generate if the date is not in the future
      if (newDate <= today) {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          userId: user.uid,
          amount: source.amount,
          type: source.type,
          categoryId: source.categoryId,
          categoryName: source.categoryName,
          categoryColor: source.categoryColor,
          note: source.note,
          date: newDate,
          isRecurring: false,
          recurringSourceId: source.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        count++;
      }
    }
    return count;
  }, [user, getPendingRecurring]);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPendingRecurring,
    generateRecurringForMonth,
  };
}
