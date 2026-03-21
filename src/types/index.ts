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

// Budget System Types
export type Budget = {
  id: string;
  userId: string;
  categoryId: string | null;       // null = overall budget
  categoryName: string | null;     // denormalized for display
  categoryColor: string | null;
  amount: number;                   // monthly budget amount
  month: string;                    // "YYYY-MM" format — budget applies to this month
  rollover: boolean;               // unused budget carries to next month
  createdAt: Date;
};

export type BudgetInput = {
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  amount: number;
  month: string;
  rollover: boolean;
};

// Savings Goals Types
export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;           // total contributed so far
  icon: string;                    // lucide icon name
  color: string;
  deadline: string | null;         // optional target date "YYYY-MM-DD"
  createdAt: Date;
  updatedAt: Date;
};

export type SavingsGoalInput = {
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
  deadline: string | null;
};

export type SavingsContribution = {
  id: string;
  userId: string;
  goalId: string;
  goalName: string;               // denormalized
  amount: number;
  date: string;                   // "YYYY-MM-DD"
  note: string;
  createdAt: Date;
};

export type SavingsContributionInput = {
  goalId: string;
  goalName: string;
  amount: number;
  date: string;
  note: string;
};
