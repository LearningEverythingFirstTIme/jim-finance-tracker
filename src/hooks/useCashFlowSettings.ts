'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import type { CashFlowSettings, CashFlowSettingsInput } from '@/types';

const DEFAULT_LOW_BALANCE_THRESHOLD = 300;

export function useCashFlowSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CashFlowSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'cashFlow');

    getDoc(settingsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setSettings({
          id: snapshot.id,
          userId: d.userId,
          startingBalance: Number(d.startingBalance) || 0,
          asOfDate: d.asOfDate || '',
          lowBalanceThreshold: Number(d.lowBalanceThreshold) || DEFAULT_LOW_BALANCE_THRESHOLD,
          updatedAt: d.updatedAt?.toDate?.() || new Date(),
        });
      } else {
        setSettings(null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user]);

  const saveSettings = useCallback(async (input: CashFlowSettingsInput) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'cashFlow');

    const newSettings: Omit<CashFlowSettings, 'id'> = {
      userId: user.uid,
      startingBalance: input.startingBalance,
      asOfDate: input.asOfDate,
      lowBalanceThreshold: input.lowBalanceThreshold,
      updatedAt: new Date(),
    };

    await setDoc(settingsRef, {
      ...newSettings,
      updatedAt: new Date(),
    });

    setSettings({
      id: 'cashFlow',
      ...newSettings,
    });
  }, [user]);

  const updateStartingBalance = useCallback(async (balance: number, asOfDate: string) => {
    if (!user) throw new Error('Not authenticated');

    const db = getClientDb();
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'cashFlow');

    const updateData = {
      userId: user.uid,
      startingBalance: balance,
      asOfDate,
      lowBalanceThreshold: settings?.lowBalanceThreshold || DEFAULT_LOW_BALANCE_THRESHOLD,
      updatedAt: new Date(),
    };

    await setDoc(settingsRef, updateData);

    setSettings({
      id: 'cashFlow',
      ...updateData,
    });
  }, [user, settings?.lowBalanceThreshold]);

  return {
    settings,
    loading,
    saveSettings,
    updateStartingBalance,
    lowBalanceThreshold: settings?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD,
  };
}
