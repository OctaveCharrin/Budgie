"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpenseListItem } from "@/components/list-items/expense-list-item";
import type { Expense } from "@/lib/types";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';

export function DashboardTab() {
  const { expenses, subscriptions } = useData();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [lastMonthTotal, setLastMonthTotal] = useState(0);
  const [percentageChange, setPercentageChange] = useState(0);

  useEffect(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const calculateTotalForPeriod = (start: Date, end: Date) => {
      let total = 0;
      expenses.forEach(exp => {
        if (isWithinInterval(parseISO(exp.date), { start, end })) {
          total += exp.amount;
        }
      });
      subscriptions.forEach(sub => {
        const subStartDate = parseISO(sub.startDate);
         // if subscription is active during any part of this month
        if (subStartDate <= end && isWithinInterval(start, {start: subStartDate, end: addYears(subStartDate, 100)}) ) {
             total += sub.amount;
        }
      });
      return total;
    };
    
    const currentTotal = calculateTotalForPeriod(currentMonthStart, currentMonthEnd);
    const previousTotal = calculateTotalForPeriod(lastMonthStart, lastMonthEnd);

    setCurrentMonthTotal(currentTotal);
    setLastMonthTotal(previousTotal);

    if (previousTotal > 0) {
      setPercentageChange(((currentTotal - previousTotal) / previousTotal) * 100);
    } else if (currentTotal > 0) {
      setPercentageChange(100); // Infinite increase if last month was 0
    } else {
      setPercentageChange(0);
    }

  }, [expenses, subscriptions]);


  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const closeDialogAndReset = () => {
    setIsAddExpenseOpen(false);
    setEditingExpense(undefined);
  };


  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent (This Month)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonthTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {percentageChange !== 0 && (
                <>
                  {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% 
                  from last month (${lastMonthTotal.toFixed(2)})
                </>
              )}
              {percentageChange === 0 && lastMonthTotal > 0 && "No change from last month"}
              {percentageChange === 0 && lastMonthTotal === 0 && "No spending recorded yet"}

            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${subscriptions.reduce((acc, sub) => acc + sub.amount, 0).toFixed(2)} / month</div>
            <p className="text-xs text-muted-foreground">{subscriptions.length} active subscriptions</p>
          </CardContent>
        </Card>
         <Card className="lg:col-span-1 md:col-span-2 flex flex-col items-center justify-center p-6 bg-accent text-accent-foreground shadow-lg">
           <Dialog open={isAddExpenseOpen} onOpenChange={(isOpen) => {
             if (!isOpen) closeDialogAndReset(); else setIsAddExpenseOpen(true);
           }}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full h-full text-lg bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary-foreground/30 hover:border-primary-foreground/50">
                <PlusCircle className="mr-2 h-6 w-6" /> Add New Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              </DialogHeader>
              <ExpenseForm expense={editingExpense} onSave={closeDialogAndReset} />
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 font-headline">Recent Expenses</h2>
        {recentExpenses.length > 0 ? (
          <ScrollArea className="h-[calc(100vh_-_28rem)] md:h-[calc(100vh_-_26rem)]"> {/* Adjust height as needed */}
            <div className="space-y-3 pr-3">
              {recentExpenses.map(expense => (
                <ExpenseListItem key={expense.id} expense={expense} onEdit={handleEditExpense} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground">No recent expenses. Add one to get started!</p>
        )}
      </div>
    </div>
  );
}

// Helper function, assuming addYears exists or you implement it.
// For simplicity, I will add it here. In a real app, use date-fns' addYears.
function addYears(date: Date, years: number): Date {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
}
