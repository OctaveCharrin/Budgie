
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, TrendingUp, Wallet, Target } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { ExpenseForm } from "@/components/forms/expense-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpenseListItem } from "@/components/list-items/expense-list-item";
import type { Expense } from "@/lib/types";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, isAfter, isEqual } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function DashboardTab() {
  const { expenses, subscriptions, isLoading, settings, getAmountInDefaultCurrency } = useData();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const router = useRouter();

  const [currentMonthTotalExpenses, setCurrentMonthTotalExpenses] = useState(0);
  const [lastMonthTotalExpenses, setLastMonthTotalExpenses] = useState(0);
  const [percentageChange, setPercentageChange] = useState(0);
  const [totalMonthlySubscriptionsCost, setTotalMonthlySubscriptionsCost] = useState(0);
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0);

  useEffect(() => {
    if (isLoading || !settings.defaultCurrency) return;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const calculateTotalExpensesForPeriod = (start: Date, end: Date): number => {
      return expenses.reduce((total, exp) => {
        // Since exp.date is 'YYYY-MM-DD', parseISO treats it as UTC midnight.
        // isWithinInterval correctly handles this comparison.
        if (isWithinInterval(parseISO(exp.date), { start, end })) {
          return total + getAmountInDefaultCurrency(exp);
        }
        return total;
      }, 0);
    };
    
    const currentTotalExp = calculateTotalExpensesForPeriod(currentMonthStart, currentMonthEnd);
    const previousTotalExp = calculateTotalExpensesForPeriod(lastMonthStart, lastMonthEnd);

    setCurrentMonthTotalExpenses(currentTotalExp);
    setLastMonthTotalExpenses(previousTotalExp);

    if (previousTotalExp > 0) {
      setPercentageChange(((currentTotalExp - previousTotalExp) / previousTotalExp) * 100);
    } else if (currentTotalExp > 0) {
      setPercentageChange(100); 
    } else {
      setPercentageChange(0); 
    }
    
    let activeSubsTotalCost = 0;
    let currentActiveSubsCount = 0;
    subscriptions.forEach(sub => {
      const subStartDate = parseISO(sub.startDate);
      const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;

      // Check if the subscription is active in the current month
      const isActiveInCurrentMonth = 
        (isAfter(currentMonthEnd, subStartDate) || isEqual(currentMonthEnd, subStartDate)) && // Starts before or on month end
        (!subEndDate || isAfter(subEndDate, currentMonthStart) || isEqual(subEndDate, currentMonthStart)); // No end date OR ends after or on month start
      
      if (isActiveInCurrentMonth) {
        activeSubsTotalCost += getAmountInDefaultCurrency(sub);
        currentActiveSubsCount++;
      }
    });
    setTotalMonthlySubscriptionsCost(activeSubsTotalCost);
    setActiveSubscriptionsCount(currentActiveSubsCount);

  }, [expenses, subscriptions, isLoading, settings, getAmountInDefaultCurrency]);


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
  
  const totalSpentThisMonth = currentMonthTotalExpenses + totalMonthlySubscriptionsCost;
  
  const budget = settings.monthlyBudget || 0;
  const remainingBudget = budget - totalSpentThisMonth;
  const budgetProgress = budget > 0 ? (totalSpentThisMonth / budget) * 100 : 0;
  const budgetExceeded = remainingBudget < 0;

  const handleNavigate = (tab: string) => {
    router.push(`/?tab=${tab}`, { scroll: false });
  };


  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent (This Month)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-3/4 mb-1" />
                <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
           <div className="flex items-center justify-center p-2 sm:p-6">
             <Dialog open={isAddExpenseOpen} onOpenChange={(isOpen) => {
               if (!isOpen) closeDialogAndReset(); else setIsAddExpenseOpen(true);
             }}>
              <DialogTrigger asChild>
                 <Skeleton className="h-12 w-full rounded-lg" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                   <DialogTitle><Skeleton className="h-6 w-3/4" /></DialogTitle>
                </DialogHeader>
                 <Skeleton className="h-64 w-full" />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-48 mb-3" />
          <div className="space-y-3 pr-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" /> 
                      <Skeleton className="h-3 w-24" /> 
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-6 w-20 mb-1" /> 
                      <Skeleton className="h-3 w-16" /> 
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                   <Skeleton className="h-4 w-full" /> 
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-3">
                  <Skeleton className="h-8 w-8 rounded" /> 
                  <Skeleton className="h-8 w-8 rounded" /> 
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 p-1">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          onClick={() => handleNavigate('reports')} 
          className="cursor-pointer transition-colors hover:border-primary/50"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleNavigate('reports')}}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent (This Month)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {formatCurrency(totalSpentThisMonth, settings.defaultCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {percentageChange !== 0 && (
                <>
                  {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% (expenses)
                  from last month ({formatCurrency(lastMonthTotalExpenses, settings.defaultCurrency)})
                </>
              )}
              {percentageChange === 0 && lastMonthTotalExpenses > 0 && "No change in expenses from last month"}
              {percentageChange === 0 && lastMonthTotalExpenses === 0 && totalSpentThisMonth === 0 && "No spending recorded yet"}
            </p>
          </CardContent>
        </Card>
        <Card 
          onClick={() => handleNavigate('settings')} 
          className="cursor-pointer transition-colors hover:border-primary/50"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleNavigate('settings')}}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              {budget > 0 ? (
                <>
                  <div className={cn("text-2xl font-bold", budgetExceeded && "text-destructive")}>
                      {formatCurrency(remainingBudget, settings.defaultCurrency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                      {budgetExceeded ? "Over budget by" : "Remaining of"} {budgetExceeded ? formatCurrency(Math.abs(remainingBudget), settings.defaultCurrency) : formatCurrency(budget, settings.defaultCurrency)}
                  </p>
                  <Progress value={budgetExceeded ? 100 : budgetProgress} className={cn("mt-2 h-2", budgetExceeded && "[&>div]:bg-destructive")} />
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                    No budget set. Go to settings to add one.
                </div>
              )}
          </CardContent>
        </Card>
        <Card 
          onClick={() => handleNavigate('subscriptions')} 
          className="cursor-pointer transition-colors hover:border-primary/50"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleNavigate('subscriptions')}}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {formatCurrency(totalMonthlySubscriptionsCost, settings.defaultCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">{activeSubscriptionsCount} active subscriptions</p>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center p-2 sm:p-6">
           <Dialog open={isAddExpenseOpen} onOpenChange={(isOpen) => {
             if (!isOpen) closeDialogAndReset(); else setIsAddExpenseOpen(true);
           }}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full text-lg bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-6 w-6" /> Add Expense
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
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 font-headline">Recent Expenses</h2>
        {recentExpenses.length > 0 ? (
          <ScrollArea className="h-[calc(100vh_-_28rem)] md:h-[calc(100vh_-_26rem)]">
            <div className="space-y-3 pr-3">
              {recentExpenses.map(expense => (
                <ExpenseListItem key={expense.id} expense={expense} onEdit={handleEditExpense} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No recent expenses. Add one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

    