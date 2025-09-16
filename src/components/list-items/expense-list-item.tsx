
"use client";

import { format, parseISO } from "date-fns";
import { Pencil, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import type { Expense } from "@/lib/types";
import { IconDisplay } from "@/components/icon-display";
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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface ExpenseListItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

export function ExpenseListItem({ expense, onEdit }: ExpenseListItemProps) {
  const { getCategoryById, deleteExpense, settings, isLoading: isDataLoading } = useData();
  const { toast } = useToast();
  const category = getCategoryById(expense.categoryId);

  const categoryName = category?.name || "Uncategorized";
  const categoryIcon = category?.icon || "HelpCircle";

  const handleDelete = () => {
    deleteExpense(expense.id);
    toast({ title: "Expense Deleted", description: "The expense has been successfully deleted." });
  };

  const displayAmount = expense.amounts && settings.defaultCurrency
    ? expense.amounts[settings.defaultCurrency]
    : expense.originalAmount; // Fallback if amounts not yet populated or settings loading

  const formattedDisplayAmount = isDataLoading 
    ? "Loading..." 
    : formatCurrency(displayAmount, settings.defaultCurrency);
  
  const formattedOriginalAmount = formatCurrency(expense.originalAmount, expense.originalCurrency);

  // Parse the 'YYYY-MM-DD' string as a Date object for formatting
  const expenseDate = parseISO(expense.date);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              <IconDisplay name={categoryIcon} className="mr-2 h-5 w-5 text-primary" />
              {categoryName}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{format(expenseDate, "PPP")}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-primary">
              {formattedDisplayAmount}
            </p>
            {expense.originalCurrency !== settings.defaultCurrency && (
              <p className="text-xs text-muted-foreground">
                ({formattedOriginalAmount})
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      {expense.description && (
        <CardContent className="py-2">
          <p className="text-sm text-muted-foreground">{expense.description}</p>
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-3">
        <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} aria-label="Edit expense">
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete expense">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this expense.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
