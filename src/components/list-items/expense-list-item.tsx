"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
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

interface ExpenseListItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
}

export function ExpenseListItem({ expense, onEdit }: ExpenseListItemProps) {
  const { getCategoryById, deleteExpense } = useData();
  const { toast } = useToast();
  const category = getCategoryById(expense.categoryId);

  const handleDelete = () => {
    deleteExpense(expense.id);
    toast({ title: "Expense Deleted", description: "The expense has been successfully deleted." });
  };

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {category && <IconDisplay name={category.icon} className="mr-2 h-5 w-5 text-primary" />}
              {category?.name || "Uncategorized"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "PPP")}</p>
          </div>
          <p className="text-xl font-semibold text-primary">
            ${expense.amount.toFixed(2)}
          </p>
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
