'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Bell,
  Loader2,
  ChevronRight,
  DollarSign,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useReminders } from '@/hooks/useReminders';
import { formatCurrency, formatDateShort, getDaysUntilDue, getPercentageChange, getTodayDate } from '@/lib/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

const FINANCE_QUOTES = [
  "A budget is telling your money where to go instead of wondering where it went. — Dave Ramsey",
  "Do not save what is left after spending, but spend what is left after saving. — Warren Buffett",
  "The habit of saving is itself an education. — T.T. Munger",
  "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make. — Dave Ramsey",
  "An investment in knowledge pays the best interest. — Benjamin Franklin",
  "Too many people spend money they haven't earned, to impress people they don't like. — Will Rogers",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Jim";
  if (hour < 17) return "Good afternoon, Jim";
  return "Good evening, Jim";
}

export default function DashboardPage() {
  const { stats, categoryBreakdown, recentTransactions, topCategories, categories, getCategoriesByType, addTransaction, loading } = useDashboardStats();
  const { reminders } = useReminders();

  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [quickAddAmount, setQuickAddAmount] = useState('');
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddNote, setQuickAddNote] = useState('');
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showQuote, setShowQuote] = useState(false);

  const expenseChange = getPercentageChange(stats.thisMonthExpenses, stats.lastMonthExpenses);
  const incomeChange = getPercentageChange(stats.thisMonthIncome, stats.lastMonthIncome);

  useEffect(() => {
    if (logoClicks >= 5) {
      setShowQuote(true);
      const timer = setTimeout(() => {
        setShowQuote(false);
        setLogoClicks(0);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const dueSoonReminders = reminders
    .map((r) => ({ ...r, daysUntil: getDaysUntilDue(r.dueDayOfMonth) }))
    .filter((r) => r.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const handleQuickAdd = async (addAnother: boolean) => {
    const amount = parseFloat(quickAddAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!quickAddCategory) {
      toast.error('Please select a category');
      return;
    }

    const category = categories.find((c) => c.id === quickAddCategory);
    if (!category) {
      toast.error('Category not found');
      return;
    }

    setQuickAddSubmitting(true);
    try {
      await addTransaction(
        {
          amount,
          type: quickAddType,
          categoryId: quickAddCategory,
          note: quickAddNote || category.name,
          date: getTodayDate(),
        },
        category.id,
        category.name,
        category.color
      );

      if (quickAddType === 'income') {
        const messages = [
          "Money in the bank! 🎉",
          "Cha-ching! 💰",
          "Nice! Income logged! 💵",
          "Getting paid! 🤑",
        ];
        toast.success(messages[Math.floor(Math.random() * messages.length)]);
      } else {
        toast.success('Transaction added');
      }

      if (addAnother) {
        setQuickAddAmount('');
        setQuickAddNote('');
      } else {
        setQuickAddAmount('');
        setQuickAddCategory('');
        setQuickAddNote('');
      }
    } catch {
      toast.error('Failed to add transaction');
    } finally {
      setQuickAddSubmitting(false);
    }
  };

  const filteredCategories = getCategoriesByType(quickAddType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getGreeting()}</h1>
          <p className="text-muted-foreground">Here&apos;s your financial overview</p>
        </div>
        <div 
          className="cursor-pointer select-none" 
          onClick={() => setLogoClicks(c => c + 1)}
        >
          <DollarSign className="h-8 w-8 text-primary" />
        </div>
      </div>

      {showQuote && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center animate-pulse">
          <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-sm italic">{FINANCE_QUOTES[Math.floor(Math.random() * FINANCE_QUOTES.length)]}</p>
        </div>
      )}

      {expenseChange < -10 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-green-500" />
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            {expenseChange < -20 
              ? "Incredible! You've cut spending by over 20% this month!"
              : "Great job! Spending is down this month! Keep it up!"}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <span className={stats.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}>
              {stats.netBalance >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
            </span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(stats.netBalance)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Expenses</CardTitle>
            {expenseChange !== 0 && (
              expenseChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenseChange === 0
                ? 'Same as last month'
                : `${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(0)}% from last month`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Income</CardTitle>
            {incomeChange !== 0 && (
              incomeChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {incomeChange === 0
                ? 'Same as last month'
                : `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}% from last month`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground">Total recorded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Add</CardTitle>
            <CardDescription>Log a transaction in seconds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={quickAddType === 'expense' ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setQuickAddType('expense');
                  setQuickAddCategory('');
                }}
              >
                <Minus className="h-4 w-4 mr-1" /> Expense
              </Button>
              <Button
                variant={quickAddType === 'income' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setQuickAddType('income');
                  setQuickAddCategory('');
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Income
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={quickAddAmount}
                onChange={(e) => setQuickAddAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={quickAddCategory} onValueChange={(v) => v && setQuickAddCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} textValue={cat.name}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="Add a note..."
                value={quickAddNote}
                onChange={(e) => setQuickAddNote(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleQuickAdd(true)}
                disabled={quickAddSubmitting}
              >
                {quickAddSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Another'}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleQuickAdd(false)}
                disabled={quickAddSubmitting}
              >
                {quickAddSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>This month's expense breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p>No expenses this month yet</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-48 w-full md:w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {topCategories.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="text-sm">{cat.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(cat.total)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet</p>
                <p className="text-sm">Add your first transaction above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: tx.categoryColor }}
                      />
                      <div>
                        <p className="text-sm font-medium">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(tx.date)} &bull; {tx.categoryName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        tx.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Due Soon</CardTitle>
              <CardDescription>Upcoming reminders</CardDescription>
            </div>
            <Link href="/reminders">
              <Button variant="ghost" size="sm">
                Manage <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dueSoonReminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No reminders due soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueSoonReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: reminder.categoryColor }}
                      />
                      <div>
                        <p className="text-sm font-medium">{reminder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due on day {reminder.dueDayOfMonth}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(reminder.amount)}</p>
                      <Badge variant={reminder.daysUntil <= 1 ? 'destructive' : 'secondary'}>
                        {reminder.daysUntil === 0
                          ? 'Today'
                          : reminder.daysUntil === 1
                          ? 'Tomorrow'
                          : `${reminder.daysUntil} days`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
