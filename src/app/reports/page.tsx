'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/components/haptics-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth, getMonthRange, getMonthName } from '@/lib/format';
import type { CategoryBreakdown } from '@/types';

// Generate a list of the last N months relative to today
function getRecentMonths(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();
}

// Build a list of the last 24 months as options for the range selectors
const MONTH_OPTIONS = getRecentMonths(24);

function getMonthsBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

export default function ReportsPage() {
  const { trigger } = useHaptics();
  const { transactions, loading } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Trend chart range
  const defaultTrendEnd = getCurrentMonth();
  const defaultTrendStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [trendStart, setTrendStart] = useState(defaultTrendStart);
  const [trendEnd, setTrendEnd] = useState(defaultTrendEnd);

  const trendMonths = getMonthsBetween(trendStart, trendEnd);

  const monthlyData = trendMonths.map((month) => {
    const range = getMonthRange(month);
    const monthTransactions = transactions.filter(
      (t) => t.date >= range.start && t.date <= range.end
    );
    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      month: getMonthName(parseInt(month.split('-')[1]) - 1).slice(0, 3),
      income,
      expenses,
      net: income - expenses,
    };
  });

  const currentRange = getMonthRange(selectedMonth);
  const currentMonthTransactions = transactions.filter(
    (t) => t.date >= currentRange.start && t.date <= currentRange.end
  );

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseByCategory = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, { total: number; count: number; name: string; color: string }>>(
      (acc, t) => {
        if (!acc[t.categoryId]) {
          acc[t.categoryId] = {
            total: 0,
            count: 0,
            name: t.categoryName,
            color: t.categoryColor,
          };
        }
        acc[t.categoryId].total += t.amount;
        acc[t.categoryId].count += 1;
        return acc;
      },
      {}
    );

  const categoryBreakdown: CategoryBreakdown[] = Object.entries(expenseByCategory)
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      categoryColor: data.color,
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  const topTransactions = [...currentMonthTransactions]
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const dayOfWeekData = Array.from({ length: 7 }, (_, day) => {
    const dayTransactions = currentMonthTransactions.filter((t) => {
      const date = new Date(t.date);
      return date.getDay() === day && t.type === 'expense';
    });
    const total = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      amount: total,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-base font-medium">Monthly financial analysis</p>
        </div>
        <Select value={selectedMonth} onValueChange={(v) => { void trigger(30); if (v) setSelectedMonth(v); }} items={Object.fromEntries(MONTH_OPTIONS.map((month: string) => { const [year, m] = month.split('-'); return [month, `${getMonthName(parseInt(m) - 1)} ${year}`]; }))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((month: string) => {
              const [year, m] = month.split('-');
              return (
                <SelectItem key={month} value={month}>
                  {getMonthName(parseInt(m) - 1)} {year}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="accent-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Total Income</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-[#00b894] dark:text-[#55efc4]" />
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[#00b894] dark:text-[#55efc4]">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card className="accent-expense">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Total Expenses</CardTitle>
            <ArrowDownLeft className="h-5 w-5 text-[#e17055] dark:text-[#ff7675]" />
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[#e17055] dark:text-[#ff7675]">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card className={totalIncome - totalExpenses >= 0 ? 'accent-income' : 'accent-expense'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Net Balance</CardTitle>
            {totalIncome - totalExpenses >= 0 ? (
              <TrendingUp className="h-5 w-5 text-[#00b894] dark:text-[#55efc4]" />
            ) : (
              <TrendingDown className="h-5 w-5 text-[#e17055] dark:text-[#ff7675]" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`stat-value ${
                totalIncome - totalExpenses >= 0 ? 'text-[#00b894] dark:text-[#55efc4]' : 'text-[#e17055] dark:text-[#ff7675]'
              }`}
            >
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Income vs Expenses Trend</CardTitle>
                <CardDescription>Compare income and spending over time</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Select
                  value={trendStart}
                  onValueChange={(v) => {
                    void trigger(30);
                    if (v && v <= trendEnd) setTrendStart(v);
                  }}
                  items={Object.fromEntries(MONTH_OPTIONS.map((m) => {
                    const [y, mo] = m.split('-');
                    return [m, `${getMonthName(parseInt(mo) - 1).slice(0, 3)} ${y}`];
                  }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.filter((m) => m <= trendEnd).map((m) => {
                      const [y, mo] = m.split('-');
                      return (
                        <SelectItem key={m} value={m}>
                          {getMonthName(parseInt(mo) - 1)} {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground font-medium">to</span>
                <Select
                  value={trendEnd}
                  onValueChange={(v) => {
                    void trigger(30);
                    if (v && v >= trendStart) setTrendEnd(v);
                  }}
                  items={Object.fromEntries(MONTH_OPTIONS.map((m) => {
                    const [y, mo] = m.split('-');
                    return [m, `${getMonthName(parseInt(mo) - 1).slice(0, 3)} ${y}`];
                  }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.filter((m) => m >= trendStart).map((m) => {
                      const [y, mo] = m.split('-');
                      return (
                        <SelectItem key={m} value={m}>
                          {getMonthName(parseInt(mo) - 1)} {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 border-3 border-border rounded-xl p-2 bg-muted/20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs font-bold" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs font-bold" tick={{ fontSize: 11 }} />
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
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#00b894" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#e17055" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground font-medium">
                No expenses this month
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-48 w-full md:w-48 border-3 border-border rounded-xl p-2 bg-muted/20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
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
                  {categoryBreakdown.slice(0, 5).map((cat, index) => (
                    <div key={cat.categoryId} className={`flex items-center justify-between p-2.5 rounded-lg border-2 border-transparent ${index % 2 === 1 ? 'bg-muted/30' : ''} hover:border-border transition-colors`}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-[4px]"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="text-sm font-bold">{cat.categoryName}</span>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Expenses</CardTitle>
            <CardDescription>Largest transactions this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-medium">No expenses this month</div>
            ) : (
              <div className="space-y-1">
                {topTransactions.map((tx, i) => (
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border-3 border-border ${i % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-muted-foreground w-5">{i + 1}.</span>
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: tx.categoryColor }}
                      />
                      <div>
                        <p className="font-bold">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground font-medium">{tx.categoryName}</p>
                      </div>
                    </div>
                    <span className="font-black text-[#e17055] dark:text-[#ff7675]">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Day</CardTitle>
            <CardDescription>Which days you spend the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 border-3 border-border rounded-xl p-2 bg-muted/20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs font-bold" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs font-bold" tick={{ fontSize: 11 }} />
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
                  <Bar dataKey="amount" name="Spending" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
