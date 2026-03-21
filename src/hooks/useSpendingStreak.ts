'use client';

import { useMemo } from 'react';
import type { Transaction } from '@/types';
import { getCurrentMonth, getMonthRange, getTodayDate } from '@/lib/format';

export interface StreakDay {
  date: string;     // YYYY-MM-DD
  spent: number;
  under: boolean;   // true  = at or under daily limit
  isToday: boolean;
}

export interface SpendingStreak {
  currentStreak: number;
  bestStreak30d: number;
  dailyLimit: number | null;  // null = not enough data to compute a limit
  hasLimit: boolean;
  weekHistory: StreakDay[];   // last 7 days, oldest → newest
}

/**
 * Computes a "daily under-limit" streak from raw transaction data.
 *
 * Daily limit priority:
 *   1. Monthly budget / days-in-month  (if a monthly budget exists)
 *   2. Historical daily average from the previous 3 months
 *   3. null  →  hasLimit=false, no streak tracked
 *
 * A day is "good" when total expenses on that day ≤ dailyLimit.
 * Days with $0 spending are always good.
 */
export function useSpendingStreak(
  transactions: Transaction[],
  monthlyBudgetAmount: number | null
): SpendingStreak {
  return useMemo(() => {
    const today = new Date();
    const todayStr = getTodayDate();
    const currentMonth = getCurrentMonth();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const { start: currentMonthStart } = getMonthRange(currentMonth);

    // ── Determine daily limit ───────────────────────────────────────────────
    let dailyLimit: number | null = null;

    if (monthlyBudgetAmount !== null && monthlyBudgetAmount > 0) {
      dailyLimit = monthlyBudgetAmount / daysInMonth;
    } else {
      // Fall back to historical daily average (previous 3 months)
      const lookback = new Date(today);
      lookback.setMonth(lookback.getMonth() - 3);
      const lookbackStr = lookback.toISOString().split('T')[0];

      const historicalExpenses = transactions.filter(
        (t) => t.type === 'expense' && t.date >= lookbackStr && t.date < currentMonthStart
      );

      if (historicalExpenses.length > 0) {
        const total = historicalExpenses.reduce((sum, t) => sum + t.amount, 0);
        const days = Math.max(
          Math.round((new Date(currentMonthStart).getTime() - lookback.getTime()) / 86_400_000),
          1
        );
        dailyLimit = total / days;
      }
    }

    if (dailyLimit === null) {
      return { currentStreak: 0, bestStreak30d: 0, dailyLimit: null, hasLimit: false, weekHistory: [] };
    }

    // ── Bucket expense transactions by date ─────────────────────────────────
    const byDate: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'expense') {
        byDate[t.date] = (byDate[t.date] ?? 0) + t.amount;
      }
    }

    const isGoodDay = (d: string) => (byDate[d] ?? 0) <= dailyLimit!;

    // ── Current streak (walk backwards from today) ───────────────────────────
    let currentStreak = 0;
    const cursor = new Date(today);
    for (let i = 0; i < 365; i++) {
      if (isGoodDay(cursor.toISOString().split('T')[0])) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    // ── Last 7 days (oldest first) ───────────────────────────────────────────
    const weekHistory: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        spent: byDate[dateStr] ?? 0,
        under: isGoodDay(dateStr),
        isToday: dateStr === todayStr,
      };
    });

    // ── Best streak in last 30 days ───────────────────────────────────────────
    let bestStreak30d = 0;
    let run = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (isGoodDay(d.toISOString().split('T')[0])) {
        run++;
        bestStreak30d = Math.max(bestStreak30d, run);
      } else {
        run = 0;
      }
    }
    // Current streak may extend beyond 30 days
    bestStreak30d = Math.max(bestStreak30d, currentStreak);

    return { currentStreak, bestStreak30d, dailyLimit, hasLimit: true, weekHistory };
  }, [transactions, monthlyBudgetAmount]);
}
