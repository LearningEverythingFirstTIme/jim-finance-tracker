'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useHaptics } from '@/components/haptics-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { DynamicIcon, ICON_NAMES } from '@/lib/icons';
import type { Category, TransactionType } from '@/types';

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
  '#6b7280', '#78716c',
];

export default function CategoriesPage() {
  const { trigger } = useHaptics();
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('MoreHorizontal');
  const [color, setColor] = useState('#6b7280');
  const [type, setType] = useState<TransactionType>('expense');
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const openAddDialog = (categoryType: TransactionType) => {
    setEditingCategory(null);
    setName('');
    setIcon('MoreHorizontal');
    setColor('#6b7280');
    setType(categoryType);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setType(category.type);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name, icon, color, type });
        void trigger("nudge");
        toast.success('Category updated');
      } else {
        await addCategory({ name, icon, color, type });
        void trigger("success");
        toast.success('Category added');
      }
      setIsDialogOpen(false);
    } catch {
      toast.error('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      void trigger([100, 50, 100]);
      toast.success('Category deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete category');
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
      <div>
        <h1 className="text-3xl font-black tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-base font-medium">Manage your income and expense categories</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Expense Categories</CardTitle>
              <CardDescription className="font-medium">{expenseCategories.length} categories</CardDescription>
            </div>
            <Button size="sm" onClick={() => openAddDialog('expense')} className="font-bold">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">No expense categories yet</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Add one to start categorising your spending</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openAddDialog('expense')} className="font-bold">
                  <Plus className="h-4 w-4 mr-1" /> Add Category
                </Button>
              </div>
            )}
            <div className="space-y-1">
              {expenseCategories.map((cat, index) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border border-border transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--card-shadow)] ${index % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-md flex items-center justify-center border border-border"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      <DynamicIcon name={cat.icon} className="h-4 w-4" style={{ color: cat.color }} />
                    </span>
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteConfirm(cat.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Income Categories</CardTitle>
              <CardDescription className="font-medium">{incomeCategories.length} categories</CardDescription>
            </div>
            <Button size="sm" onClick={() => openAddDialog('income')} className="font-bold">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">No income categories yet</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Add one to track where your money comes from</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openAddDialog('income')} className="font-bold">
                  <Plus className="h-4 w-4 mr-1" /> Add Category
                </Button>
              </div>
            )}
            <div className="space-y-1">
              {incomeCategories.map((cat, index) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border border-border transition-all hover:-translate-y-0.5 hover:[box-shadow:var(--card-shadow)] ${index % 2 === 1 ? 'bg-muted/20' : 'bg-card'}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-md flex items-center justify-center border border-border"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      <DynamicIcon name={cat.icon} className="h-4 w-4" style={{ color: cat.color }} />
                    </span>
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteConfirm(cat.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details' : 'Create a new category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Icon</Label>
              <div className="grid grid-cols-10 gap-1 p-2 border border-border rounded-xl max-h-40 overflow-y-auto bg-muted/20">
                {ICON_NAMES.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all ${
                      icon === iconName ? 'bg-primary/20 ring-2 ring-primary border border-primary' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                    onClick={() => { void trigger(30); setIcon(iconName); }}
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
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-sm border transition-transform ${
                      color === c ? 'border-foreground scale-110 [box-shadow:var(--btn-shadow)]' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => { void trigger(30); setColor(c); }}
                  />
                ))}
              </div>
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
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? Transactions using this category will
              keep their data but the category link will be broken.
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
