
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from '@/lib/constants';
import {
  getCategoriesAction, addCategoryAction, updateCategoryAction, deleteCategoryAction, resetCategoriesAction,
  getExpensesAction, addExpenseAction, updateExpenseAction, deleteExpenseAction, deleteAllExpensesAction,
  getSubscriptionsAction, addSubscriptionAction, updateSubscriptionAction, deleteSubscriptionAction, deleteAllSubscriptionsAction,
  getSettingsAction, updateSettingsAction, forceUpdateRatesAction
} from '@/actions/data-actions';
import { useToast } from "@/hooks/use-toast";
import { parseISO } from 'date-fns';


interface DataContextProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[] | ((val: Expense[]) => Expense[])) => void;
  addExpense: (expenseData: Omit<Expense, 'id' | 'amounts' | 'dayOfWeek'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteAllExpenses: () => Promise<void>;
  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[] | ((val: Subscription[]) => Subscription[])) => void;
  addSubscription: (subscriptionData: Omit<Subscription, 'id' | 'amounts'>) => Promise<void>;
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
  forceUpdateRates: () => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

/**
 * Provides a context for managing all application data (expenses, subscriptions, categories, settings).
 * It handles loading initial data, and provides functions for CRUD operations.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components that will consume the context.
 */
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const loadData = useCallback(async (options?: { forceRateUpdate?: boolean }) => {
    setIsLoading(true);
    try {
      let fetchedSettings = await getSettingsAction();
      
      // Automatic rate update logic
      const now = new Date();
      const lastSync = fetchedSettings.lastRatesSync ? new Date(fetchedSettings.lastRatesSync) : null;
      let needsUpdate = options?.forceRateUpdate || false;

      if (!needsUpdate) {
        if (!lastSync) {
          needsUpdate = true; // First time run
          console.log("No previous rate sync found. Triggering update.");
        } else {
          const midnight = new Date(now);
          midnight.setHours(0, 0, 0, 0);
          if (lastSync < midnight) { // Last sync was before today's midnight
            needsUpdate = true;
            console.log("Rates are stale (last synced yesterday or earlier). Triggering update.");
          }
        }
      }

      if (needsUpdate && fetchedSettings.apiKey) {
        toast({ title: "Updating Exchange Rates...", description: "Fetching the latest conversion rates in the background." });
        const updateResult = await forceUpdateRatesAction();
        if (updateResult.success) {
          console.log("Startup rates update successful.");
          toast({ title: "Rates Updated", description: "Successfully fetched latest exchange rates." });
          // Re-fetch settings to get the new sync time
          fetchedSettings = await getSettingsAction();
        } else {
          console.error("Startup rates update failed:", updateResult.message);
          toast({ variant: "destructive", title: "Rates Update Failed", description: updateResult.message || "Could not fetch latest exchange rates on startup." });
        }
      }
      
      const [fetchedCategories, fetchedExpenses, fetchedSubscriptions] = await Promise.all([
        getCategoriesAction(),
        getExpensesAction(),
        getSubscriptionsAction(),
      ]);

      setCategories(fetchedCategories);
      setExpenses(fetchedExpenses);
      setSubscriptions(fetchedSubscriptions);
      setSettings(fetchedSettings);

    } catch (error) {
      console.error("Failed to load data:", error);
      toast({ variant: "destructive", title: "Error Loading Data", description: "Could not load initial application data." });
      setCategories(DEFAULT_CATEGORIES);
      setExpenses([]);
      setSubscriptions([]);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // `toast` is stable, so this is fine.

  useEffect(() => {
    loadData();
  }, [loadData]);


  const forceUpdateRatesContext = async () => {
    await loadData({ forceRateUpdate: true });
  };


  /**
   * Updates application settings.
   * @param newSettings - A partial settings object with the values to update.
   */
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

  /**
   * Adds a new expense, handling currency conversion and updating state.
   * @param expenseData - The new expense data.
   */
  const addExpenseContext = async (expenseData: Omit<Expense, 'id' | 'amounts' | 'dayOfWeek'>) => {
    try {
      const newExpense = await addExpenseAction(expenseData as any);
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add expense: ${error.message || "Please check API key or network."}` });
    }
  };

  /**
   * Updates an existing expense, handling potential currency reconversion.
   * @param updatedExpenseData - The full expense object with updated values.
   */
  const updateExpenseContext = async (updatedExpenseData: Expense) => {
    try {
      const updatedExpense = await updateExpenseAction(updatedExpenseData);
      setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    } catch (error: any) {
      console.error("Failed to update expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update expense: ${error.message || "Please check API key or network."}` });
    }
  };

  /**
   * Deletes an expense by its ID.
   * @param id - The ID of the expense to delete.
   */
  const deleteExpenseContext = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (error: any) {
      console.error("Failed to delete expense:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete expense: ${error.message || "Unknown error"}` });
    }
  };

  /**
   * Deletes all expenses.
   */
  const deleteAllExpensesContext = async () => {
    try {
      await deleteAllExpensesAction();
      setExpenses([]);
    } catch (error: any) {
      console.error("Failed to delete all expenses:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete all expenses: ${error.message || "Unknown error"}` });
      throw error;
    }
  };

  /**
   * Adds a new subscription.
   * @param subscriptionData - The new subscription data.
   */
  const addSubscriptionContext = async (subscriptionData: Omit<Subscription, 'id' | 'amounts'>) => {
    try {
      const newSubscription = await addSubscriptionAction(subscriptionData as any);
      setSubscriptions(prev => [newSubscription, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to add subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add subscription: ${error.message || "Please check API key or network."}` });
    }
  };

  /**
   * Updates an existing subscription.
   * @param updatedSubscriptionData - The full subscription object with updated values.
   */
  const updateSubscriptionContext = async (updatedSubscriptionData: Subscription) => {
    try {
      const updatedSubscription = await updateSubscriptionAction(updatedSubscriptionData);
      setSubscriptions(prev => prev.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub).sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to update subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update subscription: ${error.message || "Please check API key or network."}` });
    }
  };

  /**
   * Deletes a subscription by its ID.
   * @param id - The ID of the subscription to delete.
   */
  const deleteSubscriptionContext = async (id: string) => {
    try {
      await deleteSubscriptionAction(id);
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } catch (error: any) {
      console.error("Failed to delete subscription:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete subscription: ${error.message || "Unknown error"}` });
    }
  };

  /**
   * Deletes all subscriptions.
   */
  const deleteAllSubscriptionsContext = async () => {
    try {
      await deleteAllSubscriptionsAction();
      setSubscriptions([]);
    } catch (error: any) {
      console.error("Failed to delete all subscriptions:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not delete all subscriptions: ${error.message || "Unknown error"}` });
      throw error;
    }
  };

  /**
   * Adds a new category.
   * @param categoryData - The data for the new category.
   */
  const addCategoryContext = async (categoryData: Omit<Category, 'id' | 'isDefault'>) => {
    try {
      const newCategory = await addCategoryAction(categoryData);
      setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to add category:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add category: ${error.message}` });
    }
  };

  /**
   * Updates an existing category.
   * @param updatedCategoryData - The category object with updated values.
   */
  const updateCategoryContext = async (updatedCategoryData: Category) => {
     try {
      const updatedCategory = await updateCategoryAction(updatedCategoryData);
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat).sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      console.error("Failed to update category:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not update category: ${error.message}` });
    }
  };

  /**
   * Deletes a category by its ID.
   * @param id - The ID of the category to delete.
   * @returns A promise that resolves to true if deletion was successful, false otherwise.
   */
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

  /**
   * Resets all categories to the default set.
   */
  const resetCategoriesContext = async (): Promise<void> => {
    try {
      const newCategories = await resetCategoriesAction();
      setCategories(newCategories);
    } catch (error: any) {
      console.error("Failed to reset categories:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not reset categories: ${error.message}` });
      throw error;
    }
  };

  /**
   * Retrieves a category by its ID from the state.
   * @param id - The ID of the category.
   * @returns The Category object or undefined if not found.
   */
  const getCategoryByIdContext = (id: string) => categories.find(c => c.id === id);

  /**
   * Gets the converted amount of an item in the user's default currency.
   * @param item - An Expense or Subscription object.
   * @returns The amount in the default currency, or 0 if not available.
   */
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
      forceUpdateRates: forceUpdateRatesContext,
    }}>
      {children}
    </DataContext.Provider>
  );
};

/**
 * Custom hook to use the DataContext.
 * @returns The data context with all data and actions.
 * @throws Will throw an error if used outside of a DataProvider.
 */
export const useData = (): DataContextProps => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
