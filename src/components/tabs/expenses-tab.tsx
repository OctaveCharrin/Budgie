
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { ExpenseForm } from "@/components/forms/expense-form";
import { ExpenseListItem } from "@/components/list-items/expense-list-item";
import type { Expense } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"; // Added for Skeleton
import { parseISO } from "date-fns";

const SELECT_ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";

export function ExpensesTab() {
  const { expenses, categories, getCategoryById, isLoading, settings, getAmountInDefaultCurrency } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [filterCategory, setFilterCategory] = useState<string>(SELECT_ALL_CATEGORIES_VALUE);


  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };
  
  const closeDialogAndReset = () => {
    setIsDialogOpen(false);
    setEditingExpense(undefined);
  };

  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      const category = getCategoryById(expense.categoryId);
      const descriptionMatch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryNameMatch = category?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const originalAmountFormatted = formatCurrency(expense.originalAmount, expense.originalCurrency).toLowerCase();
      const amountMatch = originalAmountFormatted.includes(searchTerm.toLowerCase()) || expense.originalAmount.toString().includes(searchTerm);
      
      const searchMatch = searchTerm === "" || descriptionMatch || categoryNameMatch || amountMatch;
      const categoryFilterMatch = filterCategory === SELECT_ALL_CATEGORIES_VALUE || expense.categoryId === filterCategory;
      return searchMatch && categoryFilterMatch;
    })
    .sort((a, b) => {
      const amountA = getAmountInDefaultCurrency(a);
      const amountB = getAmountInDefaultCurrency(b);
      switch (sortOrder) {
        case "date-asc": return parseISO(a.date).getTime() - parseISO(b.date).getTime();
        case "amount-desc": return amountB - amountA;
        case "amount-asc": return amountA - amountB;
        case "date-desc":
        default:
          return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Skeleton className="h-9 w-48" /> {/* "Manage Expenses" title */}
          <Skeleton className="h-10 w-full sm:w-36 rounded-lg" /> {/* "Add Expense" button */}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 my-4">
          <Skeleton className="h-10 flex-grow rounded-md" /> {/* Search Input */}
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" /> {/* Filter Category Select */}
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" /> {/* Sort Order Select */}
        </div>
        <div className="space-y-4 pr-3">
          {[...Array(3)].map((_, i) => (
             <Card key={i} className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" /> {/* Category Name */}
                      <Skeleton className="h-3 w-24" /> {/* Date */}
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-6 w-20 mb-1" /> {/* Amount */}
                      <Skeleton className="h-3 w-16" /> {/* Original Amount (optional) */}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                   <Skeleton className="h-4 w-full" /> {/* Description (optional) */}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-3">
                  <Skeleton className="h-8 w-8 rounded" /> {/* Edit Button */}
                  <Skeleton className="h-8 w-8 rounded" /> {/* Delete Button */}
                </CardFooter>
              </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold font-headline">Manage Expenses</h2>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeDialogAndReset(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            </DialogHeader>
            <ExpenseForm expense={editingExpense} onSave={closeDialogAndReset} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 my-4">
        <Input 
          placeholder="Search (desc, category, amount, currency e.g. $10)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Date (Newest first)</SelectItem>
            <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
            <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
            <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAndSortedExpenses.length > 0 ? (
        <ScrollArea className="h-[calc(100vh_-_20rem)]"> 
          <div className="space-y-4 pr-3">
            {filteredAndSortedExpenses.map(expense => (
              <ExpenseListItem key={expense.id} expense={expense} onEdit={handleEdit} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No expenses found.</p>
          {expenses.length > 0 && <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>}
        </div>
      )}
    </div>
  );
}
