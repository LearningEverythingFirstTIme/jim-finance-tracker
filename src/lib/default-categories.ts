import type { CategoryInput, TransactionType } from '@/types';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<CategoryInput, 'type'>[] = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#ef4444' },
  { name: 'Transportation', icon: 'Car', color: '#f97316' },
  { name: 'Housing', icon: 'Home', color: '#eab308' },
  { name: 'Utilities', icon: 'Zap', color: '#84cc16' },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#22c55e' },
  { name: 'Health', icon: 'Heart', color: '#14b8a6' },
  { name: 'Entertainment', icon: 'Film', color: '#06b6d4' },
  { name: 'Personal', icon: 'User', color: '#3b82f6' },
  { name: 'Donations', icon: 'HandHeart', color: '#8b5cf6' },
  { name: 'Clothing', icon: 'Shirt', color: '#d946ef' },
  { name: 'Gifts', icon: 'Gift', color: '#ec4899' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<CategoryInput, 'type'>[] = [
  { name: 'Salary', icon: 'Briefcase', color: '#22c55e' },
  { name: 'Side Income', icon: 'Laptop', color: '#14b8a6' },
  { name: 'Gifts Received', icon: 'Gift', color: '#8b5cf6' },
  { name: 'Refunds', icon: 'RotateCcw', color: '#3b82f6' },
  { name: 'Other Income', icon: 'Plus', color: '#6b7280' },
];

export function getDefaultCategories(): CategoryInput[] {
  const expenses = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    type: 'expense' as TransactionType,
  }));
  const incomes = DEFAULT_INCOME_CATEGORIES.map((c) => ({
    ...c,
    type: 'income' as TransactionType,
  }));
  return [...expenses, ...incomes];
}
