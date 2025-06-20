
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // CardFooter removed as it's not used
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface CategoryListItemProps {
  category: Category;
  onEdit: (category: Category) => void;
}

export function CategoryListItem({ category, onEdit }: CategoryListItemProps) {
  const { deleteCategory, expenses, subscriptions } = useData();
  const { toast } = useToast();

  const isCategoryInUse = expenses.some(exp => exp.categoryId === category.id) || subscriptions.some(sub => sub.categoryId === category.id);
  
  const isDeletable = !category.isDefault && !isCategoryInUse;
  const isButtonDisabled = category.isDefault || isCategoryInUse;

  const iconColorClass = category.isDefault 
    ? 'text-muted-foreground' 
    : (isCategoryInUse ? 'text-muted-foreground' : 'text-destructive');

  const handleDelete = async () => {
    if (!isDeletable) { // Extra safety check, though button should be disabled
        let reason = "This category cannot be deleted.";
        if (category.isDefault) reason = "Default categories cannot be deleted.";
        else if (isCategoryInUse) reason = `Category "${category.name}" is in use.`;
        toast({ variant: "destructive", title: "Deletion Prevented", description: reason });
        return;
    }
    const success = await deleteCategory(category.id);
    if (success) {
      toast({ title: "Category Deleted", description: `Category "${category.name}" has been successfully deleted.` });
    }
    // Failure toasts are handled by the deleteCategory context function
  };

  const DeleteButtonWrapper = ({ children }: { children: React.ReactNode }) => {
    if (category.isDefault) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>
              <p>Default categories cannot be deleted.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (isCategoryInUse) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>
              <p>This category is in use and cannot be deleted.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <>{children}</>;
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
          <DeleteButtonWrapper>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {/* The actual button for the trigger needs to be inside TooltipTrigger if a tooltip is active */}
                {/* So the Button needs to be what TooltipTrigger wraps if not default and not in use, or be the direct child of AlertDialogTrigger */}
                <Button variant="ghost" size="icon" aria-label={`Delete category ${category.name}`} disabled={isButtonDisabled}>
                  <Trash2 className={`h-4 w-4 ${iconColorClass}`} />
                </Button>
              </AlertDialogTrigger>
              {isDeletable && ( // Only render content if it's actually deletable, though button state should prevent opening
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
              )}
            </AlertDialog>
          </DeleteButtonWrapper>
        </div>
      </CardContent>
    </Card>
  );
}
