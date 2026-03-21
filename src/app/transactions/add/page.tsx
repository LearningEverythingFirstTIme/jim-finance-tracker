'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { getTodayDate } from '@/lib/format';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

export default function AddTransactionPage() {
  const router = useRouter();
  const { categories, getCategoriesByType } = useCategories();
  const { addTransaction } = useTransactions();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const filteredCategories = getCategoriesByType(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      toast.error('Category not found');
      return;
    }

    setLoading(true);
    try {
      await addTransaction(
        {
          amount: amountNum,
          type,
          categoryId,
          note: note || category.name,
          date,
        },
        category.id,
        category.name,
        category.color
      );
      
      if (type === 'income') {
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
        setAmount('');
        setNote('');
        setCategoryId('');
      } else {
        router.push('/transactions');
      }
    } catch {
      toast.error('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Transaction</h1>
          <p className="text-muted-foreground">Log a new transaction</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setType('expense');
                  setCategoryId('');
                }}
              >
                <Minus className="h-4 w-4 mr-2" /> Expense
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  setType('income');
                  setCategoryId('');
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Income
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => setAddAnother(true)}
              >
                {loading && addAnother ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Another'
                )}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
                onClick={() => setAddAnother(false)}
              >
                {loading && !addAnother ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Transaction'
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
