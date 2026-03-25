'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import { useCashFlowSettings } from '@/hooks/useCashFlowSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useReminders } from '@/hooks/useReminders';
import { useRecurringIncome } from '@/hooks/useRecurringIncome';
import { calculateCashFlow, generateCalendarGrid, getDayNames, type CashFlowCalculationResult } from '@/lib/cash-flow';
import {
  formatCurrency,
  getCurrentMonth,
  getMonthYear,
  getMonthName,
  getNextMonth,
  getPrevMonth,
  formatDate,
  getTodayDate,
} from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CashFlowDay, CashFlowItem } from '@/types';

export default function CashFlowPage() {
  const { trigger } = useHaptics();
  const { settings, loading: settingsLoading, saveSettings, updateStartingBalance } = useCashFlowSettings();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { reminders, loading: remindersLoading } = useReminders();
  const { recurringIncomes, loading: recurringIncomesLoading } = useRecurringIncome();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CashFlowDay | null>(null);
  const [startingBalanceInput, setStartingBalanceInput] = useState('');
  const [asOfDateInput, setAsOfDateInput] = useState(getTodayDate());
  const [thresholdInput, setThresholdInput] = useState('300');
  const [saving, setSaving] = useState(false);

  const loading = settingsLoading || transactionsLoading || remindersLoading || recurringIncomesLoading;

  // Sync form inputs when settings load
  useEffect(() => {
    if (settings) {
      setStartingBalanceInput(settings.startingBalance.toString());
      setAsOfDateInput(settings.asOfDate || getTodayDate());
      setThresholdInput(settings.lowBalanceThreshold.toString());
    }
  }, [settings]);

  // Calculate cash flow for the selected month
  const cashFlowResult = useMemo<CashFlowCalculationResult | null>(() => {
    if (loading || !settings) return null;

    return calculateCashFlow({
      month: selectedMonth,
      startingBalance: settings.startingBalance,
      asOfDate: settings.asOfDate,
      lowBalanceThreshold: settings.lowBalanceThreshold,
      transactions,
      reminders,
      recurringIncomes,
    });
  }, [loading, settings, selectedMonth, transactions, reminders, recurringIncomes]);

  const { year, month } = getMonthYear(selectedMonth);
  const calendarGrid = generateCalendarGrid(year, month);
  const dayNames = getDayNames();

  const handleSaveSettings = async () => {
    const balance = parseFloat(startingBalanceInput);
    const threshold = parseFloat(thresholdInput);

    if (isNaN(balance)) {
      toast.error('Please enter a valid starting balance');
      return;
    }

    if (isNaN(threshold) || threshold < 0) {
      toast.error('Please enter a valid threshold');
      return;
    }

    if (!asOfDateInput) {
      toast.error('Please select an "as of" date');
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        startingBalance: balance,
        asOfDate: asOfDateInput,
        lowBalanceThreshold: threshold,
      });
      void trigger('success');
      toast.success('Cash flow settings saved');
      setIsSettingsDialogOpen(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevMonth = () => {
    void trigger(30);
    setSelectedMonth(getPrevMonth(selectedMonth));
  };

  const handleNextMonth = () => {
    void trigger(30);
    setSelectedMonth(getNextMonth(selectedMonth));
  };

  // Find a day in the cash flow result by day number
  const getDayData = (dayNum: number): CashFlowDay | undefined => {
    return cashFlowResult?.days.find(d => d.dayOfMonth === dayNum);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show setup prompt if no settings
  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground text-base font-medium">See where your money goes each month</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="w-20 h-20 rounded-xl bg-muted/50 border border-border flex items-center justify-center mb-4 [box-shadow:var(--btn-shadow)]">
              <Calendar className="h-10 w-10 opacity-50" />
            </div>
            <p className="text-xl font-bold mb-2">Set Up Cash Flow</p>
            <p className="text-sm mb-6 text-center max-w-md">
              Enter your current account balance to start tracking your projected cash flow throughout the month.
            </p>
            <Button onClick={() => setIsSettingsDialogOpen(true)} className="font-bold">
              <Settings className="h-4 w-4 mr-2" /> Get Started
            </Button>
          </CardContent>
        </Card>

        <SettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          startingBalance={startingBalanceInput}
          setStartingBalance={setStartingBalanceInput}
          asOfDate={asOfDateInput}
          setAsOfDate={setAsOfDateInput}
          threshold={thresholdInput}
          setThreshold={setThresholdInput}
          onSave={handleSaveSettings}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Cash Flow</h1>
          <p className="text-muted-foreground text-base font-medium">
            Balance as of {formatDate(settings.asOfDate)}: {formatCurrency(settings.startingBalance)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSettingsDialogOpen(true)} className="font-bold">
            <Settings className="h-4 w-4 mr-1" /> Update Balance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {cashFlowResult && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="accent-income">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Starting Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">{formatCurrency(cashFlowResult.startingBalance)}</div>
            </CardContent>
          </Card>

          <Card className="accent-income">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-[var(--success)]" />
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value text-[var(--success)]">{formatCurrency(cashFlowResult.totalIncome)}</div>
            </CardContent>
          </Card>

          <Card className="accent-expense">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-[var(--destructive)]" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value text-[var(--destructive)]">{formatCurrency(cashFlowResult.totalExpenses)}</div>
            </CardContent>
          </Card>

          <Card className={cashFlowResult.endingBalance >= cashFlowResult.startingBalance ? 'accent-income' : 'accent-expense'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Ending Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="stat-value">
                {formatCurrency(cashFlowResult.endingBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {cashFlowResult.netChange >= 0 ? (
                  <span className="text-[var(--success)]">+{formatCurrency(cashFlowResult.netChange)} this month</span>
                ) : (
                  <span className="text-[var(--destructive)]">{formatCurrency(cashFlowResult.netChange)} this month</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning Banner */}
      {cashFlowResult?.hasNegativeDays && (
        <Card className="border-l-4 border-l-[var(--destructive)] bg-[var(--destructive)]/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
            <div>
              <p className="font-bold text-sm">Negative Balance Warning</p>
              <p className="text-xs text-muted-foreground">
                Your balance is projected to go negative. Lowest: {formatCurrency(cashFlowResult.lowestBalance)} on {formatDate(cashFlowResult.lowestBalanceDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {cashFlowResult?.hasLowBalanceDays && !cashFlowResult.hasNegativeDays && (
        <Card className="border-l-4 border-l-[var(--warning)] bg-[var(--warning)]/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
            <div>
              <p className="font-bold text-sm">Low Balance Warning</p>
              <p className="text-xs text-muted-foreground">
                Your balance is projected to drop below {formatCurrency(settings.lowBalanceThreshold)}. Lowest: {formatCurrency(cashFlowResult.lowestBalance)} on {formatDate(cashFlowResult.lowestBalanceDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {getMonthName(month - 1)} {year}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { void trigger(30); setSelectedMonth(getCurrentMonth()); }} className="font-bold">
                Today
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((dayNum, index) => {
              if (dayNum === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dayData = getDayData(dayNum);
              if (!dayData) return <div key={`day-${dayNum}`} className="aspect-square" />;

              const hasActivity = dayData.income.items.length > 0 || dayData.expenses.items.length > 0;
              const netChange = dayData.netChange;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => { void trigger(30); setSelectedDay(dayData); }}
                  className={cn(
                    'aspect-square p-1.5 rounded-lg border border-border text-left transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--card-shadow)]',
                    dayData.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                    dayData.isPast && 'opacity-60',
                    dayData.isNegative && 'bg-[var(--destructive)]/10 border-[var(--destructive)]/50',
                    dayData.isLowBalance && !dayData.isNegative && 'bg-[var(--warning)]/10 border-[var(--warning)]/50',
                    !dayData.isPast && !dayData.isLowBalance && !dayData.isNegative && 'bg-card',
                  )}
                >
                  <div className="text-xs font-bold text-muted-foreground">{dayNum}</div>
                  {hasActivity && (
                    <div className="mt-0.5">
                      <div className={cn(
                        'text-[10px] font-bold truncate',
                        netChange >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'
                      )}>
                        {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[var(--destructive)]/10 border border-[var(--destructive)]/50" />
              <span className="font-medium">Negative balance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[var(--warning)]/10 border border-[var(--warning)]/50" />
              <span className="font-medium">Below ${settings.lowBalanceThreshold}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-background" />
              <span className="font-medium">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <SettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        startingBalance={startingBalanceInput}
        setStartingBalance={setStartingBalanceInput}
        asOfDate={asOfDateInput}
        setAsOfDate={setAsOfDateInput}
        threshold={thresholdInput}
        setThreshold={setThresholdInput}
        onSave={handleSaveSettings}
        saving={saving}
      />

      {/* Day Detail Dialog */}
      <DayDetailDialog
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

// Settings Dialog Component
function SettingsDialog({
  open,
  onOpenChange,
  startingBalance,
  setStartingBalance,
  asOfDate,
  setAsOfDate,
  threshold,
  setThreshold,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startingBalance: string;
  setStartingBalance: (v: string) => void;
  asOfDate: string;
  setAsOfDate: (v: string) => void;
  threshold: string;
  setThreshold: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { trigger } = useHaptics();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cash Flow Settings</DialogTitle>
          <DialogDescription>
            Enter your current account balance to track your projected cash flow
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance" className="font-bold">Current Account Balance</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground font-medium">
              How much is in your main checking account right now?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asOfDate" className="font-bold">Balance As Of</Label>
            <Input
              id="asOfDate"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground font-medium">
              When was this balance accurate?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold" className="font-bold">Low Balance Warning</Label>
            <Input
              id="threshold"
              type="number"
              step="1"
              placeholder="300"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <p className="text-xs text-muted-foreground font-medium">
              Warn me when balance drops below this amount
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving} className="font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Day Detail Dialog Component
function DayDetailDialog({
  day,
  onClose,
}: {
  day: CashFlowDay | null;
  onClose: () => void;
}) {
  if (!day) return null;

  return (
    <Dialog open={!!day} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{formatDate(day.date)}</DialogTitle>
          <DialogDescription>
            {day.isToday && 'Today - '}
            {day.isPast && 'Past - '}
            {day.isFuture && 'Projected - '}
            Running Balance: {formatCurrency(day.runningBalance)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Balance indicator */}
          <div className={cn(
            'p-3 rounded-lg border',
            day.isNegative ? 'bg-[var(--destructive)]/10 border-[var(--destructive)]/50' :
            day.isLowBalance ? 'bg-[var(--warning)]/10 border-[var(--warning)]/50' :
            'bg-muted/50 border-border'
          )}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Running Balance</span>
              <span className={cn(
                'text-lg font-black',
                day.isNegative ? 'text-[var(--destructive)]' :
                day.isLowBalance ? 'text-[var(--warning)]' :
                'text-[var(--success)]'
              )}>
                {formatCurrency(day.runningBalance)}
              </span>
            </div>
            {day.netChange !== 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Net change: <span className={day.netChange >= 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}>
                  {day.netChange >= 0 ? '+' : ''}{formatCurrency(day.netChange)}
                </span>
              </div>
            )}
          </div>

          {/* Income items */}
          {day.income.items.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[var(--success)] mb-2 flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                Income ({formatCurrency(day.income.total)})
              </h4>
              <div className="space-y-1">
                {day.income.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Expense items */}
          {day.expenses.items.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[var(--destructive)] mb-2 flex items-center gap-1">
                <ArrowDownLeft className="h-4 w-4" />
                Expenses ({formatCurrency(day.expenses.total)})
              </h4>
              <div className="space-y-1">
                {day.expenses.items.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* No activity */}
          {day.income.items.length === 0 && day.expenses.items.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="font-medium">No activity scheduled</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Item row component
function ItemRow({ item }: { item: CashFlowItem }) {
  const sourceIcon = {
    'transaction': null,
    'reminder': <RefreshCw className="h-3 w-3" />,
    'recurring-income': <RefreshCw className="h-3 w-3" />,
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-6 rounded-full"
          style={{ backgroundColor: item.categoryColor }}
        />
        <div>
          <p className="text-sm font-bold">{item.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{item.categoryName}</span>
            {item.isProjected && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-bold">
                {sourceIcon[item.source]}
                <span className="ml-0.5">projected</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
      <span className={cn(
        'font-bold text-sm',
        item.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--destructive)]'
      )}>
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </span>
    </div>
  );
}
