
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

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'isDefault'>): Promise<Category> {
  const categories = await getCategoriesAction();
  const newCategory: Category = {
    id: generateId(),
    name: categoryData.name,
    icon: categoryData.icon,
    isDefault: false, // New categories are not default
  };
  categories.push(newCategory);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return newCategory;
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  let categories = await getCategoriesAction();
  // isDefault status is preserved as it's part of the updatedCategory object passed from the form logic
  categories = categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return updatedCategory;
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; message?: string }> {
  let categories = await getCategoriesAction();
  const categoryToDelete = categories.find(cat => cat.id === id);

  if (categoryToDelete?.isDefault) {
    return { success: false, message: "Default categories cannot be deleted." };
  }
  
  // Check if category is in use (this check remains, but isDefault takes precedence)
  const expenses = await getExpensesAction();
  const subscriptions = await getSubscriptionsAction();
  const isCategoryInUseByExpenses = expenses.some(exp => exp.categoryId === id);
  const isCategoryInUseBySubscriptions = subscriptions.some(sub => sub.categoryId === id);

  if (isCategoryInUseByExpenses || isCategoryInUseBySubscriptions) {
      return { success: false, message: `Category "${categoryToDelete?.name || id}" is currently in use and cannot be deleted.` };
  }

  categories = categories.filter(cat => cat.id !== id);
  await writeData(DATA_FILE_PATHS.categories, categories);
  return { success: true };
}

export async function resetCategoriesAction(): Promise<Category[]> {
  // DEFAULT_CATEGORIES now include isDefault: true
  await writeData(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

// Expense Actions
export async function getExpensesAction(): Promise<Expense[]> {
  const expenses = await readData<Expense[]>(DATA_FILE_PATHS.expenses, []);
  // Basic backward compatibility: if old expense format, try to convert
  return expenses.map(exp => {
    if (!(exp as any).amounts && (exp as any).amount) { // Very old format detection
      const oldAmount = (exp as any).amount;
      const oldCurrency = (exp as any).currency || 'USD'; // Assume USD if currency missing
      const amounts = {} as Record<CurrencyCode, number>;
      SUPPORTED_CURRENCIES.forEach(c => amounts[c] = (c === oldCurrency ? oldAmount : 0));

      return {
        ...exp,
        originalAmount: oldAmount,
        originalCurrency: oldCurrency as CurrencyCode,
        amounts: amounts,
      } as Expense;
    }
    if (!exp.amounts && exp.originalAmount && exp.originalCurrency) {
        // This state implies it was saved before amounts field was populated correctly or conversion failed.
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
  if (
    existingExpense.originalAmount !== updatedExpenseData.originalAmount ||
    existingExpense.originalCurrency !== updatedExpenseData.originalCurrency ||
    !existingExpense.amounts
  ) {
    amounts = await convertAmountToAllCurrencies(updatedExpenseData.originalAmount, updatedExpenseData.originalCurrency);
  }

  const fullyUpdatedExpense: Expense = {
    ...updatedExpenseData,
    amounts,
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
  const subscriptions = await readData<Subscription[]>(DATA_FILE_PATHS.subscriptions, []);
  const appSettings = await getSettingsAction();

  const migratedSubscriptions = await Promise.all(
    subscriptions.map(async (sub) => {
      if (typeof (sub as any).amount === 'number' && !sub.originalCurrency && !sub.amounts) {
        const originalAmount = (sub as any).amount;
        const originalCurrency = appSettings.defaultCurrency;
        try {
          const amounts = await convertAmountToAllCurrencies(originalAmount, originalCurrency);
          return {
            ...sub,
            originalAmount,
            originalCurrency,
            amounts,
          } as Subscription;
        } catch (error) {
          console.warn(`Failed to auto-migrate subscription ${sub.id} to multi-currency:`, error);
           return {
            ...sub,
            originalAmount,
            originalCurrency,
            amounts: { [originalCurrency]: originalAmount } as Record<CurrencyCode, number>,
          } as Subscription;
        }
      }
      if (sub.originalCurrency && !sub.amounts) {
        try {
            const amounts = await convertAmountToAllCurrencies(sub.originalAmount, sub.originalCurrency);
            return {...sub, amounts };
        } catch (error) {
            console.warn(`Failed to populate amounts for subscription ${sub.id}:`, error);
            return { ...sub, amounts: { [sub.originalCurrency]: sub.originalAmount } as Record<CurrencyCode, number> };
        }
      }
      return sub;
    })
  );
  return migratedSubscriptions;
}

export async function addSubscriptionAction(
  subscriptionData: Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }
): Promise<Subscription> {
  const subscriptions = await getSubscriptionsAction();
  const amounts = await convertAmountToAllCurrencies(subscriptionData.originalAmount, subscriptionData.originalCurrency);

  const newSubscription: Subscription = {
    id: generateId(),
    name: subscriptionData.name,
    categoryId: subscriptionData.categoryId,
    originalAmount: subscriptionData.originalAmount,
    originalCurrency: subscriptionData.originalCurrency,
    amounts,
    startDate: subscriptionData.startDate,
    endDate: subscriptionData.endDate, // Add endDate
    description: subscriptionData.description,
  };
  subscriptions.unshift(newSubscription);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return newSubscription;
}

export async function updateSubscriptionAction(updatedSubscriptionData: Subscription): Promise<Subscription> {
  let subscriptions = await getSubscriptionsAction();
  const existingSubscription = subscriptions.find(sub => sub.id === updatedSubscriptionData.id);

  if (!existingSubscription) {
    throw new Error("Subscription not found for update.");
  }

  let amounts = existingSubscription.amounts;
  if (
    !existingSubscription.amounts ||
    existingSubscription.originalAmount !== updatedSubscriptionData.originalAmount ||
    existingSubscription.originalCurrency !== updatedSubscriptionData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(updatedSubscriptionData.originalAmount, updatedSubscriptionData.originalCurrency);
  }

  const fullyUpdatedSubscription: Subscription = {
    ...updatedSubscriptionData,
    amounts,
    endDate: updatedSubscriptionData.endDate, // Ensure endDate is part of the update
  };

  subscriptions = subscriptions.map(sub => sub.id === fullyUpdatedSubscription.id ? fullyUpdatedSubscription : sub);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return fullyUpdatedSubscription;
}

export async function deleteSubscriptionAction(id: string): Promise<{ success: boolean }> {
  let subscriptions = await getSubscriptionsAction();
  subscriptions = subscriptions.filter(sub => sub.id !== id);
  await writeData(DATA_FILE_PATHS.subscriptions, subscriptions);
  return { success: true };
}
