'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, getCurrentMonth, getMonthRange, getMonthName, getPrevMonth } from '@/lib/format';
import type { CategoryBreakdown, TagBreakdown } from '@/types';

// Generate a list of the last N months relative to today
function getRecentMonths(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();
}

const MONTH_OPTIONS = getRecentMonths(24);

const TAG_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

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

// Custom treemap content
interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  color?: string;
  percentage?: number;
}

function CustomTreemapContent({ x = 0, y = 0, width = 0, height = 0, name, value, color, percentage }: TreemapContentProps) {
  if (width < 40 || height < 25) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color || 'var(--primary)'}
        stroke="var(--border)"
        strokeWidth={2}
        rx={6}
        style={{ opacity: 0.9 }}
      />
      {width > 70 && height > 45 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
          >
            {name && name.length > 12 ? name.slice(0, 11) + '...' : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontWeight="bold"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
          >
            {formatCurrency(value || 0)}
          </text>
        </>
      )}
      {width > 50 && height > 65 && percentage !== undefined && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 24}
          textAnchor="middle"
          fill="rgba(255,255,255,0.8)"
          fontSize={9}
        >
          {percentage.toFixed(0)}%
        </text>
      )}
    </g>
  );
}

export default function ReportsPage() {
  const { trigger } = useHaptics();
  const { transactions, loading } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const defaultTrendEnd = getCurrentMonth();
  const defaultTrendStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [trendStart, setTrendStart] = useState(defaultTrendStart);
  const [trendEnd, setTrendEnd] = useState(defaultTrendEnd);

  const trendMonths = getMonthsBetween(trendStart, trendEnd);
  const previousMonth = getPrevMonth(selectedMonth);

  const currentRange = getMonthRange(selectedMonth);
  const currentMonthTransactions = transactions.filter(
    (t) => t.date >= currentRange.start && t.date <= currentRange.end
  );

  const previousRange = getMonthRange(previousMonth);
  const previousMonthTransactions = transactions.filter(
    (t) => t.date >= previousRange.start && t.date <= previousRange.end
  );

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  // Category breakdown for current month
  const expenseByCategory = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, { total: number; count: number; name: string; color: string }>>(
      (acc, t) => {
        if (!acc[t.categoryId]) {
          acc[t.categoryId] = { total: 0, count: 0, name: t.categoryName, color: t.categoryColor };
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

  // Previous month category breakdown for radar chart
  const previousExpenseByCategory = previousMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, { total: number; name: string }>>((acc, t) => {
      if (!acc[t.categoryId]) {
        acc[t.categoryId] = { total: 0, name: t.categoryName };
      }
      acc[t.categoryId].total += t.amount;
      return acc;
    }, {});

  // Get all categories from both months for radar chart
  const allCategoriesForRadar = useMemo(() => {
    const cats = new Map<string, { name: string; color: string }>();
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => cats.set(t.categoryName, { name: t.categoryName, color: t.categoryColor }));
    previousMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!cats.has(t.categoryName)) {
          cats.set(t.categoryName, { name: t.categoryName, color: t.categoryColor });
        }
      });
    return Array.from(cats.values());
  }, [currentMonthTransactions, previousMonthTransactions]);

  // Build radar chart data
  const radarData = allCategoriesForRadar.map(cat => {
    const currentAmount = Object.values(expenseByCategory)
      .filter(c => c.name === cat.name)
      .reduce((sum, c) => sum + c.total, 0);
    const previousAmount = Object.values(previousExpenseByCategory)
      .filter(c => c.name === cat.name)
      .reduce((sum, c) => sum + c.total, 0);
    return {
      category: cat.name,
      current: currentAmount,
      previous: previousAmount,
      fullMark: Math.max(currentAmount, previousAmount, 100),
    };
  });

  // Treemap data
  const treemapData = categoryBreakdown.map(cat => ({
    name: cat.categoryName,
    value: cat.total,
    color: cat.categoryColor,
    percentage: cat.percentage,
  }));

  // Monthly trend data
  const monthlyData = trendMonths.map((month) => {
    const range = getMonthRange(month);
    const monthTransactions = transactions.filter(t => t.date >= range.start && t.date <= range.end);
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      month: getMonthName(parseInt(month.split('-')[1]) - 1).slice(0, 3),
      income,
      expenses,
      net: income - expenses,
    };
  });

  // Tag data
  const tagTrendData = trendMonths.map((month) => {
    const range = getMonthRange(month);
    const monthTransactions = transactions.filter(t => t.date >= range.start && t.date <= range.end && t.type === 'expense');
    const tagTotals: Record<string, number> = {};
    for (const tx of monthTransactions) {
      for (const tag of tx.tags || []) {
        tagTotals[tag] = (tagTotals[tag] || 0) + tx.amount;
      }
    }
    return { month: getMonthName(parseInt(month.split('-')[1]) - 1).slice(0, 3), ...tagTotals };
  });

  const tagTrendTotals: Record<string, number> = {};
  for (const tx of transactions.filter(t => {
    const trendStartRange = getMonthRange(trendStart);
    const trendEndRange = getMonthRange(trendEnd);
    return t.date >= trendStartRange.start && t.date <= trendEndRange.end && t.type === 'expense';
  })) {
    for (const tag of tx.tags || []) {
      tagTrendTotals[tag] = (tagTrendTotals[tag] || 0) + tx.amount;
    }
  }
  const topTrendTags = Object.entries(tagTrendTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag);

  const expenseByTag = currentMonthTransactions
    .filter((t) => t.type === 'expense' && (t.tags || []).length > 0)
    .reduce<Record<string, { total: number; count: number }>>((acc, t) => {
      for (const tag of t.tags || []) {
        if (!acc[tag]) acc[tag] = { total: 0, count: 0 };
        acc[tag].total += t.amount;
        acc[tag].count += 1;
      }
      return acc;
    }, {});

  const totalTaggedExpenses = Object.values(expenseByTag).reduce((sum, d) => sum + d.total, 0);
  const tagBreakdown: TagBreakdown[] = Object.entries(expenseByTag)
    .map(([tagName, data]) => ({
      tagName,
      total: data.total,
      count: data.count,
      percentage: totalTaggedExpenses > 0 ? (data.total / totalTaggedExpenses) * 100 : 0,
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
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
    };
  });

  const [selectedMonthName] = [getMonthName(parseInt(selectedMonth.split('-')[1]) - 1)];
  const [prevMonthName] = [getMonthName(parseInt(previousMonth.split('-')[1]) - 1)];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-base font-medium">Monthly financial analysis</p>
        </div>
        <Select 
          value={selectedMonth} 
          onValueChange={(v) => { void trigger(30); if (v) setSelectedMonth(v); }}
          items={Object.fromEntries(MONTH_OPTIONS.map((m) => {
            const [y, mo] = m.split('-');
            return [m, `${getMonthName(parseInt(mo) - 1)} ${y}`];
          }))}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => {
              const [y, mo] = m.split('-');
              return <SelectItem key={m} value={m}>{getMonthName(parseInt(mo) - 1)} {y}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="accent-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Total Income</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-[var(--success)]" />
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[var(--success)]">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card className="accent-expense">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Total Expenses</CardTitle>
            <ArrowDownLeft className="h-5 w-5 text-[var(--destructive)]" />
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[var(--destructive)]">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className={totalIncome - totalExpenses >= 0 ? 'accent-income' : 'accent-expense'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Net Balance</CardTitle>
            {totalIncome - totalExpenses >= 0 ? (
              <TrendingUp className="h-5 w-5 text-[var(--success)]" />
            ) : (
              <TrendingDown className="h-5 w-5 text-[var(--destructive)]" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`stat-value ${totalIncome - totalExpenses >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TREEMAP - Full Width */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending Treemap</CardTitle>
            <CardDescription>Visual breakdown - larger boxes = more spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 border border-border rounded-xl p-2 bg-muted/20">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  aspectRatio={4 / 3}
                  stroke="var(--border)"
                  content={<CustomTreemapContent />}
                >
                </Treemap>
              </ResponsiveContainer>
            </div>
            {/* Legend for treemap */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.categoryId} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.categoryColor }} />
                  <span className="text-xs font-bold">{cat.categoryName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RADAR CHART - Compare months */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Spending Comparison</CardTitle>
            <CardDescription>
              {selectedMonthName} vs {prevMonthName} - spider chart comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length < 3 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground font-medium">
                Add at least 3 expense categories to see the comparison
              </div>
            ) : (
              <div className="h-80 border border-border rounded-xl p-4 bg-muted/20">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fill: 'var(--foreground)', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Radar
                      name={prevMonthName}
                      dataKey="previous"
                      stroke="var(--muted-foreground)"
                      fill="var(--muted-foreground)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Radar
                      name={selectedMonthName}
                      dataKey="current"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Legend />
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
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Income vs Expenses Trend */}
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
                onValueChange={(v) => { void trigger(30); if (v && v <= trendEnd) setTrendStart(v); }}
                items={Object.fromEntries(MONTH_OPTIONS.map((m) => {
                  const [y, mo] = m.split('-');
                  return [m, `${getMonthName(parseInt(mo) - 1).slice(0, 3)} ${y}`];
                }))}
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.filter((m) => m <= trendEnd).map((m) => {
                    const [y, mo] = m.split('-');
                    return <SelectItem key={m} value={m}>{getMonthName(parseInt(mo) - 1)} {y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-medium">to</span>
              <Select
                value={trendEnd}
                onValueChange={(v) => { void trigger(30); if (v && v >= trendStart) setTrendEnd(v); }}
                items={Object.fromEntries(MONTH_OPTIONS.map((m) => {
                  const [y, mo] = m.split('-');
                  return [m, `${getMonthName(parseInt(mo) - 1).slice(0, 3)} ${y}`];
                }))}
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.filter((m) => m >= trendStart).map((m) => {
                    const [y, mo] = m.split('-');
                    return <SelectItem key={m} value={m}>{getMonthName(parseInt(mo) - 1)} {y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 border border-border rounded-xl p-2 bg-muted/20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 11 }} />
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
                <Bar dataKey="income" name="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spending by Category + Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                <div className="h-48 w-full md:w-48 border border-border rounded-xl p-2 bg-muted/20">
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
                    <div key={cat.categoryId} className={`flex items-center justify-between p-2.5 rounded-lg border border-transparent ${index % 2 === 1 ? 'bg-muted/30' : ''} hover:border-border transition-colors`}>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-sm font-bold">{cat.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatCurrency(cat.total)}</span>
                        <span className="text-xs text-muted-foreground font-medium">({cat.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border border-border ${i % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-muted-foreground w-5">{i + 1}.</span>
                      <span className="w-2 h-8 rounded-full" style={{ backgroundColor: tx.categoryColor }} />
                      <div>
                        <p className="font-bold">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground font-medium">{tx.categoryName}</p>
                      </div>
                    </div>
                    <span className="font-black text-[var(--destructive)]">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tag Breakdown */}
      {tagBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Tag</CardTitle>
            <CardDescription>Breakdown across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {tagBreakdown.slice(0, 10).map((tag, i) => (
                <div key={tag.tagName} className={`flex items-center justify-between p-3 rounded-lg border border-transparent ${i % 2 === 1 ? 'bg-muted/30' : ''} hover:border-border transition-colors`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">#{tag.tagName}</span>
                    <span className="text-xs text-muted-foreground font-medium">({tag.count} tx{tag.count !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatCurrency(tag.total)}</span>
                    <span className="text-xs text-muted-foreground font-medium">({tag.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Trend + Day of Week */}
      <div className="grid gap-6 lg:grid-cols-2">
        {topTrendTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tag Spending Trend</CardTitle>
              <CardDescription>How your tag spending has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 border border-border rounded-xl p-2 bg-muted/20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 11 }} />
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
                    {topTrendTags.map((tag, index) => (
                      <Bar key={tag} dataKey={tag} name={tag} fill={TAG_COLORS[index % TAG_COLORS.length]} stackId="a" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Day</CardTitle>
            <CardDescription>Which days you spend the most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 border border-border rounded-xl p-2 bg-muted/20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
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
                  <Bar dataKey="amount" name="Spending" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
