'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Filter, Loader2, Pencil, Trash2, RefreshCw, CalendarDays, List, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate, formatDateShort, getTodayDate, getCurrentMonth, getMonthRange } from '@/lib/format';
import { toast } from 'sonner';
import type { Transaction, TransactionType } from '@/types';

export default function TransactionsPage() {
  const { trigger } = useHaptics();
  const { transactions, loading, deleteTransaction, updateTransaction, getPendingRecurring, generateRecurringForMonth } = useTransactions();
  const { categories } = useCategories();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonth());

  const currentMonth = getCurrentMonth();
  const pendingRecurring = getPendingRecurring(currentMonth);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.note.toLowerCase().includes(search.toLowerCase()) ||
      tx.categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || tx.categoryId === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const groupedTransactions = filteredTransactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      void trigger([100, 50, 100]);
      toast.success('Transaction deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const handleGenerateRecurring = async () => {
    setGeneratingRecurring(true);
    try {
      const count = await generateRecurringForMonth(currentMonth);
      void trigger("success");
      toast.success(`Generated ${count} recurring transaction${count !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to generate recurring transactions');
    } finally {
      setGeneratingRecurring(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-base font-medium">{filteredTransactions.length} transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card [box-shadow:var(--btn-shadow)]">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-0"
              onClick={() => { void trigger(30); setViewMode('list'); }}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none border-0 border-l-3 border-l-border"
              onClick={() => { void trigger(30); setViewMode('calendar'); }}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/transactions/add">
            <Button className="font-bold">
              <Plus className="h-4 w-4 mr-2" /> Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      {pendingRecurring.length > 0 && (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {pendingRecurring.length} recurring transaction{pendingRecurring.length !== 1 ? 's' : ''} pending for this month
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {pendingRecurring.map((t) => t.note || t.categoryName).join(', ')}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleGenerateRecurring} disabled={generatingRecurring} className="font-bold">
              {generatingRecurring ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
          </CardContent>
        </Card>
      )}

      {viewMode === 'calendar' && (
        <CalendarView
          transactions={transactions}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      )}

      {viewMode === 'list' && <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => { void trigger(30); setSearch(e.target.value); }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => { void trigger(30); setTypeFilter(v as TransactionType | 'all'); }} items={{ all: 'All Types', income: 'Income', expense: 'Expense' }}>
                <SelectTrigger className="w-36">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { void trigger(30); if (v) setCategoryFilter(v); }} items={{ all: 'All Categories', ...Object.fromEntries(categories.map(cat => [cat.id, cat.name])) }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-bold">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="bg-muted px-2 py-1 rounded-sm border border-border">{formatDate(date)}</span>
                  </h3>
                  <div className="space-y-1">
                    {groupedTransactions[date].map((tx, index) => (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between p-3 rounded-xl border border-border transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--card-shadow)] ${index % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2 h-10 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tx.categoryColor }}
                          />
                          <div>
                            <p className="font-bold">{tx.note || tx.categoryName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs font-bold">
                                {tx.categoryName}
                              </Badge>
                              <Badge
                                variant={tx.type === 'income' ? 'success' : 'outline'}
                                className="text-xs font-bold"
                              >
                                {tx.type}
                              </Badge>
                              {tx.isRecurring && (
                                <Badge variant="outline" className="text-xs gap-1 font-bold border border-primary text-primary">
                                  <RefreshCw className="h-2.5 w-2.5" /> Recurring
                                </Badge>
                              )}
                              {tx.recurringSourceId && (
                                <Badge variant="outline" className="text-xs gap-1 font-bold border border-primary text-primary">
                                  <RefreshCw className="h-2.5 w-2.5" /> Auto
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-lg font-black ${
                              tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--destructive)]'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => { void trigger("nudge"); setEditTransaction(tx); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteConfirm(tx.id)}
                            >
                              <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="font-bold">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditTransactionDialog
        transaction={editTransaction}
        onClose={() => setEditTransaction(null)}
        onSave={async (data) => {
          if (!editTransaction) return;
          try {
            await updateTransaction(editTransaction.id, data);
            toast.success('Transaction updated');
            setEditTransaction(null);
          } catch {
            toast.error('Failed to update transaction');
          }
        }}
      />
    </div>
  );
}

function EditTransactionDialog({
  transaction,
  onClose,
  onSave,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (data: { amount: number; note: string; date: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [note, setNote] = useState(transaction?.note || '');
  const [date, setDate] = useState(transaction?.date || getTodayDate());
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        amount: parseFloat(amount),
        note,
        date,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="font-bold">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CalendarView({
  transactions,
  month,
  onMonthChange,
}: {
  transactions: Transaction[];
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const { trigger } = useHaptics();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [year, monthNum] = month.split('-').map(Number);
  const firstDayOfMonth = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const prevMonth = () => {
    void trigger(30);
    const d = new Date(year, monthNum - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    void trigger(30);
    const d = new Date(year, monthNum, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDay(null);
  };

  // Compute daily totals
  const dailyData: Record<string, { income: number; expenses: number; txs: Transaction[] }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dayTxs = transactions.filter((t) => t.date === dateStr);
    const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    dailyData[dateStr] = { income, expenses, txs: dayTxs };
  }

  const selectedDayTxs = selectedDay ? (dailyData[selectedDay]?.txs ?? []) : [];
  const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = getTodayDate();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-bold text-lg">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${month}-${String(day).padStart(2, '0')}`;
              const data = dailyData[dateStr];
              const net = data.income - data.expenses;
              const hasTxs = data.txs.length > 0;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => { void trigger(30); setSelectedDay(isSelected ? null : dateStr); }}
                  className={`
                    relative p-1 rounded-md text-center min-h-[60px] flex flex-col items-center justify-start gap-0.5
                    transition-all border
                    ${isSelected ? 'border-primary bg-primary/10 [box-shadow:var(--btn-shadow)]' : 'border-transparent hover:border-border hover:bg-muted/50'}
                    ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>{day}</span>
                  {hasTxs && (
                    <span className={`text-[10px] font-black leading-tight ${net >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </span>
                  )}
                  {hasTxs && (
                    <span className="text-[9px] text-muted-foreground font-medium">{data.txs.length} tx{data.txs.length !== 1 ? 's' : ''}</span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{formatDate(selectedDay)}</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => { void trigger(30); setSelectedDay(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDayTxs.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm font-medium">No transactions</p>
            ) : (
              <div className="space-y-1">
                {selectedDayTxs.map((tx, index) => (
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-xl border border-border ${index % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-8 rounded-full" style={{ backgroundColor: tx.categoryColor }} />
                      <div>
                        <p className="font-bold text-sm">{tx.note || tx.categoryName}</p>
                        <p className="text-xs text-muted-foreground font-medium">{tx.categoryName}</p>
                      </div>
                    </div>
                    <span className={`font-black ${tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
