import type { Transaction, Reminder, RecurringIncome, CashFlowDay, CashFlowItem, CashFlowSettings } from '@/types';
import {
  getDaysInMonth,
  getMonthYear,
  formatDateForMonth,
  getTodayDate,
  isDateInPast,
  isDateInFuture,
  isToday,
  getMonthRange,
} from './format';
import { nanoid } from 'nanoid';

export interface CashFlowCalculationInput {
  month: string;  // "YYYY-MM"
  startingBalance: number;
  asOfDate: string;
  lowBalanceThreshold: number;
  transactions: Transaction[];
  reminders: Reminder[];
  recurringIncomes: RecurringIncome[];
}

export interface CashFlowCalculationResult {
  days: CashFlowDay[];
  startingBalance: number;
  endingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  hasLowBalanceDays: boolean;
  hasNegativeDays: boolean;
}

/**
 * Pure function that calculates cash flow for a month.
 * This is designed to be easily testable and support "What If" scenarios
 * by passing modified inputs without affecting actual data.
 */
export function calculateCashFlow(input: CashFlowCalculationInput): CashFlowCalculationResult {
  const { year, month } = getMonthYear(input.month);
  const daysInMonth = getDaysInMonth(year, month);
  const today = getTodayDate();
  const monthRange = getMonthRange(input.month);

  // Calculate starting balance for the month
  // If asOfDate is before this month, we need to account for transactions between asOfDate and month start
  let balance = input.startingBalance;
  
  if (input.asOfDate < monthRange.start) {
    // asOfDate is before this month - add transactions from asOfDate to month start
    const txsBetween = input.transactions.filter(
      t => t.date > input.asOfDate && t.date < monthRange.start
    );
    for (const tx of txsBetween) {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }
  } else if (input.asOfDate >= monthRange.start && input.asOfDate <= monthRange.end) {
    // asOfDate is within this month - subtract transactions from month start to asOfDate
    const txsBefore = input.transactions.filter(
      t => t.date >= monthRange.start && t.date < input.asOfDate
    );
    for (const tx of txsBefore) {
      if (tx.type === 'income') {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }
  }

  const days: CashFlowDay[] = [];
  let runningBalance = balance;
  let totalIncome = 0;
  let totalExpenses = 0;
  let lowestBalance = runningBalance;
  let lowestBalanceDate = monthRange.start;
  let hasLowBalanceDays = false;
  let hasNegativeDays = false;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateForMonth(year, month, day);
    const isPast = isDateInPast(dateStr);
    const isFuture = isDateInFuture(dateStr);
    const isTodayDate = isToday(dateStr);

    // Get actual transactions for this day
    const dayTransactions = input.transactions.filter(t => t.date === dateStr);

    // Get reminders (bills) due on this day of month
    const dayReminders = input.reminders.filter(r => r.dueDayOfMonth === day);

    // Get recurring income on this day of month
    const dayRecurringIncomes = input.recurringIncomes.filter(ri => ri.dayOfMonth === day);

    // Build income items
    const incomeItems: CashFlowItem[] = [];
    let dayIncome = 0;

    for (const tx of dayTransactions.filter(t => t.type === 'income')) {
      incomeItems.push({
        id: tx.id,
        name: tx.note || tx.categoryName,
        amount: tx.amount,
        type: 'income',
        source: 'transaction',
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        categoryColor: tx.categoryColor,
        isProjected: isFuture,
      });
      dayIncome += tx.amount;
    }

    for (const ri of dayRecurringIncomes) {
      // Only add as projected if in the future
      if (isFuture || isTodayDate) {
        incomeItems.push({
          id: ri.id,
          name: ri.name,
          amount: ri.amount,
          type: 'income',
          source: 'recurring-income',
          categoryId: ri.categoryId,
          categoryName: ri.categoryName,
          categoryColor: ri.categoryColor,
          isProjected: true,
        });
        dayIncome += ri.amount;
      }
    }

    // Build expense items
    const expenseItems: CashFlowItem[] = [];
    let dayExpenses = 0;

    for (const tx of dayTransactions.filter(t => t.type === 'expense')) {
      expenseItems.push({
        id: tx.id,
        name: tx.note || tx.categoryName,
        amount: tx.amount,
        type: 'expense',
        source: 'transaction',
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        categoryColor: tx.categoryColor,
        isProjected: isFuture,
      });
      dayExpenses += tx.amount;
    }

    for (const reminder of dayReminders) {
      // Only add as projected if in the future
      if (isFuture || isTodayDate) {
        expenseItems.push({
          id: reminder.id,
          name: reminder.name,
          amount: reminder.amount,
          type: 'expense',
          source: 'reminder',
          categoryId: reminder.categoryId,
          categoryName: reminder.categoryName,
          categoryColor: reminder.categoryColor,
          isProjected: true,
        });
        dayExpenses += reminder.amount;
      }
    }

    const netChange = dayIncome - dayExpenses;
    runningBalance += netChange;

    // Track stats
    totalIncome += dayIncome;
    totalExpenses += dayExpenses;

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance;
      lowestBalanceDate = dateStr;
    }

    if (runningBalance < input.lowBalanceThreshold) {
      hasLowBalanceDays = true;
    }

    if (runningBalance < 0) {
      hasNegativeDays = true;
    }

    days.push({
      date: dateStr,
      dayOfMonth: day,
      isToday: isTodayDate,
      isPast,
      isFuture,
      income: {
        total: dayIncome,
        items: incomeItems,
      },
      expenses: {
        total: dayExpenses,
        items: expenseItems,
      },
      netChange,
      runningBalance,
      isLowBalance: runningBalance < input.lowBalanceThreshold,
      isNegative: runningBalance < 0,
    });
  }

  return {
    days,
    startingBalance: balance,
    endingBalance: runningBalance,
    totalIncome,
    totalExpenses,
    netChange: totalIncome - totalExpenses,
    lowestBalance,
    lowestBalanceDate,
    hasLowBalanceDays,
    hasNegativeDays,
  };
}

/**
 * Generate a calendar grid with empty cells for alignment.
 * Returns an array of (day number | null) where null represents empty cells.
 */
export function generateCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = getDaysInMonth(year, month);
  
  const grid: (number | null)[] = [];
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }
  
  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push(day);
  }
  
  return grid;
}

/**
 * Get day names for calendar header
 */
export function getDayNames(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}
