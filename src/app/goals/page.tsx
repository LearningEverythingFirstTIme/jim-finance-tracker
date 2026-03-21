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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Target,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useSavingsContributions } from '@/hooks/useSavingsContributions';
import { formatCurrency, formatDate, getTodayDate } from '@/lib/format';
import { toast } from 'sonner';
import { DynamicIcon } from '@/lib/icons';
import type { SavingsGoal, SavingsGoalInput, SavingsContributionInput } from '@/types';

const GOAL_ICONS = [
  'Target', 'Home', 'Car', 'Plane', 'Laptop', 'ShoppingCart', 'Gift', 'Heart',
  'Briefcase', 'DollarSign', 'Coffee', 'Film', 'Gamepad2', 'GraduationCap',
  'Baby', 'Trophy', 'Umbrella', 'CreditCard', 'Wallet', 'PiggyBank',
];

const GOAL_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308',
  '#14b8a6', '#06b6d4', '#6366f1', '#d946ef', '#ef4444', '#84cc16',
];

// Circular progress ring component with thicker stroke
function CircularProgress({ percentage, color, size = 88 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 [filter:drop-shadow(2px_2px_0px_var(--border))]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-black">{Math.min(percentage, 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function getDaysUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline + 'T00:00:00');
  const diff = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getMonthsToCompletion(goal: SavingsGoal): number | null {
  if (goal.currentAmount <= 0) return null;
  
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;
  
  const daysSinceCreation = Math.max(1, Math.floor((Date.now() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyRate = goal.currentAmount / daysSinceCreation;
  const dailyTarget = remaining / Math.max(dailyRate, 0.01);
  
  return Math.ceil(dailyTarget / 30);
}

export default function GoalsPage() {
  const { trigger } = useHaptics();
  const { goals, loading, addGoal, updateGoal, updateGoalAmount, deleteGoal } = useSavingsGoals();
  const { contributions, addContribution, deleteContribution, getContributionsForGoal } = useSavingsContributions();

  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [goalIcon, setGoalIcon] = useState('Target');
  const [goalColor, setGoalColor] = useState('#22c55e');
  const [deadline, setDeadline] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  const [contributionGoalId, setContributionGoalId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(getTodayDate());
  const [contributionNote, setContributionNote] = useState('');
  const [submittingContribution, setSubmittingContribution] = useState(false);

  const totalSaved = useMemo(() => goals.reduce((sum, g) => sum + g.currentAmount, 0), [goals]);
  
  const closestToCompletion = useMemo(() => {
    if (goals.length === 0) return null;
    return goals.reduce((closest, g) => {
      const progress = (g.currentAmount / g.targetAmount) * 100;
      const closestProgress = (closest.currentAmount / closest.targetAmount) * 100;
      return progress > closestProgress ? g : closest;
    }, goals[0]);
  }, [goals]);

  const openAddGoalDialog = () => {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('');
    setGoalIcon('Target');
    setGoalColor('#22c55e');
    setDeadline('');
    setIsGoalDialogOpen(true);
  };

  const openEditGoalDialog = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setGoalIcon(goal.icon);
    setGoalColor(goal.color);
    setDeadline(goal.deadline || '');
    setIsGoalDialogOpen(true);
  };

  const openContributionDialog = (goalId: string) => {
    setContributionGoalId(goalId);
    setContributionAmount('');
    setContributionDate(getTodayDate());
    setContributionNote('');
    setIsContributionDialogOpen(true);
  };

  const handleGoalSubmit = async () => {
    if (!goalName.trim()) {
      toast.error('Name is required');
      return;
    }
    const target = parseFloat(targetAmount);
    if (!target || target <= 0) {
      toast.error('Please enter a valid target amount');
      return;
    }

    const input: SavingsGoalInput = {
      name: goalName.trim(),
      targetAmount: target,
      icon: goalIcon,
      color: goalColor,
      deadline: deadline || null,
    };

    setSubmittingGoal(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, input);
        void trigger("nudge");
        toast.success('Goal updated');
      } else {
        await addGoal(input);
        void trigger("success");
        toast.success('Goal created');
      }
      setIsGoalDialogOpen(false);
    } catch {
      toast.error('Failed to save goal');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleContributionSubmit = async () => {
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const goal = goals.find((g) => g.id === contributionGoalId);
    if (!goal) {
      toast.error('Goal not found');
      return;
    }

    const input: SavingsContributionInput = {
      goalId: contributionGoalId,
      goalName: goal.name,
      amount,
      date: contributionDate,
      note: contributionNote.trim(),
    };

    setSubmittingContribution(true);
    try {
      await addContribution(input, async (goalId, delta) => {
        const g = goals.find((gg) => gg.id === goalId);
        if (g) {
          await updateGoalAmount(goalId, g.currentAmount + delta);
        }
      });
      void trigger("success");
      toast.success(`Added ${formatCurrency(amount)} to ${goal.name}`);
      setIsContributionDialogOpen(false);
    } catch {
      toast.error('Failed to add contribution');
    } finally {
      setSubmittingContribution(false);
    }
  };

  const handleDeleteContribution = async (contributionId: string, goalId: string, amount: number) => {
    try {
      await deleteContribution(contributionId, goalId, amount, async (gId, delta) => {
        const g = goals.find((gg) => gg.id === gId);
        if (g) {
          await updateGoalAmount(gId, g.currentAmount + delta);
        }
      });
      void trigger([100, 50, 100]);
      toast.success('Contribution removed');
    } catch {
      toast.error('Failed to remove contribution');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      void trigger([100, 50, 100]);
      toast.success('Goal deleted (contributions remain in history)');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete goal');
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
          <h1 className="text-3xl font-black tracking-tight">Savings Goals</h1>
          <p className="text-muted-foreground text-base">Track progress toward your financial goals</p>
        </div>
        <Button onClick={openAddGoalDialog} className="font-bold">
          <Plus className="h-4 w-4 mr-1" /> New Goal
        </Button>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="accent-income">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-[#00b894] dark:text-[#55efc4]">{formatCurrency(totalSaved)}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Across all goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{goals.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Savings targets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Closest to Goal</CardTitle>
          </CardHeader>
          <CardContent>
            {closestToCompletion ? (
              <>
                <div className="text-lg font-black truncate">{closestToCompletion.name}</div>
                <p className="text-xs text-muted-foreground font-medium">
                  {((closestToCompletion.currentAmount / closestToCompletion.targetAmount) * 100).toFixed(0)}% complete
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground font-medium">No goals yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border-3 border-border flex items-center justify-center mb-4 [box-shadow:var(--btn-shadow)]">
              <Target className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-lg font-bold">No savings goals yet</p>
            <p className="text-sm mb-4">Create your first goal to start tracking</p>
            <Button onClick={openAddGoalDialog} className="font-bold">
              <Plus className="h-4 w-4 mr-1" /> Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const monthsRemaining = getMonthsToCompletion(goal);
            const daysUntilDeadline = goal.deadline ? getDaysUntilDeadline(goal.deadline) : null;
            const goalContributions = getContributionsForGoal(goal.id);
            const isExpanded = expandedGoal === goal.id;

            return (
              <Card key={goal.id} className="relative overflow-hidden" style={{ borderTop: `4px solid ${goal.color}` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-[8px] flex items-center justify-center border-2 border-border"
                        style={{ backgroundColor: goal.color + '20' }}
                      >
                        <DynamicIcon name={goal.icon} className="h-5 w-5" style={{ color: goal.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription className="font-medium">
                          {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditGoalDialog(goal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm(goal.id)}>
                        <Trash2 className="h-4 w-4 text-[#e17055] dark:text-[#ff7675]" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CircularProgress percentage={percentage} color={goal.color} />
                    <div className="flex-1 space-y-2">
                      {/* Progress bar */}
                      <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-border">
                        <div
                          className="h-full transition-all rounded-full"
                          style={{ 
                            width: `${Math.min(percentage, 100)}%`, 
                            backgroundColor: goal.color 
                          }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {percentage >= 100 ? (
                          <span className="text-[#00b894] dark:text-[#55efc4] font-bold">Goal reached! 🎉</span>
                        ) : (
                          <span>{formatCurrency(goal.targetAmount - goal.currentAmount)} to go</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Projection and Deadline */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {monthsRemaining !== null && percentage < 100 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded-[6px]">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">~{monthsRemaining} months at current pace</span>
                      </div>
                    )}
                    {daysUntilDeadline !== null && (
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-[6px]">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {daysUntilDeadline < 0 ? (
                          <span className="text-[#e17055] dark:text-[#ff7675] font-bold">Deadline passed</span>
                        ) : daysUntilDeadline === 0 ? (
                          <span className="text-[#fdcb6e] dark:text-[#ffeaa7] font-bold">Due today</span>
                        ) : (
                          <span className={`font-medium ${daysUntilDeadline <= 30 ? 'text-[#fdcb6e] dark:text-[#ffeaa7]' : ''}`}>
                            {daysUntilDeadline} days left
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Contribution Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-bold"
                    onClick={() => openContributionDialog(goal.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Contribution
                  </Button>

                  {/* Contribution History */}
                  {goalContributions.length > 0 && (
                    <div>
                      <button
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium"
                        onClick={() => { void trigger(30); setExpandedGoal(isExpanded ? null : goal.id); }}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {goalContributions.length} contribution{goalContributions.length !== 1 ? 's' : ''}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {goalContributions.map((c, index) => (
                            <div
                              key={c.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg text-sm border-2 border-transparent ${index % 2 === 1 ? 'bg-muted/30' : ''} hover:border-border transition-colors`}
                            >
                              <div>
                                <span className="font-bold text-[#00b894] dark:text-[#55efc4]">+{formatCurrency(c.amount)}</span>
                                <span className="text-muted-foreground ml-2 font-medium">{formatDate(c.date)}</span>
                                {c.note && <span className="text-muted-foreground ml-2">• {c.note}</span>}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteContribution(c.id, c.goalId, c.amount)}
                              >
                                <Trash2 className="h-3 w-3 text-[#e17055] dark:text-[#ff7675]" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Update your goal details' : 'Create a new savings target'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goalName" className="font-bold">Goal Name</Label>
              <Input
                id="goalName"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Emergency Fund, Vacation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAmount" className="font-bold">Target Amount</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Icon</Label>
              <div className="grid grid-cols-10 gap-1 p-2 border-3 border-border rounded-xl max-h-32 overflow-y-auto bg-muted/20">
                {GOAL_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`w-8 h-8 rounded-[6px] flex items-center justify-center transition-all ${
                      goalIcon === iconName ? 'bg-primary/20 ring-2 ring-primary border-2 border-primary' : 'hover:bg-muted/50 border-2 border-transparent'
                    }`}
                    onClick={() => { void trigger(30); setGoalIcon(iconName); }}
                    title={iconName}
                  >
                    <DynamicIcon name={iconName} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Color</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-[6px] border-3 transition-transform ${
                      goalColor === c ? 'border-foreground scale-110 [box-shadow:var(--btn-shadow)]' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => { void trigger(30); setGoalColor(c); }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="font-bold">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleGoalSubmit} disabled={submittingGoal} className="font-bold">
                {submittingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Add money to your savings goal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contributionAmount" className="font-bold">Amount</Label>
              <Input
                id="contributionAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributionDate" className="font-bold">Date</Label>
              <Input
                id="contributionDate"
                type="date"
                value={contributionDate}
                onChange={(e) => setContributionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contributionNote" className="font-bold">Note (optional)</Label>
              <Input
                id="contributionNote"
                placeholder="e.g., Monthly savings"
                value={contributionNote}
                onChange={(e) => setContributionNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsContributionDialogOpen(false)} className="font-bold">
                Cancel
              </Button>
              <Button onClick={handleContributionSubmit} disabled={submittingContribution} className="font-bold">
                {submittingContribution ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this goal? The goal will be removed, but your contribution history will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDeleteGoal(deleteConfirm)}
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
