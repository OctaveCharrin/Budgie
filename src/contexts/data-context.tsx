
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES, DATA_FILE_PATHS } from '@/lib/constants'; // Import DEFAULT_CATEGORIES
import {
  getCategoriesAction, addCategoryAction, updateCategoryAction, deleteCategoryAction, resetCategoriesAction,
  getExpensesAction, addExpenseAction, updateExpenseAction, deleteExpenseAction, deleteAllExpensesAction,
  getSubscriptionsAction, addSubscriptionAction, updateSubscriptionAction, deleteSubscriptionAction, deleteAllSubscriptionsAction,
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
  deleteAllSubscriptions: () => Promise<void>;
  categories: Category[];
  setCategories: (categories: Category[] | ((val: Category[]) => Category[])) => void;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
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
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES); // Initialize with defaults, server will provide source
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Categories are now from JSON, Expenses/Subs from DB, Settings from JSON
      const [fetchedCategories, fetchedExpenses, fetchedSubscriptions, fetchedSettings] = await Promise.all([
        getCategoriesAction(), // Reads from categories.json
        getExpensesAction(),   // Reads from DB
        getSubscriptionsAction(), // Reads from DB
        getSettingsAction()    // Reads from settings.json
      ]);
      setCategories(fetchedCategories);
      setExpenses(fetchedExpenses);
      setSubscriptions(fetchedSubscriptions);
      setSettings(fetchedSettings || DEFAULT_SETTINGS);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load data from the server. Exchange rates or database might be an issue." });
      setCategories(DEFAULT_CATEGORIES); // Fallback for categories
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
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add expense: ${error instanceof Error ? error.message : "Please check API key or network."}` });
    }
  };

  const updateExpenseContext = async (updatedExpenseData: Expense) => {
    try {
      const updatedExpense = await updateExpenseAction(updatedExpenseData);
      setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update expense: ${error instanceof Error ? error.message : "Please check API key or network."}` });
    }
  };

  const deleteExpenseContext = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete expense: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  };

  const deleteAllExpensesContext = async () => {
    try {
      await deleteAllExpensesAction();
      setExpenses([]);
    } catch (error) {
      console.error("Failed to delete all expenses:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete all expenses: ${error instanceof Error ? error.message : "Unknown error"}` });
      throw error;
    }
  };

  const addSubscriptionContext = async (subscriptionData: Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode; name: string; categoryId: string; startDate: string; endDate?: string; description?: string; }) => {
    try {
      const newSubscription = await addSubscriptionAction(subscriptionData);
      setSubscriptions(prev => [newSubscription, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to add subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add subscription: ${error instanceof Error ? error.message : "Please check API key or network."}` });
    }
  };

  const updateSubscriptionContext = async (updatedSubscriptionData: Subscription) => {
    try {
      const updatedSubscription = await updateSubscriptionAction(updatedSubscriptionData);
      setSubscriptions(prev => prev.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub).sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to update subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update subscription: ${error instanceof Error ? error.message : "Please check API key or network."}` });
    }
  };

  const deleteSubscriptionContext = async (id: string) => {
    try {
      await deleteSubscriptionAction(id);
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete subscription: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  };

  const deleteAllSubscriptionsContext = async () => {
    try {
      await deleteAllSubscriptionsAction();
      setSubscriptions([]);
    } catch (error) {
      console.error("Failed to delete all subscriptions:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete all subscriptions: ${error instanceof Error ? error.message : "Unknown error"}` });
      throw error;
    }
  };

  // Category context functions now operate on JSON-based server actions
  const addCategoryContext = async (categoryData: Omit<Category, 'id' | 'isDefault'>) => {
    try {
      const newCategory = await addCategoryAction(categoryData);
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to add category:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add category: ${error.message}` });
    }
  };

  const updateCategoryContext = async (updatedCategoryData: Category) => {
     try {
      const updatedCategory = await updateCategoryAction(updatedCategoryData);
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat).sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to update category:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update category: ${error.message}` });
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
    } catch (error: any) {
      console.error("Failed to delete category:", error);
      toast({ variant: "destructive", title: "Error", description: `An unexpected error occurred: ${error.message}` });
      return false;
    }
  };

  const resetCategoriesContext = async (): Promise<void> => {
    try {
      const newCategories = await resetCategoriesAction(); // Server action now writes to JSON
      setCategories(newCategories);
    } catch (error: any) {
      console.error("Failed to reset categories:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not reset categories: ${error.message}` });
      throw error; // Re-throw to indicate failure to the caller if needed
    }
  };

  const getCategoryByIdContext = (id: string) => categories.find(c => c.id === id);

  const getAmountInDefaultCurrencyContext = (item: Expense | Subscription): number => {
    if (isLoading || !settings.defaultCurrency || !item.amounts) return 0;

    if (typeof item.amounts[settings.defaultCurrency] === 'number') {
      return item.amounts[settings.defaultCurrency];
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
      deleteAllSubscriptions: deleteAllSubscriptionsContext,
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
