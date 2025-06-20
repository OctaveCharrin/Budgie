
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryListItem } from "@/components/list-items/category-list-item";
import type { Category } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoriesTab() {
  const { categories, isLoading } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const closeDialogAndReset = () => {
    setIsDialogOpen(false);
    setEditingCategory(undefined);
  };

  const sortedCategories = [...categories].sort((a,b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
       <div className="space-y-6 p-1">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold font-headline">Manage Categories</h2>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeDialogAndReset(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <CategoryForm category={editingCategory} onSave={closeDialogAndReset} />
          </DialogContent>
        </Dialog>
      </div>

      {sortedCategories.length > 0 ? (
        <ScrollArea className="h-[calc(100vh_-_15rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-3">
            {sortedCategories.map(category => (
              <CategoryListItem key={category.id} category={category} onEdit={handleEdit} />
            ))}
          </div>
        </ScrollArea>
      ) : (
         <div className="text-center py-10">
            <p className="text-muted-foreground">No categories found. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}
