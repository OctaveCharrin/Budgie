
'use server';

import { readData, writeData } from '@/lib/file-service';
import { DATA_FILE_PATHS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from '@/lib/constants';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { convertAmountToAllCurrencies } from '@/services/exchange-rate-service';
import { openDb } from '@/lib/db';
import { getDay as getDayFns } from 'date-fns'; // For day of week calculation
import { z } from 'zod';

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

// --- Zod Schemas for Server-Side Validation ---
const SettingsSchema = z.object({
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES),
  apiKey: z.string().optional(),
  apiKeyStatus: z.enum(['valid', 'invalid', 'unchecked', 'missing']).optional(),
});

const CategoryBaseSchema = z.object({
  name: z.string().min(1, "Category name is required."),
  icon: z.string().min(1, "Icon is required."), // Assuming icon is a string name from lucide-react
});

const AddCategoryInputSchema = CategoryBaseSchema;
const UpdateCategoryInputSchema = CategoryBaseSchema.extend({
  id: z.string().uuid("Invalid category ID."),
  isDefault: z.boolean().optional(),
});


const ExpenseBaseSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  categoryId: z.string().min(1, "Category ID is required."),
  originalAmount: z.number().positive("Amount must be positive."),
  originalCurrency: z.enum(SUPPORTED_CURRENCIES),
  description: z.string().optional(),
});

const AddExpenseInputSchema = ExpenseBaseSchema;
const UpdateExpenseInputSchema = ExpenseBaseSchema.extend({
  id: z.string().uuid("Invalid expense ID."),
  amounts: z.record(z.enum(SUPPORTED_CURRENCIES), z.number()), // Assuming amounts will be passed if already calculated
  dayOfWeek: z.number().min(0).max(6).optional(), // dayOfWeek is calculated server-side but might be part of full Expense object
});


const SubscriptionBaseSchema = z.object({
  name: z.string().min(1, "Subscription name is required."),
  categoryId: z.string().min(1, "Category ID is required."),
  originalAmount: z.number().positive("Amount must be positive."),
  originalCurrency: z.enum(SUPPORTED_CURRENCIES),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid start date format." }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid end date format." }).optional(),
  description: z.string().optional(),
});

const AddSubscriptionInputSchema = SubscriptionBaseSchema;
const UpdateSubscriptionInputSchema = SubscriptionBaseSchema.extend({
  id: z.string().uuid("Invalid subscription ID."),
  amounts: z.record(z.enum(SUPPORTED_CURRENCIES), z.number()),
});


// Settings Actions
export async function getSettingsAction(): Promise<AppSettings> {
  return readData<AppSettings>(DATA_FILE_PATHS.settings, DEFAULT_SETTINGS);
}

export async function updateSettingsAction(updatedSettings: AppSettings): Promise<AppSettings> {
  const parsedSettings = SettingsSchema.parse(updatedSettings);
  await writeData(DATA_FILE_PATHS.settings, parsedSettings);
  return parsedSettings;
}

// Category Actions
export async function getCategoriesAction(): Promise<Category[]> {
  const categories = await readData<Category[]>(DATA_FILE_PATHS.categories, DEFAULT_CATEGORIES);
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'isDefault'>): Promise<Category> {
  const parsedData = AddCategoryInputSchema.parse(categoryData);
  const categories = await getCategoriesAction();
  if (categories.some(cat => cat.name.toLowerCase() === parsedData.name.toLowerCase())) {
    throw new Error(`Category with name "${parsedData.name}" already exists.`);
  }
  const newCategory: Category = {
    id: generateId(),
    name: parsedData.name,
    icon: parsedData.icon,
    isDefault: false,
  };
  const updatedCategories = [...categories, newCategory].sort((a, b) => a.name.localeCompare(b.name));
  await writeData(DATA_FILE_PATHS.categories, updatedCategories);
  return newCategory;
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  const parsedCategory = UpdateCategoryInputSchema.parse(updatedCategory);
  let categories = await getCategoriesAction();
  const existingCategoryWithSameName = categories.find(
    cat => cat.name.toLowerCase() === parsedCategory.name.toLowerCase() && cat.id !== parsedCategory.id
  );
  if (existingCategoryWithSameName) {
    throw new Error(`Cannot update category: name "${parsedCategory.name}" is already in use by another category.`);
  }
  
  categories = categories.map(cat => cat.id === parsedCategory.id ? parsedCategory : cat)
                         .sort((a, b) => a.name.localeCompare(b.name));
  await writeData(DATA_FILE_PATHS.categories, categories);
  return parsedCategory;
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; message?: string }> {
  z.string().uuid("Invalid category ID.").parse(id);
  const categories = await getCategoriesAction();
  const categoryToDelete = categories.find(cat => cat.id === id);

  if (!categoryToDelete) {
    return { success: false, message: "Category not found." };
  }
  if (categoryToDelete.isDefault) {
    return { success: false, message: "Default categories cannot be deleted." };
  }

  const db = await openDb();
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
  const db = await openDb();
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
  const parsedData = AddExpenseInputSchema.parse(expenseData);
  const db = await openDb();
  const currentSettings = await getSettingsAction();
  const amounts = await convertAmountToAllCurrencies(parsedData.originalAmount, parsedData.originalCurrency, currentSettings.apiKey);
  const newExpenseId = generateId();
  const dayOfWeek = calculateDayOfWeek(parsedData.date);
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `INSERT INTO expenses (id, date, categoryId, originalAmount, originalCurrency, day_of_week, ${amountDbColumns}, description)
     VALUES ($id, $date, $categoryId, $originalAmount, $originalCurrency, $day_of_week, ${amountDbValuePlaceholders}, $description)`,
    {
      $id: newExpenseId,
      $date: parsedData.date,
      $categoryId: parsedData.categoryId,
      $originalAmount: parsedData.originalAmount,
      $originalCurrency: parsedData.originalCurrency,
      $day_of_week: dayOfWeek,
      ...dbAmountParams,
      $description: parsedData.description,
    }
  );
  return { ...parsedData, id: newExpenseId, amounts, dayOfWeek };
}

export async function updateExpenseAction(updatedExpenseData: Expense): Promise<Expense> {
  const parsedData = UpdateExpenseInputSchema.parse(updatedExpenseData);
  const db = await openDb();
  const currentSettings = await getSettingsAction();
  const existingExpenseRow = await db.get('SELECT originalAmount, originalCurrency FROM expenses WHERE id = ?', parsedData.id);

  if (!existingExpenseRow) {
    throw new Error("Expense not found for update.");
  }
  
  let amounts = parsedData.amounts;
  if (
    Number(existingExpenseRow.originalAmount) !== parsedData.originalAmount ||
    existingExpenseRow.originalCurrency !== parsedData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(parsedData.originalAmount, parsedData.originalCurrency, currentSettings.apiKey);
  }
  
  const dayOfWeek = calculateDayOfWeek(parsedData.date);
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `UPDATE expenses SET date = $date, categoryId = $categoryId, originalAmount = $originalAmount, originalCurrency = $originalCurrency, day_of_week = $day_of_week, ${SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} = $amount_${c.toLowerCase()}`).join(', ')}, description = $description
     WHERE id = $id`,
    {
      $id: parsedData.id,
      $date: parsedData.date,
      $categoryId: parsedData.categoryId,
      $originalAmount: parsedData.originalAmount,
      $originalCurrency: parsedData.originalCurrency,
      $day_of_week: dayOfWeek,
      ...dbAmountParams,
      $description: parsedData.description,
    }
  );
  return { ...parsedData, date: parsedData.date, amounts, dayOfWeek };
}

export async function deleteExpenseAction(id: string): Promise<{ success: boolean }> {
  z.string().uuid("Invalid expense ID.").parse(id);
  const db = await openDb();
  await db.run('DELETE FROM expenses WHERE id = ?', id);
  return { success: true };
}

export async function deleteAllExpensesAction(): Promise<{ success: boolean }> {
  const db = await openDb();
  await db.run('DELETE FROM expenses');
  return { success: true };
}

// Subscription Actions
export async function getSubscriptionsAction(): Promise<Subscription[]> {
  const db = await openDb();
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
  const parsedData = AddSubscriptionInputSchema.parse(subscriptionData);
  if (!parsedData.categoryId || typeof parsedData.categoryId !== 'string' || parsedData.categoryId.trim() === '') {
    console.error("addSubscriptionAction: categoryId is missing or invalid.", parsedData);
    throw new Error('Subscription categoryId is missing or invalid.');
  }
  const db = await openDb();
  const currentSettings = await getSettingsAction();
  const amounts = await convertAmountToAllCurrencies(parsedData.originalAmount, parsedData.originalCurrency, currentSettings.apiKey);
  const newSubscriptionId = generateId();

  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `INSERT INTO subscriptions (id, name, categoryId, originalAmount, originalCurrency, ${amountDbColumns}, startDate, endDate, description)
     VALUES ($id, $name, $categoryId, $originalAmount, $originalCurrency, ${amountDbValuePlaceholders}, $startDate, $endDate, $description)`,
    {
      $id: newSubscriptionId,
      $name: parsedData.name,
      $categoryId: parsedData.categoryId,
      $originalAmount: parsedData.originalAmount,
      $originalCurrency: parsedData.originalCurrency,
      ...dbAmountParams,
      $startDate: parsedData.startDate,
      $endDate: parsedData.endDate,
      $description: parsedData.description,
    }
  );
  return { ...parsedData, startDate: parsedData.startDate, endDate: parsedData.endDate, id: newSubscriptionId, amounts };
}

export async function updateSubscriptionAction(updatedSubscriptionData: Subscription): Promise<Subscription> {
  const parsedData = UpdateSubscriptionInputSchema.parse(updatedSubscriptionData);
  if (!parsedData.categoryId || typeof parsedData.categoryId !== 'string' || parsedData.categoryId.trim() === '') {
    console.error("updateSubscriptionAction: categoryId is missing or invalid.", parsedData);
    throw new Error('Subscription categoryId is missing or invalid for update.');
  }
  const db = await openDb();
  const currentSettings = await getSettingsAction();
  const existingSubRow = await db.get('SELECT originalAmount, originalCurrency FROM subscriptions WHERE id = ?', parsedData.id);
  
  if (!existingSubRow) {
    throw new Error("Subscription not found for update.");
  }

  let amounts = parsedData.amounts;
  if (
    Number(existingSubRow.originalAmount) !== parsedData.originalAmount ||
    existingSubRow.originalCurrency !== parsedData.originalCurrency
  ) {
    amounts = await convertAmountToAllCurrencies(parsedData.originalAmount, parsedData.originalCurrency, currentSettings.apiKey);
  }
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `UPDATE subscriptions SET name = $name, categoryId = $categoryId, originalAmount = $originalAmount, originalCurrency = $originalCurrency, ${SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} = $amount_${c.toLowerCase()}`).join(', ')}, startDate = $startDate, endDate = $endDate, description = $description
     WHERE id = $id`,
    {
      $id: parsedData.id,
      $name: parsedData.name,
      $categoryId: parsedData.categoryId,
      $originalAmount: parsedData.originalAmount,
      $originalCurrency: parsedData.originalCurrency,
      ...dbAmountParams,
      $startDate: parsedData.startDate,
      $endDate: parsedData.endDate,
      $description: parsedData.description,
    }
  );
  return { ...parsedData, startDate: parsedData.startDate, endDate: parsedData.endDate, amounts };
}

export async function deleteSubscriptionAction(id: string): Promise<{ success: boolean }> {
  z.string().uuid("Invalid subscription ID.").parse(id);
  const db = await openDb();
  await db.run('DELETE FROM subscriptions WHERE id = ?', id);
  return { success: true };
}

export async function deleteAllSubscriptionsAction(): Promise<{ success: boolean }> {
  const db = await openDb();
  await db.run('DELETE FROM subscriptions');
  return { success: true };
}
