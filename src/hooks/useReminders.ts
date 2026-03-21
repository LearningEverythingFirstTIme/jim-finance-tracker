'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, addDoc, updateDoc, deleteDoc, query, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { Reminder, ReminderInput } from '@/types';

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const q = query(collection(db, 'users', user.uid, 'reminders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Reminder[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          userId: d.userId,
          name: d.name,
          amount: Number(d.amount) || 0,
          categoryId: d.categoryId,
          categoryName: d.categoryName,
          categoryColor: d.categoryColor,
          dueDayOfMonth: d.dueDayOfMonth,
          note: d.note || '',
          lastNotified: d.lastNotified,
          createdAt: d.createdAt?.toDate?.() || new Date(),
        });
      });
      setReminders(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addReminder = useCallback(async (input: ReminderInput, categoryId: string, categoryName: string, categoryColor: string) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    await addDoc(collection(db, 'users', user.uid, 'reminders'), {
      ...input,
      userId: user.uid,
      categoryId,
      categoryName,
      categoryColor,
      createdAt: new Date(),
    });
  }, [user]);

  const updateReminder = useCallback(async (id: string, input: Partial<ReminderInput>, categoryId?: string, categoryName?: string, categoryColor?: string) => {
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, unknown> = { ...input };
    if (categoryId) updateData.categoryId = categoryId;
    if (categoryName) updateData.categoryName = categoryName;
    if (categoryColor) updateData.categoryColor = categoryColor;

    const db = getClientDb();
    await updateDoc(doc(db, 'users', user.uid, 'reminders', id), updateData);
  }, [user]);

  const deleteReminder = useCallback(async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', user.uid, 'reminders', id));
  }, [user]);

  return {
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
  };
}
