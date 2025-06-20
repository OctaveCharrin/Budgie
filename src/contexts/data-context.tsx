
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '@/lib/constants';
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
  addSubscription: (subscriptionData: Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode; name: string; categoryId: string; startDate: string; endDate?:string; description?: string; }) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  categories: Category[];
  setCategories: (categories: Category[] | ((val: Category[]) => Category[])) => void;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>; // Changed return type
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
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load data from the server. Exchange rates might be an issue." });
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

  const updateSettingsContext = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettingsData = { ...settings, ...newSettings };
      const result = await updateSettingsAction(updatedSettingsData);
      setSettings(result);
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update settings." });
    }
  };

  const addExpenseContext = async (expenseData: Omit<Expense, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }) => {
    try {
      const newExpense = await addExpenseAction(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add expense. Check API key or network." });
    }
  };

  const updateExpenseContext = async (updatedExpenseData: Expense) => {
    try {
      const updatedExpense = await updateExpenseAction(updatedExpenseData);
      setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update expense. Check API key or network." });
    }
  };

  const deleteExpenseContext = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete expense." });
    }
  };

  const deleteAllExpensesContext = async () => {
    try {
      await deleteAllExpensesAction();
      setExpenses([]);
    } catch (error) {
      console.error("Failed to delete all expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete all expenses." });
      throw error;
    }
  };

  const addSubscriptionContext = async (subscriptionData: Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode; name: string; categoryId: string; startDate: string; endDate?: string; description?: string; }) => {
    try {
      const newSubscription = await addSubscriptionAction(subscriptionData);
      setSubscriptions(prev => [newSubscription, ...prev]);
    } catch (error) {
      console.error("Failed to add subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add subscription. Check API key or network." });
    }
  };

  const updateSubscriptionContext = async (updatedSubscriptionData: Subscription) => {
    try {
      const updatedSubscription = await updateSubscriptionAction(updatedSubscriptionData);
      setSubscriptions(prev => prev.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub));
    } catch (error) {
      console.error("Failed to update subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update subscription. Check API key or network." });
    }
  };

  const deleteSubscriptionContext = async (id: string) => {
    try {
      await deleteSubscriptionAction(id);
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete subscription." });
    }
  };

  const addCategoryContext = async (categoryData: Omit<Category, 'id' | 'isDefault'>) => {
    try {
      const newCategory = await addCategoryAction({ ...categoryData, icon: "DollarSign" }); // Server action sets isDefault: false
      setCategories(prev => [newCategory, ...prev]);
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add category." });
    }
  };

  const updateCategoryContext = async (updatedCategoryData: Category) => {
     try {
      const updatedCategory = await updateCategoryAction(updatedCategoryData);
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update category." });
    }
  };

  const deleteCategoryContext = async (id: string): Promise<boolean> => {
    try {
      const result = await deleteCategoryAction(id);
      if (result.success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Deletion Failed",
          description: result.message || "Category could not be deleted."
        });
        return false;
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred while trying to delete the category." });
      return false;
    }
  };

  const resetCategoriesContext = async (): Promise<void> => {
    try {
      const defaultCategories = await resetCategoriesAction();
      setCategories(defaultCategories);
    } catch (error) {
      console.error("Failed to reset categories:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not reset categories." });
      throw error;
    }
  };

  const getCategoryByIdContext = (id: string) => categories.find(c => c.id === id);

  const getAmountInDefaultCurrencyContext = (item: Expense | Subscription): number => {
    if (isLoading || !settings.defaultCurrency) return 0;

    if (item.amounts && typeof item.amounts[settings.defaultCurrency] === 'number') {
      return item.amounts[settings.defaultCurrency];
    }

    if ('amount' in item && !item.amounts && !('originalAmount'in item) && typeof (item as any).amount === 'number') {
        return (item as any).amount;
    }

    if ('originalAmount' in item && item.originalCurrency === settings.defaultCurrency) {
        return item.originalAmount;
    }

    return 0;
  };


  return (
    <DataContext.Provider value={{
      expenses, setExpenses,
      addExpense: addExpenseContext,
      updateExpense: updateExpenseContext,
      deleteExpense: deleteExpenseContext,
      deleteAllExpenses: deleteAllExpensesContext,
      subscriptions, setSubscriptions,
      addSubscription: addSubscriptionContext,
      updateSubscription: updateSubscriptionContext,
      deleteSubscription: deleteSubscriptionContext,
      categories, setCategories,
      addCategory: addCategoryContext,
      updateCategory: updateCategoryContext,
      deleteCategory: deleteCategoryContext,
      resetCategories: resetCategoriesContext,
      getCategoryById: getCategoryByIdContext,
      settings,
      updateSettings: updateSettingsContext,
      isLoading,
      getAmountInDefaultCurrency: getAmountInDefaultCurrencyContext,
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
