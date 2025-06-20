"use client";

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Expense, Subscription, Category } from '@/lib/types';
import { DEFAULT_CATEGORIES, LOCAL_STORAGE_KEYS } from '@/lib/constants';

interface DataContextProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[] | ((val: Expense[]) => Expense[])) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  subscriptions: Subscription[];
  setSubscriptions: (subscriptions: Subscription[] | ((val: Subscription[]) => Subscription[])) => void;
  addSubscription: (subscription: Omit<Subscription, 'id'>) => void;
  updateSubscription: (subscription: Subscription) => void;
  deleteSubscription: (id: string) => void;
  categories: Category[];
  setCategories: (categories: Category[] | ((val: Category[]) => Category[])) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => boolean; // Returns true if successful, false if category is in use
  getCategoryById: (id: string) => Category | undefined;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>(LOCAL_STORAGE_KEYS.expenses, []);
  const [subscriptions, setSubscriptions] = useLocalStorage<Subscription[]>(LOCAL_STORAGE_KEYS.subscriptions, []);
  const [categories, setCategories] = useLocalStorage<Category[]>(LOCAL_STORAGE_KEYS.categories, DEFAULT_CATEGORIES);

  const generateId = () => crypto.randomUUID();

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [{ ...expense, id: generateId() }, ...prev]);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const addSubscription = (subscription: Omit<Subscription, 'id'>) => {
    setSubscriptions(prev => [{ ...subscription, id: generateId() }, ...prev]);
  };

  const updateSubscription = (updatedSubscription: Subscription) => {
    setSubscriptions(prev => prev.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub));
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
  };
  
  const addCategory = (category: Omit<Category, 'id'>) => {
    // New categories get a DollarSign icon by default, name is provided by user
    setCategories(prev => [{ ...category, icon: 'DollarSign', id: generateId() }, ...prev]);
  };

  const updateCategory = (updatedCategory: Category) => {
    // When updating, preserve the existing icon (could be default or DollarSign)
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? { ...updatedCategory, icon: cat.icon } : cat));
  };

  const deleteCategory = (id: string): boolean => {
    const isCategoryInUse = expenses.some(exp => exp.categoryId === id) || subscriptions.some(sub => sub.categoryId === id);
    if (isCategoryInUse) {
      return false;
    }
    setCategories(prev => prev.filter(cat => cat.id !== id));
    return true;
  };
  
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return (
    <DataContext.Provider value={{
      expenses, setExpenses, addExpense, updateExpense, deleteExpense,
      subscriptions, setSubscriptions, addSubscription, updateSubscription, deleteSubscription,
      categories, setCategories, addCategory, updateCategory, deleteCategory,
      getCategoryById
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
