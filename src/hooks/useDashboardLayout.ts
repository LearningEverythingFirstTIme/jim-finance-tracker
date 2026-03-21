'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase/client';
import { useAuth } from '@/components/auth-provider';

export type PanelId =
  | 'budget'
  | 'goals'
  | 'quick-add'
  | 'spending-chart'
  | 'recent-transactions'
  | 'due-soon'
  | 'forecast'
  | 'streak';

export const DEFAULT_LAYOUT: PanelId[] = [
  'forecast',
  'streak',
  'budget',
  'goals',
  'quick-add',
  'spending-chart',
  'recent-transactions',
  'due-soon',
];

export const PANEL_LABELS: Record<PanelId, string> = {
  'budget': 'Budget Status',
  'goals': 'Savings Goals',
  'quick-add': 'Quick Add',
  'spending-chart': 'Spending by Category',
  'recent-transactions': 'Recent Transactions',
  'due-soon': 'Due Soon',
  'forecast': 'Spending Forecast',
  'streak': 'Spending Streak',
};

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<PanelId[]>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getClientDb();
    const docRef = doc(db, 'users', user.uid, 'settings', 'preferences');

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.dashboardLayout && Array.isArray(data.dashboardLayout)) {
          // Keep only valid, known panel IDs from the saved layout
          const saved = (data.dashboardLayout as string[]).filter(
            (id): id is PanelId => DEFAULT_LAYOUT.includes(id as PanelId)
          );
          // Append any panels added since the layout was saved (forward compat)
          const missing = DEFAULT_LAYOUT.filter((id) => !saved.includes(id));
          setLayout([...saved, ...missing]);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveLayout = async (newLayout: PanelId[]) => {
    if (!user) return;
    const db = getClientDb();
    const docRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    await setDoc(docRef, { dashboardLayout: newLayout }, { merge: true });
    setLayout(newLayout);
  };

  return { layout, saveLayout, loading };
}
