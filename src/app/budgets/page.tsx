'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useHaptics } from '@/components/haptics-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Minus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, getCurrentMonth, getMonthRange } from '@/lib/format';
import { toast } from 'sonner';
import type { Budget, BudgetInput } from '@/types';

function generateMonths(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();
  // 6 months back, current month, 11 months forward (18 total)
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  for (let i = 0; i < 18; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
}

const MONTHS = generateMonths();

function getProgressColor(percentage: number): string {
  if (percentage < 60) return 'bg-[var(--success)]';
  if (percentage < 85) return 'bg-[var(--warning)]';
  return 'bg-[var(--destructive)]';
}

function getProgressBorderColor(percentage: number): string {
  if (percentage < 60) return 'border-[var(--success)]';
  if (percentage < 85) return 'border-[var(--warning)]';
  return 'border-[var(--destructive)]';
}

function getStatusBadge(percentage: number, hasBudget: boolean) {
  if (!hasBudget) return <Badge variant="secondary">No Budget Set</Badge>;
  if (percentage < 60) return <Badge className="bg-[var(--success)] text-white border-border">Under Budget</Badge>;
  if (percentage < 85) return <Badge className="bg-[var(--warning)] text-[#1a120b] border-border">Getting Close</Badge>;
  return <Badge variant="destructive">Over Budget</Badge>;
}

export default function BudgetsPage() {
  const { trigger } = useHaptics();
  const { budgets, loading, addBudget, updateBudget, deleteBudget, getBudgetsForMonth, getOverallBudget } = useBudgets();
  const { transactions } = useTransactions();
  const { categories } = useCategories();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<string>('overall');
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  const monthBudgets = useMemo(() => getBudgetsForMonth(selectedMonth), [budgets, selectedMonth]);
  const overallBudget = useMemo(() => getOverallBudget(selectedMonth), [budgets, selectedMonth]);

  const monthSpending = useMemo(() => {
    const range = getMonthRange(selectedMonth);
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      return t.date >= range.start && t.date <= range.end;
    });
  }, [transactions, selectedMonth]);

  const totalSpent = useMemo(() => monthSpending.reduce((sum, t) => sum + t.amount, 0), [monthSpending]);

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthSpending.forEach((t) => {
      const current = map.get(t.categoryId) || 0;
      map.set(t.categoryId, current + t.amount);
    });
    return map;
  }, [monthSpending]);

  const categoryBudgets = useMemo(() => {
    return monthBudgets.filter((b) => b.categoryId !== null);
  }, [monthBudgets]);

  const openAddDialog = () => {
    setEditingBudget(null);
    setCategoryId('overall');
    setAmount('');
    setRollover(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId || 'overall');
    setAmount(budget.amount.toString());
    setRollover(budget.rollover);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const isOverall = categoryId === 'overall';
    const category = isOverall ? null : expenseCategories.find((c) => c.id === categoryId);

    if (!isOverall && !category) {
      toast.error('Please select a valid category');
      return;
    }

    const input: BudgetInput = {
      categoryId: isOverall ? null : categoryId,
      categoryName: isOverall ? null : category!.name,
      categoryColor: isOverall ? null : category!.color,
      amount: amountNum,
      month: selectedMonth,
      rollover,
    };

    setSubmitting(true);
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, input);
        void trigger("nudge");
        toast.success('Budget updated');
      } else {
        await addBudget(input);
        void trigger("success");
        toast.success('Budget added');
      }
      setIsDialogOpen(false);
    } catch {
      toast.error('Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      void trigger([100, 50, 100]);
      toast.success('Budget deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete budget');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overallPercentage = overallBudget ? Math.min((totalSpent / overallBudget.amount) * 100, 999) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Budgets</h1>
          <p className="text-muted-foreground text-base">Track your monthly spending limits</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={(v) => { void trigger(30); if (v) setSelectedMonth(v); }} items={Object.fromEntries(MONTHS.map(m => [m.value, m.label]))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="font-bold">
            <Plus className="h-4 w-4 mr-1" /> Add Budget
          </Button>
        </div>
      </div>

      {/* Overall Budget Card */}
      <Card className={overallBudget ? (overallPercentage >= 85 ? 'border-l-4 border-l-[var(--destructive)]' : overallPercentage >= 60 ? 'border-l-4 border-l-[var(--warning)]' : 'border-l-4 border-l-[var(--success)]') : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-sm bg-primary/20 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Overall Monthly Budget</CardTitle>
            </div>
            {overallBudget ? (
              <div className="flex items-center gap-2">
                {getStatusBadge(overallPercentage, true)}
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(overallBudget)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Badge variant="secondary">No Budget Set</Badge>
            )}
          </div>
          <CardDescription className="font-medium">
            {overallBudget
              ? `Budget: ${formatCurrency(overallBudget.amount)} | Spent: ${formatCurrency(totalSpent)} | Remaining: ${formatCurrency(Math.max(0, overallBudget.amount - totalSpent))}`
              : 'Set an overall budget to track your total monthly spending'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallBudget ? (
            <div className="space-y-3">
              {overallPercentage >= 85 && (
                <div className="flex items-center gap-2 text-[var(--destructive)] text-sm font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  <span className={overallPercentage >= 100 ? 'pulse-urgent' : ''}>
                    {overallPercentage >= 100 ? 'Over budget!' : 'Approaching limit'}
                  </span>
                </div>
              )}
              <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full transition-all rounded-full ${getProgressColor(overallPercentage)}`}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">{overallPercentage.toFixed(0)}%</span>
                <span className="font-medium">
                  {totalSpent > overallBudget.amount ? (
                    <span className="text-[var(--destructive)] font-bold">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      Over by {formatCurrency(totalSpent - overallBudget.amount)}
                    </span>
                  ) : (
                    <span className="font-bold">{formatCurrency(overallBudget.amount - totalSpent)} remaining</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={openAddDialog} className="font-bold">
              <Plus className="h-4 w-4 mr-1" /> Set Overall Budget
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Budgets</CardTitle>
          <CardDescription className="font-medium">
            {categoryBudgets.length} of {expenseCategories.length} categories have budgets set
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium">No expense categories yet</p>
              <p className="text-sm">Create categories first to set budgets</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseCategories.map((cat, index) => {
                const budget = categoryBudgets.find((b) => b.categoryId === cat.id);
                const spent = spendingByCategory.get(cat.id) || 0;
                const percentage = budget ? Math.min((spent / budget.amount) * 100, 999) : 0;
                const isOver = budget && spent > budget.amount;

                return (
                  <div 
                    key={cat.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl border border-border transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--card-shadow)] ${budget ? (percentage >= 85 ? getProgressBorderColor(percentage) : '') : ''} ${index % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}
                  >
                    <div
                      className="w-4 h-4 rounded-[4px] flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold truncate">{cat.name}</span>
                        {budget ? (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(percentage, true)}
                            <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(budget)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm(budget.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-[var(--destructive)]" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => {
                            setCategoryId(cat.id);
                            setAmount('');
                            setRollover(false);
                            setEditingBudget(null);
                            setIsDialogOpen(true);
                          }} className="font-bold">
                            <Plus className="h-3 w-3 mr-1" /> Set Budget
                          </Button>
                        )}
                      </div>
                      {budget ? (
                        <div className="space-y-1.5">
                          <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
                            <div
                              className={`h-full transition-all rounded-full ${getProgressColor(percentage)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                            <span className="font-medium">
                              {isOver ? (
                                <span className="text-[var(--destructive)] font-bold">
                                  Over by {formatCurrency(spent - budget.amount)}
                                </span>
                              ) : (
                                <span className="text-[var(--success)] font-bold">{formatCurrency(budget.amount - spent)} left</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground font-medium">No budget set</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget vs. Actual Chart */}
      {categoryBudgets.length > 0 && (() => {
        const chartData = categoryBudgets.map((b) => {
          const spent = spendingByCategory.get(b.categoryId!) || 0;
          return {
            name: b.categoryName ?? 'Unknown',
            Budget: b.amount,
            Actual: spent,
            color: b.categoryColor ?? '#888',
          };
        });

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget vs. Actual</CardTitle>
              <CardDescription>How spending compares to your budgets this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 border border-border rounded-xl p-2 bg-muted/20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs font-bold" tick={{ fontSize: 11 }} />
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
                    <Bar dataKey="Budget" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Add/Edit Budget Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
            <DialogDescription>
              {editingBudget ? 'Update budget settings' : 'Set a spending limit'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Category</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} items={Object.fromEntries([['overall', 'Overall (All Expenses)'], ...expenseCategories.map(c => [c.id, c.name])])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall (All Expenses)</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold">Budget Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)} items={Object.fromEntries(MONTHS.map(m => [m.value, m.label]))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => { void trigger("nudge"); setRollover(!rollover); }}>
              <input
                type="checkbox"
                id="rollover"
                checked={rollover}
                onChange={(e) => setRollover(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rollover" className="cursor-pointer font-medium">Rollover unused budget to next month</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="font-bold"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
