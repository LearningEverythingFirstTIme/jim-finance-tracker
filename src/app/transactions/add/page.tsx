'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptics } from '@/components/haptics-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Minus, RefreshCw, Camera, X } from 'lucide-react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { getTodayDate } from '@/lib/format';
import { toast } from 'sonner';
import type { TransactionType } from '@/types';

export default function AddTransactionPage() {
  const router = useRouter();
  const { trigger } = useHaptics();
  const { categories, getCategoriesByType } = useCategories();
  const { addTransaction } = useTransactions();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [isRecurring, setIsRecurring] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCategories = getCategoriesByType(type);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Only JPEG and PNG images are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

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
          isRecurring,
        },
        category.id,
        category.name,
        category.color,
        receiptFile || undefined
      );
      
      void trigger("success");
      
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
      
      router.push('/transactions');
    } catch {
      toast.error('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions" onClick={() => void trigger(50)}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Add Transaction</h1>
          <p className="text-muted-foreground text-base font-medium">Log a new transaction</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'destructive' : 'outline'}
                className="flex-1 font-bold"
                onClick={() => {
                  void trigger(30);
                  setType('expense');
                  setCategoryId('');
                }}
              >
                <Minus className="h-4 w-4 mr-2" /> Expense
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                className="flex-1 font-bold"
                onClick={() => {
                  void trigger(30);
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
              <Label htmlFor="amount" className="font-bold">Amount *</Label>
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
              <Label className="font-bold">Category *</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)} items={Object.fromEntries(filteredCategories.map(cat => [cat.id, cat.name]))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="font-bold">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="font-bold">Note (optional)</Label>
              <Input
                id="note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt" className="font-bold">Receipt (optional)</Label>
              {receiptPreview ? (
                <div className="relative inline-block">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-24 h-24 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={clearReceipt}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="receipt"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-sm font-medium">Add receipt photo</span>
                  </label>
                  <input
                    id="receipt"
                    type="file"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    onChange={handleReceiptChange}
                    className="hidden"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">JPEG or PNG, max 10MB</p>
            </div>

            <div 
              className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer select-none hover:bg-muted/50 transition-colors" 
              onClick={() => setIsRecurring(!isRecurring)}
            >
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-5 w-5"
              />
              <div className="w-8 h-8 rounded-sm bg-primary/20 flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="isRecurring" className="cursor-pointer font-bold">Recurring monthly</Label>
                <p className="text-xs text-muted-foreground font-medium">Auto-generate this transaction each month on the same day</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="w-full font-bold"
                disabled={loading}
              >
                {loading ? (
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
