
'use server';

import { readData, writeData } from '@/lib/file-service';
import { DATA_FILE_PATHS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from '@/lib/constants';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { convertAmountToAllCurrencies } from '@/services/exchange-rate-service';

const generateId = () => crypto.randomUUID();

// Settings Actions
export async function getSettingsAction(): Promise<AppSettings> {
  return readData<AppSettings>(DATA_FILE_PATHS.settings, DEFAULT_SETTINGS);
}

export async function updateSettingsAction(updatedSettings: AppSettings): Promise<AppSettings> {
  await writeData(DATA_FILE_PATHS.settings, updatedSettings);
  return updatedSettings;
}


// Category Actions
export async function getCategoriesAction(): Promise<Category[]> {
  return readData<Category[]>(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
}

export async function addCategoryAction(categoryData: Omit<Category, 'id'>): Promise<Category> {
  const categories = await getCategoriesAction();
  const newCategory: Category = {
    id: generateId(),
    name: categoryData.name,
    icon: categoryData.icon, // Icon is now passed from the form
  };
  categories.push(newCategory);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return newCategory;
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  let categories = await getCategoriesAction();
  categories = categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return updatedCategory;
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean }> {
  let categories = await getCategoriesAction();
  categories = categories.filter(cat => cat.id !== id);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return { success: true }; 
}

export async function resetCategoriesAction(): Promise<Category[]> {
  await writeData(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
  // Ensure expenses are re-evaluated if their categories are gone
  // This is mostly handled by the UI checking getCategoryById
  return DEFAULT_CATEGORIES;
}

// Expense Actions
export async function getExpensesAction(): Promise<Expense[]> {
  const expenses = await readData<Expense[]>(DATA_FILE_PATHS.expenses, []);
  // Basic backward compatibility: if old expense format, try to convert
  return expenses.map(exp => {
    if (!(exp as any).amounts && (exp as any).amount) {
      // This is a very basic placeholder. Real migration would be complex.
      // For now, we'll assume old amounts were USD if no currency specified.
      const oldAmount = (exp as any).amount;
      const oldCurrency = (exp as any).currency || 'USD';
      const amounts = {} as Record<CurrencyCode, number>;
      SUPPORTED_CURRENCIES.forEach(c => amounts[c] = (c === oldCurrency ? oldAmount : 0)); // Simplified
      
      return {
        ...exp,
        originalAmount: oldAmount,
        originalCurrency: oldCurrency as CurrencyCode,
        amounts: amounts,
      } as Expense;
    }
    return exp;
  });
}

export async function addExpenseAction(
  expenseData: Omit<Expense, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }
): Promise<Expense> {
  const expenses = await getExpensesAction();
  const amounts = await convertAmountToAllCurrencies(expenseData.originalAmount, expenseData.originalCurrency);
  
  const newExpense: Expense = {
    id: generateId(),
    date: expenseData.date,
    categoryId: expenseData.categoryId,
    originalAmount: expenseData.originalAmount,
    originalCurrency: expenseData.originalCurrency,
    amounts,
    description: expenseData.description,
  };
  expenses.unshift(newExpense);
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return newExpense;
}

export async function updateExpenseAction(updatedExpenseData: Expense): Promise<Expense> {
  let expenses = await getExpensesAction();
  const existingExpense = expenses.find(exp => exp.id === updatedExpenseData.id);

  if (!existingExpense) {
    throw new Error("Expense not found for update.");
  }

  let amounts = existingExpense.amounts;
  // If original amount or currency changed, recalculate all currency values
  if (
    existingExpense.originalAmount !== updatedExpenseData.originalAmount ||
    existingExpense.originalCurrency !== updatedExpenseData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(updatedExpenseData.originalAmount, updatedExpenseData.originalCurrency);
  }

  const fullyUpdatedExpense: Expense = {
    ...updatedExpenseData,
    amounts, // Use potentially recalculated amounts
  };

  expenses = expenses.map(exp => exp.id === fullyUpdatedExpense.id ? fullyUpdatedExpense : exp);
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return fullyUpdatedExpense;
}

export async function deleteExpenseAction(id: string): Promise<{ success: boolean }> {
  let expenses = await getExpensesAction();
  expenses = expenses.filter(exp => exp.id !== id);
  await writeData(DATA_FILE_PATHS.expenses, expenses);
  return { success: true };
}

export async function deleteAllExpensesAction(): Promise<{ success: boolean }> {
  await writeData<Expense[]>(DATA_FILE_PATHS.expenses, []);
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
