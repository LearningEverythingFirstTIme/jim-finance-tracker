'use client';

import { useMemo, useCallback } from 'react';
import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { getCurrentMonth, getPreviousMonth, getMonthRange } from '@/lib/format';
import type { DashboardStats, CategoryBreakdown, TransactionType } from '@/types';

export function useDashboardStats() {
  const { transactions, loading: transactionsLoading, addTransaction } = useTransactions();
  const { categories, loading: categoriesLoading } = useCategories();

  const stats = useMemo((): DashboardStats => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth();
    const currentRange = getMonthRange(currentMonth);
    const previousRange = getMonthRange(previousMonth);

    const thisMonthTransactions = transactions.filter((t) => {
      return t.date >= currentRange.start && t.date <= currentRange.end;
    });

    const lastMonthTransactions = transactions.filter((t) => {
      return t.date >= previousRange.start && t.date <= previousRange.end;
    });

    const thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthExpenses = thisMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthIncome = lastMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      thisMonthIncome,
      thisMonthExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const currentMonth = getCurrentMonth();
    const currentRange = getMonthRange(currentMonth);

    const thisMonthExpenses = transactions.filter((t) => {
      return t.type === 'expense' && t.date >= currentRange.start && t.date <= currentRange.end;
    });

    const total = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    if (total === 0) return [];

    const byCategory: Record<string, { total: number; count: number; name: string; color: string }> = {};

    for (const t of thisMonthExpenses) {
      if (!byCategory[t.categoryId]) {
        byCategory[t.categoryId] = {
          total: 0,
          count: 0,
          name: t.categoryName,
          color: t.categoryColor,
        };
      }
      byCategory[t.categoryId].total += t.amount;
      byCategory[t.categoryId].count += 1;
    }

    return Object.entries(byCategory)
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        categoryColor: data.color,
        total: data.total,
        percentage: (data.total / total) * 100,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  const topCategories = useMemo(() => {
    return categoryBreakdown.slice(0, 5);
  }, [categoryBreakdown]);

  const getCategoriesByType = useCallback((type: TransactionType) => {
    return categories.filter((c) => c.type === type);
  }, [categories]);

  return {
    stats,
    categoryBreakdown,
    recentTransactions,
    topCategories,
    categories,
    getCategoriesByType,
    addTransaction,
    loading: transactionsLoading || categoriesLoading,
  };
}
