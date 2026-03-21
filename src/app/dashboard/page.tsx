'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHaptics } from '@/components/haptics-provider';
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
  Wallet,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useReminders } from '@/hooks/useReminders';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { formatCurrency, formatDateShort, getDaysUntilDue, getPercentageChange, getTodayDate, getCurrentMonth, getMonthRange } from '@/lib/format';
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
  const { trigger } = useHaptics();
  const { stats, categoryBreakdown, recentTransactions, topCategories, categories, getCategoriesByType, addTransaction, loading } = useDashboardStats();
  const { reminders } = useReminders();
  const { budgets, getOverallBudget } = useBudgets();
  const { goals } = useSavingsGoals();

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

      void trigger("success");

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
          <h1 className="text-3xl font-black tracking-tight">{getGreeting()}</h1>
          <p className="text-muted-foreground text-base">Here&apos;s your financial overview</p>
        </div>
        <div 
          className="cursor-pointer select-none hover:scale-110 transition-transform" 
          onClick={() => { void trigger(30); setLogoClicks(c => c + 1); }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary border-3 border-border flex items-center justify-center [box-shadow:var(--btn-shadow)]">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      {showQuote && (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm italic font-medium">{FINANCE_QUOTES[Math.floor(Math.random() * FINANCE_QUOTES.length)]}</p>
          </CardContent>
        </Card>
      )}

      {expenseChange < -10 && (
        <Card className="bg-[#00b894]/10 border-[#00b894]/30 dark:bg-[#55efc4]/10 dark:border-[#55efc4]/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-5 w-5 text-[#00b894] flex-shrink-0" />
            <p className="text-sm font-bold text-[#00b894] dark:text-[#55efc4]">
              {expenseChange < -20 
                ? "Incredible! You've cut spending by over 20% this month!"
                : "Great job! Spending is down this month! Keep it up!"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards with Colored Left Border Accents */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="accent-balance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Net Balance</CardTitle>
            <span className={stats.netBalance >= 0 ? 'text-[#00b894] dark:text-[#55efc4]' : 'text-[#e17055] dark:text-[#ff7675]'}>
              {stats.netBalance >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
            </span>
          </CardHeader>
          <CardContent>
            <div className={`stat-value ${stats.netBalance >= 0 ? 'text-[#00b894] dark:text-[#55efc4]' : 'text-[#e17055] dark:text-[#ff7675]'}`}>
              {formatCurrency(stats.netBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">All time</p>
          </CardContent>
        </Card>

        <Card className="accent-expense">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">This Month Expenses</CardTitle>
            {expenseChange !== 0 && (
              expenseChange > 0 ? (
                <TrendingUp className="h-5 w-5 text-[#e17055] dark:text-[#ff7675]" />
              ) : (
                <TrendingDown className="h-5 w-5 text-[#00b894] dark:text-[#55efc4]" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="stat-value">{formatCurrency(stats.thisMonthExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {expenseChange === 0
                ? 'Same as last month'
                : `${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(0)}% from last month`}
            </p>
          </CardContent>
        </Card>

        <Card className="accent-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">This Month Income</CardTitle>
            {incomeChange !== 0 && (
              incomeChange > 0 ? (
                <TrendingUp className="h-5 w-5 text-[#00b894] dark:text-[#55efc4]" />
              ) : (
                <TrendingDown className="h-5 w-5 text-[#e17055] dark:text-[#ff7675]" />
              )
            )}
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[#00b894] dark:text-[#55efc4]">{formatCurrency(stats.thisMonthIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {incomeChange === 0
                ? 'Same as last month'
                : `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}% from last month`}
            </p>
          </CardContent>
        </Card>

        <Card className="accent-neutral">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Status & Savings Goals Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-primary/20 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Budget Status</CardTitle>
            </div>
            <Link href="/budgets">
              <Button variant="ghost" size="sm" className="font-bold">
                Manage <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentMonth = getCurrentMonth();
              const overallBudget = getOverallBudget(currentMonth);
              const range = getMonthRange(currentMonth);
              const thisMonthExpenses = stats.thisMonthExpenses;
              
              if (!overallBudget) {
                return (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="font-medium">No budget set for this month</p>
                    <Link href="/budgets">
                      <Button variant="outline" size="sm" className="mt-3 font-bold">
                        Set Budget
                      </Button>
                    </Link>
                  </div>
                );
              }

              const percentage = Math.min((thisMonthExpenses / overallBudget.amount) * 100, 100);
              const remaining = overallBudget.amount - thisMonthExpenses;
              const isOver = thisMonthExpenses > overallBudget.amount;
              const isClose = percentage >= 80 && !isOver;

              return (
                <div className="space-y-3">
                  {isOver && (
                    <div className="flex items-center gap-2 text-[#e17055] dark:text-[#ff7675] text-sm font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Over budget by {formatCurrency(Math.abs(remaining))}</span>
                    </div>
                  )}
                  {isClose && (
                    <div className="flex items-center gap-2 text-[#fdcb6e] dark:text-[#ffeaa7] text-sm font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Approaching budget limit</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Spent</span>
                    <span className="font-bold">{formatCurrency(thisMonthExpenses)}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden border-2 border-border">
                    <div
                      className={`h-full transition-all rounded-full ${isOver ? 'bg-[#e17055] dark:bg-[#ff7675]' : isClose ? 'bg-[#fdcb6e] dark:bg-[#ffeaa7]' : 'bg-[#00b894] dark:bg-[#55efc4]'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Budget</span>
                    <span className="font-bold">{formatCurrency(overallBudget.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Remaining</span>
                    <span className={`font-bold ${isOver ? 'text-[#e17055] dark:text-[#ff7675]' : 'text-[#00b894] dark:text-[#55efc4]'}`}>
                      {formatCurrency(Math.max(0, remaining))}
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[6px] bg-primary/20 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Savings Goals</CardTitle>
            </div>
            <Link href="/goals">
              <Button variant="ghost" size="sm" className="font-bold">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="font-medium">No savings goals yet</p>
                <Link href="/goals">
                  <Button variant="outline" size="sm" className="mt-3 font-bold">
                    Create Goal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Total Saved</span>
                  <span className="font-bold text-[#00b894] dark:text-[#55efc4]">
                    {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
                  </span>
                </div>
                {goals.slice(0, 3).map((goal) => {
                  const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-medium">{goal.name}</span>
                        <span className="text-muted-foreground font-medium">
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden border-2 border-border">
                        <div
                          className="h-full transition-all rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: goal.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Add Card with Orange Header */}
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="bg-primary py-3 px-6 -mt-1 -mx-0 border-b-3 border-primary/80">
            <CardTitle className="text-white">Quick Add</CardTitle>
            <p className="text-white/80 text-sm font-medium">Log a transaction in seconds</p>
          </div>
          <CardContent className="space-y-4 pt-5">
            <div className="flex gap-2">
              <Button
                variant={quickAddType === 'expense' ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1 font-bold"
                onClick={() => {
                  void trigger(30);
                  setQuickAddType('expense');
                  setQuickAddCategory('');
                }}
              >
                <Minus className="h-4 w-4 mr-1" /> Expense
              </Button>
              <Button
                variant={quickAddType === 'income' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 font-bold"
                onClick={() => {
                  void trigger(30);
                  setQuickAddType('income');
                  setQuickAddCategory('');
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Income
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold">Amount</Label>
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
              <Label className="font-bold">Category</Label>
              <Select value={quickAddCategory} onValueChange={(v) => v && setQuickAddCategory(v)} items={Object.fromEntries(filteredCategories.map(cat => [cat.id, cat.name]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="font-bold">Note (optional)</Label>
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
                className="flex-1 font-bold"
                onClick={() => handleQuickAdd(true)}
                disabled={quickAddSubmitting}
              >
                {quickAddSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Another'}
              </Button>
              <Button
                className="flex-1 font-bold"
                onClick={() => handleQuickAdd(false)}
                disabled={quickAddSubmitting}
              >
                {quickAddSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spending Chart with Border */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
            <CardDescription>This month&apos;s expense breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p className="font-medium">No expenses this month yet</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-48 w-full md:w-48 border-2 border-border rounded-xl p-2 bg-muted/30">
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
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          border: '3px solid var(--border)',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                          boxShadow: 'var(--btn-shadow)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {topCategories.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border-2 border-transparent hover:border-border transition-colors">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-[4px]"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="text-sm font-medium">{cat.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatCurrency(cat.total)}</span>
                        <span className="text-xs text-muted-foreground font-medium">
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
        {/* Recent Transactions with Alternating Rows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <CardDescription>Your latest activity</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="font-bold">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">Add your first transaction above</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 border-transparent ${index % 2 === 1 ? 'bg-muted/30' : ''} hover:border-border transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: tx.categoryColor }}
                      />
                      <div>
                        <p className="text-sm font-bold">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatDateShort(tx.date)} &bull; {tx.categoryName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        tx.type === 'income' ? 'text-[#00b894] dark:text-[#55efc4]' : 'text-[#e17055] dark:text-[#ff7675]'
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

        {/* Due Soon with Urgency Indicators */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Due Soon</CardTitle>
              <CardDescription>Upcoming reminders</CardDescription>
            </div>
            <Link href="/reminders">
              <Button variant="ghost" size="sm" className="font-bold">
                Manage <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dueSoonReminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-12 h-12 rounded-xl bg-muted/50 border-2 border-border flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p className="font-medium">No reminders due soon</p>
              </div>
            ) : (
              <div className="space-y-1">
                {dueSoonReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 border-transparent hover:border-border transition-colors ${reminder.daysUntil <= 1 ? 'bg-[#e17055]/10 dark:bg-[#ff7675]/10' : 'bg-muted/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: reminder.categoryColor }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{reminder.name}</p>
                          {reminder.daysUntil === 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#e17055] dark:bg-[#ff7675] pulse-urgent" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Due on day {reminder.dueDayOfMonth}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(reminder.amount)}</p>
                      <Badge variant={reminder.daysUntil <= 1 ? 'destructive' : reminder.daysUntil <= 3 ? 'warning' : 'secondary'}>
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
