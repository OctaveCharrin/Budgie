
'use server';

import { readData, writeData } from '@/lib/file-service';
import { DATA_FILE_PATHS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from '@/lib/constants';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { convertAmountToAllCurrencies } from '@/services/exchange-rate-service';
import { openDb, initializeDb } from '@/lib/db';
import { getDay as getDayFns } from 'date-fns'; // For day of week calculation

const generateId = () => crypto.randomUUID();

// Helper to calculate day of week (0=Monday, ..., 6=Sunday)
function calculateDayOfWeek(dateString: string): number {
  const date = new Date(dateString);
  const dayFns = getDayFns(date); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  return dayFns === 0 ? 6 : dayFns - 1;
}

// Helper to map amounts object to DB column values
function mapAmountsToDbPlaceholders(amounts: Record<CurrencyCode, number>): Record<string, number> {
  const placeholders: Record<string, number> = {};
  SUPPORTED_CURRENCIES.forEach(code => {
    placeholders[`$amount_${code.toLowerCase()}`] = amounts[code] || 0;
  });
  return placeholders;
}

// Helper to construct amounts object from DB row
function mapDbRowToAmounts(row: any): Record<CurrencyCode, number> {
  const amounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  SUPPORTED_CURRENCIES.forEach(code => {
    const colName = `amount_${code.toLowerCase()}`;
    amounts[code] = row[colName] !== undefined && row[colName] !== null ? Number(row[colName]) : 0;
  });
  return amounts;
}

const amountDbColumns = SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()}`).join(', ');
const amountDbValuePlaceholders = SUPPORTED_CURRENCIES.map(c => `$amount_${c.toLowerCase()}`).join(', ');

async function getDb() {
  await initializeDb(); 
  return openDb();
}

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
  const categories = await readData<Category[]>(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'isDefault'>): Promise<Category> {
  const categories = await getCategoriesAction();
  if (categories.some(cat => cat.name.toLowerCase() === categoryData.name.toLowerCase())) {
    throw new Error(`Category with name "${categoryData.name}" already exists.`);
  }
  const newCategory: Category = {
    id: generateId(),
    name: categoryData.name,
    icon: categoryData.icon,
    isDefault: false,
  };
  const updatedCategories = [...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name));
  await writeData(DATA_FILE_PATHS.categories, updatedCategories);
  return newCategory;
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  let categories = await getCategoriesAction();
  const existingCategoryWithSameName = categories.find(
    cat => cat.name.toLowerCase() === updatedCategory.name.toLowerCase() && cat.id !== updatedCategory.id
  );
  if (existingCategoryWithSameName) {
    throw new Error(`Cannot update category: name "${updatedCategory.name}" is already in use by another category.`);
  }
  
  categories = categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
                         .sort((a, b) => a.name.localeCompare(b.name));
  await writeData(DATA_FILE_PATHS.categories, categories);
  return updatedCategory;
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; message?: string }> {
  const categories = await getCategoriesAction();
  const categoryToDelete = categories.find(cat => cat.id === id);

  if (!categoryToDelete) {
    return { success: false, message: "Category not found." };
  }
  if (categoryToDelete.isDefault) {
    return { success: false, message: "Default categories cannot be deleted." };
  }

  const db = await getDb();
  const expenseCount = await db.get('SELECT COUNT(*) as count FROM expenses WHERE categoryId = ?', id);
  if (expenseCount && expenseCount.count > 0) {
    return { success: false, message: `Category "${categoryToDelete.name}" is in use by expenses and cannot be deleted.` };
  }

  const subscriptionCount = await db.get('SELECT COUNT(*) as count FROM subscriptions WHERE categoryId = ?', id);
  if (subscriptionCount && subscriptionCount.count > 0) {
    return { success: false, message: `Category "${categoryToDelete.name}" is in use by subscriptions and cannot be deleted.` };
  }

  const updatedCategories = categories.filter(cat => cat.id !== id);
  await writeData(DATA_FILE_PATHS.categories, updatedCategories);
  return { success: true };
}

export async function resetCategoriesAction(): Promise<Category[]> {
  const sortedDefaultCategories = [...DEFAULT_CATEGORIES].sort((a,b) => a.name.localeCompare(b.name));
  await writeData(DATA_FILE_PATHS.categories, sortedDefaultCategories);
  return sortedDefaultCategories;
}

// Expense Actions
export async function getExpensesAction(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.all(`SELECT id, date, categoryId, originalAmount, originalCurrency, day_of_week, ${amountDbColumns}, description FROM expenses ORDER BY date DESC`);
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    categoryId: row.categoryId,
    originalAmount: Number(row.originalAmount),
    originalCurrency: row.originalCurrency as CurrencyCode,
    dayOfWeek: Number(row.day_of_week),
    amounts: mapDbRowToAmounts(row),
    description: row.description,
  }));
}

export async function addExpenseAction(
  expenseData: Omit<Expense, 'id' | 'amounts' | 'dayOfWeek'> & { originalAmount: number; originalCurrency: CurrencyCode }
): Promise<Expense> {
  const db = await getDb();
  const amounts = await convertAmountToAllCurrencies(expenseData.originalAmount, expenseData.originalCurrency);
  const newExpenseId = generateId();
  const dayOfWeek = calculateDayOfWeek(expenseData.date);
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `INSERT INTO expenses (id, date, categoryId, originalAmount, originalCurrency, day_of_week, ${amountDbColumns}, description)
     VALUES ($id, $date, $categoryId, $originalAmount, $originalCurrency, $day_of_week, ${amountDbValuePlaceholders}, $description)`,
    {
      $id: newExpenseId,
      $date: expenseData.date,
      $categoryId: expenseData.categoryId,
      $originalAmount: expenseData.originalAmount,
      $originalCurrency: expenseData.originalCurrency,
      $day_of_week: dayOfWeek,
      ...dbAmountParams,
      $description: expenseData.description,
    }
  );
  return { ...expenseData, id: newExpenseId, amounts, dayOfWeek };
}

export async function updateExpenseAction(updatedExpenseData: Expense): Promise<Expense> {
  const db = await getDb();
  const existingExpenseRow = await db.get('SELECT originalAmount, originalCurrency FROM expenses WHERE id = ?', updatedExpenseData.id);

  if (!existingExpenseRow) {
    throw new Error("Expense not found for update.");
  }
  
  let amounts = updatedExpenseData.amounts;
  if (
    Number(existingExpenseRow.originalAmount) !== updatedExpenseData.originalAmount ||
    existingExpenseRow.originalCurrency !== updatedExpenseData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(updatedExpenseData.originalAmount, updatedExpenseData.originalCurrency);
  }
  
  const dayOfWeek = calculateDayOfWeek(updatedExpenseData.date);
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `UPDATE expenses SET date = $date, categoryId = $categoryId, originalAmount = $originalAmount, originalCurrency = $originalCurrency, day_of_week = $day_of_week, ${SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} = $amount_${c.toLowerCase()}`).join(', ')}, description = $description
     WHERE id = $id`,
    {
      $id: updatedExpenseData.id,
      $date: updatedExpenseData.date,
      $categoryId: updatedExpenseData.categoryId,
      $originalAmount: updatedExpenseData.originalAmount,
      $originalCurrency: updatedExpenseData.originalCurrency,
      $day_of_week: dayOfWeek,
      ...dbAmountParams,
      $description: updatedExpenseData.description,
    }
  );
  return { ...updatedExpenseData, amounts, dayOfWeek }; // Ensure dayOfWeek is part of returned object
}

export async function deleteExpenseAction(id: string): Promise<{ success: boolean }> {
  const db = await getDb();
  await db.run('DELETE FROM expenses WHERE id = ?', id);
  return { success: true };
}

export async function deleteAllExpensesAction(): Promise<{ success: boolean }> {
  const db = await getDb();
  await db.run('DELETE FROM expenses');
  return { success: true };
}

// Subscription Actions
export async function getSubscriptionsAction(): Promise<Subscription[]> {
  const db = await getDb();
  const rows = await db.all(`SELECT id, name, categoryId, originalAmount, originalCurrency, ${amountDbColumns}, startDate, endDate, description FROM subscriptions ORDER BY name ASC`);
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    originalAmount: Number(row.originalAmount),
    originalCurrency: row.originalCurrency as CurrencyCode,
    amounts: mapDbRowToAmounts(row),
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
  }));
}

export async function addSubscriptionAction(
  subscriptionData: Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }
): Promise<Subscription> {
  if (!subscriptionData.categoryId || typeof subscriptionData.categoryId !== 'string' || subscriptionData.categoryId.trim() === '') {
    console.error("addSubscriptionAction: categoryId is missing or invalid.", subscriptionData);
    throw new Error('Subscription categoryId is missing or invalid.');
  }
  const db = await getDb();
  const amounts = await convertAmountToAllCurrencies(subscriptionData.originalAmount, subscriptionData.originalCurrency);
  const newSubscriptionId = generateId();

  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `INSERT INTO subscriptions (id, name, categoryId, originalAmount, originalCurrency, ${amountDbColumns}, startDate, endDate, description)
     VALUES ($id, $name, $categoryId, $originalAmount, $originalCurrency, ${amountDbValuePlaceholders}, $startDate, $endDate, $description)`,
    {
      $id: newSubscriptionId,
      $name: subscriptionData.name,
      $categoryId: subscriptionData.categoryId,
      $originalAmount: subscriptionData.originalAmount,
      $originalCurrency: subscriptionData.originalCurrency,
      ...dbAmountParams,
      $startDate: subscriptionData.startDate,
      $endDate: subscriptionData.endDate,
      $description: subscriptionData.description,
    }
  );
  return { ...subscriptionData, id: newSubscriptionId, amounts };
}

export async function updateSubscriptionAction(updatedSubscriptionData: Subscription): Promise<Subscription> {
  if (!updatedSubscriptionData.categoryId || typeof updatedSubscriptionData.categoryId !== 'string' || updatedSubscriptionData.categoryId.trim() === '') {
    console.error("updateSubscriptionAction: categoryId is missing or invalid.", updatedSubscriptionData);
    throw new Error('Subscription categoryId is missing or invalid for update.');
  }
  const db = await getDb();
  const existingSubRow = await db.get('SELECT originalAmount, originalCurrency FROM subscriptions WHERE id = ?', updatedSubscriptionData.id);
  
  if (!existingSubRow) {
    throw new Error("Subscription not found for update.");
  }

  let amounts = updatedSubscriptionData.amounts;
  if (
    Number(existingSubRow.originalAmount) !== updatedSubscriptionData.originalAmount ||
    existingSubRow.originalCurrency !== updatedSubscriptionData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(updatedSubscriptionData.originalAmount, updatedSubscriptionData.originalCurrency);
  }
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `UPDATE subscriptions SET name = $name, categoryId = $categoryId, originalAmount = $originalAmount, originalCurrency = $originalCurrency, ${SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} = $amount_${c.toLowerCase()}`).join(', ')}, startDate = $startDate, endDate = $endDate, description = $description
     WHERE id = $id`,
    {
      $id: updatedSubscriptionData.id,
      $name: updatedSubscriptionData.name,
      $categoryId: updatedSubscriptionData.categoryId,
      $originalAmount: updatedSubscriptionData.originalAmount,
      $originalCurrency: updatedSubscriptionData.originalCurrency,
      ...dbAmountParams,
      $startDate: updatedSubscriptionData.startDate,
      $endDate: updatedSubscriptionData.endDate,
      $description: updatedSubscriptionData.description,
    }
  );
  return { ...updatedSubscriptionData, amounts };
}

export async function deleteSubscriptionAction(id: string): Promise<{ success: boolean }> {
  const db = await getDb();
  await db.run('DELETE FROM subscriptions WHERE id = ?', id);
  return { success: true };
}
