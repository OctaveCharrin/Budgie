
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from '@/lib/constants';
import {
  getCategoriesAction, addCategoryAction, updateCategoryAction, deleteCategoryAction, resetCategoriesAction,
  getExpensesAction, addExpenseAction, updateExpenseAction, deleteExpenseAction, deleteAllExpensesAction,
  getSubscriptionsAction, addSubscriptionAction, updateSubscriptionAction, deleteSubscriptionAction,
  getSettingsAction, updateSettingsAction
} from '@/actions/data-actions';
import { useToast } from "@/hooks/use-toast";


interface DataContextProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[] | ((val: Expense[]) => Expense[])) => void;
  addExpense: (expenseData: Omit<Expense, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteAllExpenses: () => Promise<void>;
  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[] | ((val: Subscription[]) => Subscription[])) => void;
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  categories: Category[];
  setCategories: (categories: Category[] | ((val: Category[]) => Category[])) => void;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  resetCategories: () => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
  getAmountInDefaultCurrency: (item: Expense | Subscription) => number;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCategories, fetchedExpenses, fetchedSubscriptions, fetchedSettings] = await Promise.all([
        getCategoriesAction(),
        getExpensesAction(),
        getSubscriptionsAction(),
        getSettingsAction()
      ]);
      setCategories(fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_CATEGORIES);
      setExpenses(fetchedExpenses);
      setSubscriptions(fetchedSubscriptions);
      setSettings(fetchedSettings || DEFAULT_SETTINGS);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load data from the server." });
      // Initialize with defaults on error
      setCategories(DEFAULT_CATEGORIES);
      setExpenses([]);
      setSubscriptions([]);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettingsData = { ...settings, ...newSettings };
      const result = await updateSettingsAction(updatedSettingsData);
      setSettings(result);
      toast({ title: "Settings Updated", description: "Your settings have been saved." });
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update settings." });
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }) => {
    try {
      const newExpense = await addExpenseAction(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense. Check API key or network." });
    }
  };

  const updateExpense = async (updatedExpenseData: Expense) => {
    try {
      const updatedExpense = await updateExpenseAction(updatedExpenseData);
      setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update expense. Check API key or network." });
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
  
  const deleteAllExpenses = async () => {
    try {
      await deleteAllExpensesAction();
      setExpenses([]); 
    } catch (error) {
      console.error("Failed to delete all expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete all expenses." });
      throw error; 
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
  
  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      // Ensure 'icon' is always DollarSign for new categories as per previous requirement
      const newCategory = await addCategoryAction({ ...categoryData, icon: "DollarSign" });
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

  const deleteCategory = async (id: string): Promise<void> => {
    try {
      const { success } = await deleteCategoryAction(id);
      if (success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
      } else {
        // This part of the toast might be redundant if deleteCategoryAction itself doesn't throw for "in use"
        toast({ variant: "destructive", title: "Deletion Failed", description: "Category could not be deleted. It might be in use." });
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete category." });
    }
  };

  const resetCategories = async (): Promise<void> => {
    try {
      const defaultCategories = await resetCategoriesAction();
      setCategories(defaultCategories);
    } catch (error) {
      console.error("Failed to reset categories:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not reset categories." });
      throw error; 
    }
  };
  
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const getAmountInDefaultCurrency = (item: Expense | Subscription): number => {
    if (isLoading || !settings.defaultCurrency) return 0;

    if ('amounts' in item && item.amounts) { // It's an Expense
      return item.amounts[settings.defaultCurrency] || item.originalAmount; // Fallback to original if somehow not converted
    } else if ('amount' in item) { // It's a Subscription
      // Subscriptions are assumed to be in the default currency already
      return item.amount;
    }
    return 0;
  };


  return (
    <DataContext.Provider value={{
      expenses, setExpenses, addExpense, updateExpense, deleteExpense, deleteAllExpenses,
      subscriptions, setSubscriptions, addSubscription, updateSubscription, deleteSubscription,
      categories, setCategories, addCategory, updateCategory, deleteCategory, resetCategories,
      getCategoryById,
      settings, updateSettings,
      isLoading,
      getAmountInDefaultCurrency,
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
