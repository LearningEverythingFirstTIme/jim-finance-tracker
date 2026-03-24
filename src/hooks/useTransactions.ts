'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getClientDb, getClientStorage } from '@/lib/firebase/client';
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

    // Create the doc first to get its ID
    const docRef = await addDoc(collection(db, 'users', user.uid, 'transactions'), {
      ...input,
      userId: user.uid,
      categoryId,
      categoryName,
      categoryColor,
      isRecurring: input.isRecurring || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // If a receipt file is provided, upload it and update the doc
    if (receiptFile) {
      try {
        const path = `receipts/${user.uid}/${docRef.id}/${receiptFile.name}`;
        const storageRef = ref(getClientStorage(), path);
        await uploadBytesResumable(storageRef, receiptFile, {
          contentType: receiptFile.type,
        });
        
        // Store only the path — download URL will be resolved at display time
        await updateDoc(docRef, {
          receiptPath: path,
          updatedAt: new Date(),
        });
      } catch (receiptError) {
        console.error('Receipt upload failed:', receiptError);
        throw receiptError;
      }
    }
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
      const storageRef = ref(getClientStorage(), existingReceiptPath);
      await deleteObject(storageRef);
      updateData.receiptUrl = null;
      updateData.receiptPath = null;
    } else if (receiptFile) {
      // Replace with new receipt
      if (existingReceiptPath) {
        const oldRef = ref(getClientStorage(), existingReceiptPath);
        await deleteObject(oldRef);
      }
      // Upload new receipt — store only path, URL resolved at display time
      const path = `receipts/${user.uid}/${id}/${receiptFile.name}`;
      const storageRef = ref(getClientStorage(), path);
      await uploadBytesResumable(storageRef, receiptFile, { contentType: receiptFile.type });
      updateData.receiptPath = path;
      updateData.receiptUrl = null;
    }

    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'transactions', id), updateData);
  }, [user]);

  const deleteTransaction = useCallback(async (id: string, receiptPath?: string | null) => {
    if (!user) throw new Error('Not authenticated');
    
    // Delete receipt from storage if exists
    if (receiptPath) {
      try {
        const storageRef = ref(getClientStorage(), receiptPath);
        await deleteObject(storageRef);
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
