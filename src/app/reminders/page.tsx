'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Bell, Calendar } from 'lucide-react';
import { useReminders } from '@/hooks/useReminders';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, getDaysUntilDue } from '@/lib/format';
import { toast } from 'sonner';
import type { Reminder } from '@/types';

export default function RemindersPage() {
  const { reminders, loading, addReminder, updateReminder, deleteReminder } = useReminders();
  const { categories } = useCategories();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('1');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const remindersWithDays = reminders
    .map((r) => ({ ...r, daysUntil: getDaysUntilDue(r.dueDayOfMonth) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const openAddDialog = () => {
    setEditingReminder(null);
    setName('');
    setAmount('');
    setCategoryId('');
    setDueDayOfMonth('1');
    setNote('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setName(reminder.name);
    setAmount(reminder.amount.toString());
    setCategoryId(reminder.categoryId);
    setDueDayOfMonth(reminder.dueDayOfMonth.toString());
    setNote(reminder.note);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    const dayNum = parseInt(dueDayOfMonth);

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (dayNum < 1 || dayNum > 31) {
      toast.error('Day must be between 1 and 31');
      return;
    }

    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      toast.error('Category not found');
      return;
    }

    setSubmitting(true);
    try {
      if (editingReminder) {
        await updateReminder(
          editingReminder.id,
          { name, amount: amountNum, dueDayOfMonth: dayNum, note },
          category.id,
          category.name,
          category.color
        );
        toast.success('Reminder updated');
      } else {
        await addReminder(
          { name, amount: amountNum, categoryId, dueDayOfMonth: dayNum, note },
          category.id,
          category.name,
          category.color
        );
        toast.success('Reminder added');
      }
      setIsDialogOpen(false);
    } catch {
      toast.error('Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
      toast.success('Reminder deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

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
          <h1 className="text-3xl font-black tracking-tight">Reminders</h1>
          <p className="text-muted-foreground text-base font-medium">Monthly bill reminders</p>
        </div>
        <Button onClick={openAddDialog} className="font-bold">
          <Plus className="h-4 w-4 mr-2" /> Add Reminder
        </Button>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border-3 border-border flex items-center justify-center mb-4 [box-shadow:var(--btn-shadow)]">
              <Bell className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-lg font-bold">No reminders yet</p>
            <p className="text-sm font-medium">Add reminders for recurring monthly bills</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {remindersWithDays.map((reminder) => (
            <Card 
              key={reminder.id} 
              className={`relative overflow-hidden ${reminder.daysUntil <= 1 ? 'border-l-4 border-l-[#e17055] dark:border-l-[#ff7675]' : reminder.daysUntil <= 7 ? 'border-l-4 border-l-[#fdcb6e] dark:border-l-[#ffeaa7]' : 'border-l-4 border-l-muted-foreground/30'}`}
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
                      <span className="w-2 h-2 rounded-full bg-[#e17055] dark:bg-[#ff7675] pulse-urgent" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(reminder)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteConfirm(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[#e17055] dark:text-[#ff7675]" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="stat-value mb-2">{formatCurrency(reminder.amount)}</div>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
            <DialogDescription>
              {editingReminder ? 'Update reminder details' : 'Set up a monthly bill reminder'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Netflix, Rent, Car Insurance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Category *</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} items={Object.fromEntries(expenseCategories.map(cat => [cat.id, cat.name]))}>
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
              <Label htmlFor="dueDay" className="font-bold">Due Day of Month *</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={dueDayOfMonth}
                onChange={(e) => setDueDayOfMonth(e.target.value)}
                placeholder="1-31"
              />
              <p className="text-xs text-muted-foreground font-medium">
                Day of the month this bill is due (1-31)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="font-bold">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
              />
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

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reminder?
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
