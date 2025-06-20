
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryListItem } from "@/components/list-items/category-list-item";
import type { Category } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function SettingsTab() {
  // Category Management State & Logic (inspired by original CategoriesTab)
  const { categories, isLoading: isDataLoading, deleteAllExpenses } = useData();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  // Delete All Expenses State & Logic
  const [isDeleteExpensesAlertOpen, setIsDeleteExpensesAlertOpen] = useState(false);
  const { toast } = useToast();

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const closeCategoryDialogAndReset = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(undefined);
  };

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const handleDeleteAllExpenses = async () => {
    try {
      await deleteAllExpenses();
      toast({ title: "Success", description: "All expenses have been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete expenses." });
    }
    setIsDeleteExpensesAlertOpen(false);
  };
  
  if (isDataLoading) {
    return (
      <div className="space-y-8 p-1">
        <section>
          <Skeleton className="h-9 w-1/2 mb-4" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-1" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>
        </section>
        <section>
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        </section>
      </div>
    );
  }


  return (
    <div className="space-y-8 p-1">
      {/* Section 1: Data Management */}
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">Data Management</h2>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Delete All Expenses</CardTitle>
            <CardDescription>
              This action will permanently delete all your recorded expenses. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={isDeleteExpensesAlertOpen} onOpenChange={setIsDeleteExpensesAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Expenses
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all expense data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllExpenses}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Yes, delete all expenses
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Manage Categories */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold font-headline">Manage Categories</h2>
          <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeCategoryDialogAndReset(); else setIsCategoryDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              </DialogHeader>
              <CategoryForm category={editingCategory} onSave={closeCategoryDialogAndReset} />
            </DialogContent>
          </Dialog>
        </div>

        {sortedCategories.length > 0 ? (
          <ScrollArea className="h-[calc(100vh_-_30rem)]"> {/* Adjusted height */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-3">
              {sortedCategories.map(category => (
                <CategoryListItem key={category.id} category={category} onEdit={handleEditCategory} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-10">
              <p className="text-muted-foreground">No categories found. Add one to get started!</p>
          </div>
        )}
      </section>
    </div>
  );
}
