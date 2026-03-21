'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const LAST_6_MONTHS = Array.from({ length: 6 }, (_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}).reverse();

export default function ReportsPage() {
  const { transactions, loading } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const monthlyData = LAST_6_MONTHS.map((month) => {
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
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Monthly financial analysis</p>
        </div>
        <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)} items={Object.fromEntries(LAST_6_MONTHS.map(month => { const [year, m] = month.split('-'); return [month, `${getMonthName(parseInt(m) - 1)} ${year}`]; }))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAST_6_MONTHS.map((month) => {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            {totalIncome - totalExpenses >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalIncome - totalExpenses >= 0 ? 'text-green-500' : 'text-red-500'
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
            <CardTitle>6-Month Trend</CardTitle>
            <CardDescription>Income vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
<Tooltip
  formatter={(value) => formatCurrency(Number(value))}
  contentStyle={{
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
  }}
/>
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No expenses this month
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
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryBreakdown.slice(0, 5).map((cat) => (
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
          <CardHeader>
            <CardTitle>Top Expenses</CardTitle>
            <CardDescription>Largest transactions this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No expenses this month</div>
            ) : (
              <div className="space-y-3">
                {topTransactions.map((tx, i) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">{i + 1}.</span>
                      <span
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: tx.categoryColor }}
                      />
                      <div>
                        <p className="font-medium">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground">{tx.categoryName}</p>
                      </div>
                    </div>
                    <span className="font-medium text-red-500">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Day</CardTitle>
            <CardDescription>Which days you spend the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
<Tooltip
  formatter={(value) => formatCurrency(Number(value))}
  contentStyle={{
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
  }}
/>
                  <Bar dataKey="amount" name="Spending" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
