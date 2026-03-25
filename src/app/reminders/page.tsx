'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Loader2, Bell, Calendar, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useReminders } from '@/hooks/useReminders';
import { useRecurringIncome } from '@/hooks/useRecurringIncome';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, getDaysUntilDue } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Reminder, RecurringIncome, TransactionType } from '@/types';

export default function RemindersPage() {
  const { trigger } = useHaptics();
  const { reminders, loading: remindersLoading, addReminder, updateReminder, deleteReminder } = useReminders();
  const { recurringIncomes, loading: recurringIncomesLoading, addRecurringIncome, updateRecurringIncome, deleteRecurringIncome } = useRecurringIncome();
  const { categories } = useCategories();

  const loading = remindersLoading || recurringIncomesLoading;

  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');
  
  // Expense reminder dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deleteReminderConfirm, setDeleteReminderConfirm] = useState<string | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseDayOfMonth, setExpenseDayOfMonth] = useState('1');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Recurring income dialog state
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);
  const [deleteIncomeConfirm, setDeleteIncomeConfirm] = useState<string | null>(null);
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategoryId, setIncomeCategoryId] = useState('');
  const [incomeDayOfMonth, setIncomeDayOfMonth] = useState('1');
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const remindersWithDays = reminders
    .map((r) => ({ ...r, daysUntil: getDaysUntilDue(r.dueDayOfMonth) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Expense handlers
  const openAddExpenseDialog = () => {
    setEditingReminder(null);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategoryId('');
    setExpenseDayOfMonth('1');
    setExpenseNote('');
    setIsExpenseDialogOpen(true);
  };

  const openEditExpenseDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setExpenseName(reminder.name);
    setExpenseAmount(reminder.amount.toString());
    setExpenseCategoryId(reminder.categoryId);
    setExpenseDayOfMonth(reminder.dueDayOfMonth.toString());
    setExpenseNote(reminder.note);
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseSubmit = async () => {
    const amountNum = parseFloat(expenseAmount);
    const dayNum = parseInt(expenseDayOfMonth);

    if (!expenseName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!expenseCategoryId) {
      toast.error('Please select a category');
      return;
    }
    if (dayNum < 1 || dayNum > 31) {
      toast.error('Day must be between 1 and 31');
      return;
    }

    const category = categories.find((c) => c.id === expenseCategoryId);
    if (!category) {
      toast.error('Category not found');
      return;
    }

    setExpenseSubmitting(true);
    try {
      if (editingReminder) {
        await updateReminder(
          editingReminder.id,
          { name: expenseName, amount: amountNum, dueDayOfMonth: dayNum, note: expenseNote },
          category.id,
          category.name,
          category.color
        );
        void trigger("nudge");
        toast.success('Reminder updated');
      } else {
        await addReminder(
          { name: expenseName, amount: amountNum, categoryId: expenseCategoryId, dueDayOfMonth: dayNum, note: expenseNote },
          category.id,
          category.name,
          category.color
        );
        void trigger("success");
        toast.success('Reminder added');
      }
      setIsExpenseDialogOpen(false);
    } catch {
      toast.error('Failed to save reminder');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteReminder(id);
      void trigger([100, 50, 100]);
      toast.success('Reminder deleted');
      setDeleteReminderConfirm(null);
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

  // Income handlers
  const openAddIncomeDialog = () => {
    setEditingIncome(null);
    setIncomeName('');
    setIncomeAmount('');
    setIncomeCategoryId('');
    setIncomeDayOfMonth('1');
    setIncomeNote('');
    setIsIncomeDialogOpen(true);
  };

  const openEditIncomeDialog = (income: RecurringIncome) => {
    setEditingIncome(income);
    setIncomeName(income.name);
    setIncomeAmount(income.amount.toString());
    setIncomeCategoryId(income.categoryId);
    setIncomeDayOfMonth(income.dayOfMonth.toString());
    setIncomeNote(income.note);
    setIsIncomeDialogOpen(true);
  };

  const handleIncomeSubmit = async () => {
    const amountNum = parseFloat(incomeAmount);
    const dayNum = parseInt(incomeDayOfMonth);

    if (!incomeName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!incomeCategoryId) {
      toast.error('Please select a category');
      return;
    }
    if (dayNum < 1 || dayNum > 31) {
      toast.error('Day must be between 1 and 31');
      return;
    }

    const category = categories.find((c) => c.id === incomeCategoryId);
    if (!category) {
      toast.error('Category not found');
      return;
    }

    setIncomeSubmitting(true);
    try {
      if (editingIncome) {
        await updateRecurringIncome(
          editingIncome.id,
          { name: incomeName, amount: amountNum, dayOfMonth: dayNum, note: incomeNote },
          category.id,
          category.name,
          category.color
        );
        void trigger("nudge");
        toast.success('Recurring income updated');
      } else {
        await addRecurringIncome(
          { name: incomeName, amount: amountNum, dayOfMonth: dayNum, categoryId: incomeCategoryId, note: incomeNote },
          category.id,
          category.name,
          category.color
        );
        void trigger("success");
        toast.success('Recurring income added');
      }
      setIsIncomeDialogOpen(false);
    } catch {
      toast.error('Failed to save recurring income');
    } finally {
      setIncomeSubmitting(false);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await deleteRecurringIncome(id);
      void trigger([100, 50, 100]);
      toast.success('Recurring income deleted');
      setDeleteIncomeConfirm(null);
    } catch {
      toast.error('Failed to delete recurring income');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalMonthlyExpenses = reminders.reduce((sum, r) => sum + r.amount, 0);
  const totalMonthlyIncome = recurringIncomes.reduce((sum, ri) => sum + ri.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Recurring Items</h1>
          <p className="text-muted-foreground text-base font-medium">Monthly bills and income</p>
        </div>
        <Button 
          onClick={() => {
            void trigger(30);
            if (activeTab === 'expenses') {
              openAddExpenseDialog();
            } else {
              openAddIncomeDialog();
            }
          }} 
          className="font-bold"
        >
          <Plus className="h-4 w-4 mr-2" /> 
          Add {activeTab === 'expenses' ? 'Bill' : 'Income'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="accent-expense">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Monthly Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[var(--destructive)]">{formatCurrency(totalMonthlyExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{reminders.length} recurring expense{reminders.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="accent-income">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[var(--success)]">{formatCurrency(totalMonthlyIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{recurringIncomes.length} recurring income{recurringIncomes.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className={totalMonthlyIncome >= totalMonthlyExpenses ? 'accent-income' : 'accent-expense'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Net Monthly</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">
              {formatCurrency(totalMonthlyIncome - totalMonthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {totalMonthlyIncome >= totalMonthlyExpenses ? 'Surplus' : 'Deficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { void trigger(30); setActiveTab(v as 'expenses' | 'income'); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="expenses" className="font-bold">
            <ArrowDownLeft className="h-4 w-4 mr-1" />
            Bills ({reminders.length})
          </TabsTrigger>
          <TabsTrigger value="income" className="font-bold">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Income ({recurringIncomes.length})
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6">
          {reminders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border flex items-center justify-center mb-4 [box-shadow:var(--btn-shadow)]">
                  <ArrowDownLeft className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-lg font-bold">No bills yet</p>
                <p className="text-sm font-medium mb-4">Add reminders for recurring monthly bills</p>
                <Button onClick={openAddExpenseDialog} className="font-bold">
                  <Plus className="h-4 w-4 mr-2" /> Add Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {remindersWithDays.map((reminder) => (
                <Card 
                  key={reminder.id} 
                  className={cn(
                    'relative overflow-hidden',
                    reminder.daysUntil <= 1 ? 'border-l-4 border-l-[var(--destructive)]' : 
                    reminder.daysUntil <= 7 ? 'border-l-4 border-l-[var(--warning)]' : 
                    'border-l-4 border-l-muted-foreground/30'
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-[4px]"
                          style={{ backgroundColor: reminder.categoryColor }}
                        />
                        <CardTitle className="text-lg">{reminder.name}</CardTitle>
                        {reminder.daysUntil === 0 && (
                          <span className="w-2 h-2 rounded-full bg-[var(--destructive)] pulse-urgent" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditExpenseDialog(reminder)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteReminderConfirm(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value mb-2 text-[var(--destructive)]">-{formatCurrency(reminder.amount)}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Due on day {reminder.dueDayOfMonth}</span>
                      <Badge
                        variant={
                          reminder.daysUntil <= 1
                            ? 'destructive'
                            : reminder.daysUntil <= 7
                            ? 'warning'
                            : 'secondary'
                        }
                        className="font-bold"
                      >
                        {reminder.daysUntil === 0
                          ? 'Today'
                          : reminder.daysUntil === 1
                          ? 'Tomorrow'
                          : `${reminder.daysUntil} days`}
                      </Badge>
                    </div>
                    {reminder.note && (
                      <p className="text-sm text-muted-foreground mt-2 font-medium">{reminder.note}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="mt-6">
          {recurringIncomes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border flex items-center justify-center mb-4 [box-shadow:var(--btn-shadow)]">
                  <ArrowUpRight className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-lg font-bold">No recurring income yet</p>
                <p className="text-sm font-medium mb-4">Add your regular income sources (paychecks, etc.)</p>
                <Button onClick={openAddIncomeDialog} className="font-bold">
                  <Plus className="h-4 w-4 mr-2" /> Add Income
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recurringIncomes.map((income) => (
                <Card 
                  key={income.id} 
                  className="relative overflow-hidden border-l-4 border-l-[var(--success)]"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-[4px]"
                          style={{ backgroundColor: income.categoryColor }}
                        />
                        <CardTitle className="text-lg">{income.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditIncomeDialog(income)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteIncomeConfirm(income.id)}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value mb-2 text-[var(--success)]">+{formatCurrency(income.amount)}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4" />
                      <span className="font-medium">Arrives on day {income.dayOfMonth}</span>
                      <Badge variant="success" className="font-bold">
                        Recurring
                      </Badge>
                    </div>
                    {income.note && (
                      <p className="text-sm text-muted-foreground mt-2 font-medium">{income.note}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
            <DialogDescription>
              {editingReminder ? 'Update bill details' : 'Set up a monthly bill reminder'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expenseName" className="font-bold">Name *</Label>
              <Input
                id="expenseName"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="e.g., Netflix, Rent, Car Insurance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseAmount" className="font-bold">Amount *</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Category *</Label>
              <Select value={expenseCategoryId} onValueChange={(v) => v && setExpenseCategoryId(v)} items={Object.fromEntries(expenseCategories.map(cat => [cat.id, cat.name]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDay" className="font-bold">Due Day of Month *</Label>
              <Input
                id="expenseDay"
                type="number"
                min="1"
                max="31"
                value={expenseDayOfMonth}
                onChange={(e) => setExpenseDayOfMonth(e.target.value)}
                placeholder="1-31"
              />
              <p className="text-xs text-muted-foreground font-medium">
                Day of the month this bill is due (1-31)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseNote" className="font-bold">Note (optional)</Label>
              <Input
                id="expenseNote"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="Add a note..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleExpenseSubmit} disabled={expenseSubmitting} className="font-bold">
                {expenseSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Income Dialog */}
      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit Recurring Income' : 'Add Recurring Income'}</DialogTitle>
            <DialogDescription>
              {editingIncome ? 'Update income details' : 'Set up a recurring income source (paycheck, etc.)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incomeName" className="font-bold">Name *</Label>
              <Input
                id="incomeName"
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                placeholder="e.g., Paycheck, Social Security"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeAmount" className="font-bold">Amount *</Label>
              <Input
                id="incomeAmount"
                type="number"
                step="0.01"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Category *</Label>
              <Select value={incomeCategoryId} onValueChange={(v) => v && setIncomeCategoryId(v)} items={Object.fromEntries(incomeCategories.map(cat => [cat.id, cat.name]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeDay" className="font-bold">Day of Month *</Label>
              <Input
                id="incomeDay"
                type="number"
                min="1"
                max="31"
                value={incomeDayOfMonth}
                onChange={(e) => setIncomeDayOfMonth(e.target.value)}
                placeholder="1-31"
              />
              <p className="text-xs text-muted-foreground font-medium">
                Day of the month this income arrives (1-31)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeNote" className="font-bold">Note (optional)</Label>
              <Input
                id="incomeNote"
                value={incomeNote}
                onChange={(e) => setIncomeNote(e.target.value)}
                placeholder="Add a note..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsIncomeDialogOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleIncomeSubmit} disabled={incomeSubmitting} className="font-bold">
                {incomeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Reminder Confirmation */}
      <Dialog open={!!deleteReminderConfirm} onOpenChange={() => setDeleteReminderConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bill reminder?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteReminderConfirm(null)} className="font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteReminderConfirm && handleDeleteReminder(deleteReminderConfirm)}
              className="font-bold"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Income Confirmation */}
      <Dialog open={!!deleteIncomeConfirm} onOpenChange={() => setDeleteIncomeConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Income</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring income?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteIncomeConfirm(null)} className="font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteIncomeConfirm && handleDeleteIncome(deleteIncomeConfirm)}
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
