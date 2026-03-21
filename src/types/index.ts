export type TransactionType = 'income' | 'expense';

export type Category = {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  createdAt: Date;
};

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  note: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Reminder = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  dueDayOfMonth: number;
  note: string;
  lastNotified?: string;
  createdAt: Date;
};

export type UserSettings = {
  userId: string;
  currency: string;
  darkMode: boolean;
  weekStartsOn: number;
  updatedAt: Date;
};

export type DashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  thisMonthIncome: number;
  thisMonthExpenses: number;
  lastMonthIncome: number;
  lastMonthExpenses: number;
  transactionCount: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
  count: number;
};

export type TransactionInput = {
  amount: number;
  type: TransactionType;
  categoryId: string;
  note: string;
  date: string;
};

export type CategoryInput = {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
};

export type ReminderInput = {
  name: string;
  amount: number;
  categoryId: string;
  dueDayOfMonth: number;
  note: string;
};

export type IconOption = {
  name: string;
  label: string;
};

export type ColorOption = {
  value: string;
  label: string;
};
