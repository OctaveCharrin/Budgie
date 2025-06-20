
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

const SELECT_ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";

export function ExpensesTab() {
  const { expenses, categories, getCategoryById, isLoading } = useData();
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
      const amountMatch = expense.amount.toString().includes(searchTerm);
      const searchMatch = searchTerm === "" || descriptionMatch || categoryNameMatch || amountMatch;
      const categoryFilterMatch = filterCategory === SELECT_ALL_CATEGORIES_VALUE || expense.categoryId === filterCategory;
      return searchMatch && categoryFilterMatch;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "date-asc": return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc": return b.amount - a.amount;
        case "amount-asc": return a.amount - b.amount;
        case "date-desc":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-36 sm:w-auto" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 my-4">
          <Skeleton className="h-10 flex-grow" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
        <div className="space-y-4 pr-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
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
          placeholder="Search expenses (description, category, amount)..."
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
