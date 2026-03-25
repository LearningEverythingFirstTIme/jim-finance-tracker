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
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isRecurring?: boolean;
  recurringSourceId?: string;
  receiptUrl?: string | null;
  receiptPath?: string | null;
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

export type TagBreakdown = {
  tagName: string;
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
  tags?: string[];
  isRecurring?: boolean;
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

// Recurring Income Types (for cash flow projections)
export type RecurringIncome = {
  id: string;
  userId: string;
  name: string;           // "Paycheck", "Social Security", etc.
  amount: number;
  dayOfMonth: number;     // 1 = 1st of every month, 15 = 15th, etc.
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  note: string;
  createdAt: Date;
};

export type RecurringIncomeInput = {
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  note: string;
};

// Cash Flow Settings
export type CashFlowSettings = {
  id: string;
  userId: string;
  startingBalance: number;
  asOfDate: string;              // "YYYY-MM-DD" - when was this balance accurate
  lowBalanceThreshold: number;   // warn when balance drops below this (default $300)
  updatedAt: Date;
};

export type CashFlowSettingsInput = {
  startingBalance: number;
  asOfDate: string;
  lowBalanceThreshold: number;
};

// Cash Flow Day (computed, not stored)
export type CashFlowDay = {
  date: string;                  // "YYYY-MM-DD"
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  income: {
    total: number;
    items: CashFlowItem[];
  };
  expenses: {
    total: number;
    items: CashFlowItem[];
  };
  netChange: number;
  runningBalance: number;
  isLowBalance: boolean;
  isNegative: boolean;
};

export type CashFlowItem = {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  source: 'transaction' | 'reminder' | 'recurring-income';
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isProjected: boolean;  // true if future item, false if actual transaction
};
