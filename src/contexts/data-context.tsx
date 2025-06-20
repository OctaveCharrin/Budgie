
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Expense, Subscription, Category } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import {
  getCategoriesAction, addCategoryAction, updateCategoryAction, deleteCategoryAction,
  getExpensesAction, addExpenseAction, updateExpenseAction, deleteExpenseAction,
  getSubscriptionsAction, addSubscriptionAction, updateSubscriptionAction, deleteSubscriptionAction
} from '@/actions/data-actions';
import { useToast } from "@/hooks/use-toast";


interface DataContextProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[] | ((val: Expense[]) => Expense[])) => void; // Keep for local optimistic updates
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[] | ((val: Subscription[]) => Subscription[])) => void; // Keep for local optimistic updates
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  categories: Category[];
  setCategories: (categories: Category[] | ((val: Category[]) => Category[])) => void; // Keep for local optimistic updates
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>; // Icon is now part of this
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  getCategoryById: (id: string) => Category | undefined;
  isLoading: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedExpenses, fetchedSubscriptions] = await Promise.all([
        getCategoriesAction(),
        getExpensesAction(),
        getSubscriptionsAction()
      ]);
      setCategories(fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_CATEGORIES);
      setExpenses(fetchedExpenses);
      setSubscriptions(fetchedSubscriptions);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load data from the server." });
      // Fallback to defaults if server fails
      setCategories(DEFAULT_CATEGORIES);
      setExpenses([]);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      const newExpense = await addExpenseAction(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense." });
    }
  };

  const updateExpense = async (updatedExpenseData: Expense) => {
    try {
      const updatedExpense = await updateExpenseAction(updatedExpenseData);
      setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update expense." });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete expense." });
    }
  };

  const addSubscription = async (subscriptionData: Omit<Subscription, 'id'>) => {
    try {
      const newSubscription = await addSubscriptionAction(subscriptionData);
      setSubscriptions(prev => [newSubscription, ...prev]);
    } catch (error) {
      console.error("Failed to add subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add subscription." });
    }
  };

  const updateSubscription = async (updatedSubscriptionData: Subscription) => {
    try {
      const updatedSubscription = await updateSubscriptionAction(updatedSubscriptionData);
      setSubscriptions(prev => prev.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub));
    } catch (error) {
      console.error("Failed to update subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update subscription." });
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      await deleteSubscriptionAction(id);
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete subscription." });
    }
  };
  
  const addCategory = async (categoryData: Omit<Category, 'id'>) => { // Parameter now Omit<Category, 'id'>
    try {
      const newCategory = await addCategoryAction(categoryData);
      setCategories(prev => [newCategory, ...prev]);
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add category." });
    }
  };

  const updateCategory = async (updatedCategoryData: Category) => {
     try {
      const updatedCategory = await updateCategoryAction(updatedCategoryData);
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update category." });
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const { success } = await deleteCategoryAction(id);
      if (success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
      }
      return success;
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete category." });
      return false;
    }
  };
  
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return (
    <DataContext.Provider value={{
      expenses, setExpenses, addExpense, updateExpense, deleteExpense,
      subscriptions, setSubscriptions, addSubscription, updateSubscription, deleteSubscription,
      categories, setCategories, addCategory, updateCategory, deleteCategory,
      getCategoryById,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextProps => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

