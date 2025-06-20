"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import type { Category } from "@/lib/types";
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

interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
}

export function CategoryListItem({ category, onEdit }: CategoryListItemProps) {
  const { deleteCategory, expenses, subscriptions } = useData();
  const { toast } = useToast();

  const isCategoryInUse = expenses.some(exp => exp.categoryId === category.id) || subscriptions.some(sub => sub.categoryId === category.id);

  const handleDelete = () => {
    const success = deleteCategory(category.id);
    if (success) {
      toast({ title: "Category Deleted", description: `Category "${category.name}" has been successfully deleted.` });
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: `Category "${category.name}" is currently in use and cannot be deleted.` });
    }
  };

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconDisplay name={category.icon} className="h-6 w-6 text-primary" />
          <span className="text-md font-medium">{category.name}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(category)} aria-label={`Edit category ${category.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Delete category ${category.name}`} disabled={isCategoryInUse}>
                <Trash2 className={`h-4 w-4 ${isCategoryInUse ? 'text-muted-foreground' : 'text-destructive'}`} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the category "{category.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
