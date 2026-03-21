'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, getCurrentMonth, getMonthRange } from '@/lib/format';
import { toast } from 'sonner';
import type { Budget, BudgetInput } from '@/types';

const MONTHS = [
  { value: '2026-01', label: 'January 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'December 2026' },
];

function getProgressColor(percentage: number): string {
  if (percentage < 60) return 'bg-green-500';
  if (percentage < 85) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStatusBadge(percentage: number, hasBudget: boolean) {
  if (!hasBudget) return <Badge variant="secondary">No Budget Set</Badge>;
  if (percentage < 60) return <Badge className="bg-green-500 hover:bg-green-600">Under Budget</Badge>;
  if (percentage < 85) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Getting Close</Badge>;
  return <Badge variant="destructive">Over Budget</Badge>;
}

export default function BudgetsPage() {
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
        toast.success('Budget updated');
      } else {
        await addBudget(input);
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
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Track your monthly spending limits</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)} items={Object.fromEntries(MONTHS.map(m => [m.value, m.label]))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" /> Add Budget
          </Button>
        </div>
      </div>

      {/* Overall Budget Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Overall Monthly Budget</CardTitle>
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
          <CardDescription>
            {overallBudget
              ? `Budget: ${formatCurrency(overallBudget.amount)} | Spent: ${formatCurrency(totalSpent)} | Remaining: ${formatCurrency(Math.max(0, overallBudget.amount - totalSpent))}`
              : 'Set an overall budget to track your total monthly spending'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallBudget ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(overallPercentage)}`}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{overallPercentage.toFixed(0)}%</span>
                <span>
                  {totalSpent > overallBudget.amount ? (
                    <span className="text-red-500 font-medium">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      Over by {formatCurrency(totalSpent - overallBudget.amount)}
                    </span>
                  ) : (
                    <span>{formatCurrency(overallBudget.amount - totalSpent)} remaining</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" /> Set Overall Budget
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>
            {categoryBudgets.length} of {expenseCategories.length} categories have budgets set
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expense categories yet</p>
              <p className="text-sm">Create categories first to set budgets</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseCategories.map((cat) => {
                const budget = categoryBudgets.find((b) => b.categoryId === cat.id);
                const spent = spendingByCategory.get(cat.id) || 0;
                const percentage = budget ? Math.min((spent / budget.amount) * 100, 999) : 0;

                return (
                  <div key={cat.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{cat.name}</span>
                        {budget ? (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(percentage, true)}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(budget)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(budget.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => {
                            setCategoryId(cat.id);
                            setAmount('');
                            setRollover(false);
                            setEditingBudget(null);
                            setIsDialogOpen(true);
                          }}>
                            <Plus className="h-3 w-3 mr-1" /> Set Budget
                          </Button>
                        )}
                      </div>
                      {budget ? (
                        <div className="space-y-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${getProgressColor(percentage)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                            <span>
                              {spent > budget.amount ? (
                                <span className="text-red-500">
                                  Over by {formatCurrency(spent - budget.amount)}
                                </span>
                              ) : (
                                <span>{formatCurrency(budget.amount - spent)} left</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No budget set</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} items={Object.fromEntries([['overall', 'Overall (All Expenses)'], ...expenseCategories.map(c => [c.id, c.name])])}>
                <SelectTrigger>
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
              <Label htmlFor="amount">Budget Amount</Label>
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
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)} items={Object.fromEntries(MONTHS.map(m => [m.value, m.label]))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rollover"
                checked={rollover}
                onChange={(e) => setRollover(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rollover" className="text-sm font-normal cursor-pointer">
                Rollover unused budget to next month
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
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
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
