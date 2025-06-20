'use server';

import { readData, writeData } from '@/lib/file-service';
import { DATA_FILE_PATHS, DEFAULT_CATEGORIES } from '@/lib/constants';
import type { Expense, Subscription, Category } from '@/lib/types';

const generateId = () => crypto.randomUUID();

// Category Actions
export async function getCategoriesAction(): Promise<Category[]> {
  return readData<Category[]>(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
}

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'icon'>): Promise<Category> {
  const categories = await getCategoriesAction();
  const newCategory: Category = {
    ...categoryData,
    id: generateId(),
    icon: 'DollarSign', // New categories default to DollarSign
  };
  categories.push(newCategory);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return newCategory;
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  let categories = await getCategoriesAction();
  categories = categories.map(cat => cat.id === updatedCategory.id ? { ...updatedCategory, icon: cat.icon } : cat); // Preserve original icon
  await writeData(DATA_FILE_PATHS.categories, categories);
  return updatedCategory;
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean }> {
  let categories = await getCategoriesAction();
  const expenses = await getExpensesAction();
  const subscriptions = await getSubscriptionsAction();

  const isCategoryInUse = expenses.some(exp => exp.categoryId === id) || subscriptions.some(sub => sub.categoryId === id);
  if (isCategoryInUse) {
    return { success: false };
  }

  categories = categories.filter(cat => cat.id !== id);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return { success: true };
}

// Expense Actions
export async function getExpensesAction(): Promise<Expense[]> {
  return readData<Expense[]>(DATA_FILE_PATHS.expenses, []);
}

export async function addExpenseAction(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
  const expenses = await getExpensesAction();
  const newExpense: Expense = {
    ...expenseData,
    id: generateId(),
  };
  expenses.unshift(newExpense); // Add to the beginning for chronological order in some views
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return newExpense;
}

export async function updateExpenseAction(updatedExpense: Expense): Promise<Expense> {
  let expenses = await getExpensesAction();
  expenses = expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp);
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return updatedExpense;
}

export async function deleteExpenseAction(id: string): Promise<{ success: boolean }> {
  let expenses = await getExpensesAction();
  expenses = expenses.filter(exp => exp.id !== id);
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return { success: true };
}

// Subscription Actions
export async function getSubscriptionsAction(): Promise<Subscription[]> {
  return readData<Subscription[]>(DATA_FILE_PATHS.subscriptions, []);
}

export async function addSubscriptionAction(subscriptionData: Omit<Subscription, 'id'>): Promise<Subscription> {
  const subscriptions = await getSubscriptionsAction();
  const newSubscription: Subscription = {
    ...subscriptionData,
    id: generateId(),
  };
  subscriptions.unshift(newSubscription);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return newSubscription;
}

export async function updateSubscriptionAction(updatedSubscription: Subscription): Promise<Subscription> {
  let subscriptions = await getSubscriptionsAction();
  subscriptions = subscriptions.map(sub => sub.id === updatedSubscription.id ? updatedSubscription : sub);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return updatedSubscription;
}

export async function deleteSubscriptionAction(id: string): Promise<{ success: boolean }> {
  let subscriptions = await getSubscriptionsAction();
  subscriptions = subscriptions.filter(sub => sub.id !== id);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return { success: true };
}
