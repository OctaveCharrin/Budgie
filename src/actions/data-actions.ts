
'use server';

import { readData, writeData } from '@/lib/file-service';
import { DATA_FILE_PATHS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SUPPORTED_CURRENCIES } from '@/lib/constants';
import type { Expense, Subscription, Category, AppSettings, CurrencyCode } from '@/lib/types';
import { convertAmountToAllCurrencies } from '@/services/exchange-rate-service';
import { openDb, initializeDb } from '@/lib/db';

const generateId = () => crypto.randomUUID();

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


// Initialize DB connection early
async function getDb() {
  await initializeDb(); // Ensures tables are created
  return openDb();
}

// Settings Actions (remain file-based)
export async function getSettingsAction(): Promise<AppSettings> {
  return readData<AppSettings>(DATA_FILE_PATHS.settings, DEFAULT_SETTINGS);
}

export async function updateSettingsAction(updatedSettings: AppSettings): Promise<AppSettings> {
  await writeData(DATA_FILE_PATHS.settings, updatedSettings);
  return updatedSettings;
}

// Category Actions
export async function getCategoriesAction(): Promise<Category[]> {
  const db = await getDb();
  const categories = await db.all<Category[]>('SELECT id, name, icon, isDefault FROM categories ORDER BY name ASC');
  return categories.map(c => ({ ...c, isDefault: Boolean(c.isDefault) }));
}

export async function addCategoryAction(categoryData: Omit<Category, 'id' | 'isDefault'>): Promise<Category> {
  const db = await getDb();
  const newCategory: Category = {
    id: generateId(),
    name: categoryData.name,
    icon: categoryData.icon,
    isDefault: false,
  };
  try {
    await db.run(
      'INSERT INTO categories (id, name, icon, isDefault) VALUES ($id, $name, $icon, $isDefault)',
      { $id: newCategory.id, $name: newCategory.name, $icon: newCategory.icon, $isDefault: newCategory.isDefault ? 1: 0 }
    );
    return newCategory;
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: categories.name')) {
      throw new Error(`Category with name "${newCategory.name}" already exists.`);
    }
    throw error;
  }
}

export async function updateCategoryAction(updatedCategory: Category): Promise<Category> {
  const db = await getDb();
  try {
    await db.run(
      'UPDATE categories SET name = $name, icon = $icon, isDefault = $isDefault WHERE id = $id',
      { $name: updatedCategory.name, $icon: updatedCategory.icon, $isDefault: updatedCategory.isDefault ? 1 : 0, $id: updatedCategory.id }
    );
    return updatedCategory;
  } catch (error: any) {
     if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: categories.name')) {
      throw new Error(`Cannot update category: name "${updatedCategory.name}" is already in use by another category.`);
    }
    throw error;
  }
}

export async function deleteCategoryAction(id: string): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  const categoryToDelete = await db.get<Category>('SELECT id, name, isDefault FROM categories WHERE id = ?', id);

  if (!categoryToDelete) {
    return { success: false, message: "Category not found." };
  }
  if (categoryToDelete.isDefault) {
    return { success: false, message: "Default categories cannot be deleted." };
  }

  const expenseCount = await db.get('SELECT COUNT(*) as count FROM expenses WHERE categoryId = ?', id);
  if (expenseCount && expenseCount.count > 0) {
    return { success: false, message: `Category "${categoryToDelete.name}" is in use by expenses and cannot be deleted.` };
  }

  const subscriptionCount = await db.get('SELECT COUNT(*) as count FROM subscriptions WHERE categoryId = ?', id);
  if (subscriptionCount && subscriptionCount.count > 0) {
    return { success: false, message: `Category "${categoryToDelete.name}" is in use by subscriptions and cannot be deleted.` };
  }

  await db.run('DELETE FROM categories WHERE id = ?', id);
  return { success: true };
}

export async function resetCategoriesAction(): Promise<Category[]> {
  const db = await getDb();
  // Delete all non-default (custom) categories first
  await db.run('DELETE FROM categories WHERE isDefault = 0');
  
  // Then, insert or replace default categories to ensure they are up-to-date
  // This also adds them if they were somehow deleted or are missing
  const stmt = await db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, isDefault) VALUES (?, ?, ?, ?)');
  for (const category of DEFAULT_CATEGORIES) {
    await stmt.run(category.id, category.name, category.icon, 1); // isDefault is true (1)
  }
  await stmt.finalize();
  
  return getCategoriesAction(); // Fetch and return the current state of categories
}

// Expense Actions
export async function getExpensesAction(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.all(`SELECT id, date, categoryId, originalAmount, originalCurrency, ${amountDbColumns}, description FROM expenses ORDER BY date DESC`);
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    categoryId: row.categoryId,
    originalAmount: Number(row.originalAmount),
    originalCurrency: row.originalCurrency as CurrencyCode,
    amounts: mapDbRowToAmounts(row),
    description: row.description,
  }));
}

export async function addExpenseAction(
  expenseData: Omit<Expense, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode }
): Promise<Expense> {
  const db = await getDb();
  const amounts = await convertAmountToAllCurrencies(expenseData.originalAmount, expenseData.originalCurrency);
  const newExpenseId = generateId();
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `INSERT INTO expenses (id, date, categoryId, originalAmount, originalCurrency, ${amountDbColumns}, description)
     VALUES ($id, $date, $categoryId, $originalAmount, $originalCurrency, ${amountDbValuePlaceholders}, $description)`,
    {
      $id: newExpenseId,
      $date: expenseData.date,
      $categoryId: expenseData.categoryId,
      $originalAmount: expenseData.originalAmount,
      $originalCurrency: expenseData.originalCurrency,
      ...dbAmountParams,
      $description: expenseData.description,
    }
  );
  return { ...expenseData, id: newExpenseId, amounts };
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
  
  const dbAmountParams = mapAmountsToDbPlaceholders(amounts);

  await db.run(
    `UPDATE expenses SET date = $date, categoryId = $categoryId, originalAmount = $originalAmount, originalCurrency = $originalCurrency, ${SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} = $amount_${c.toLowerCase()}`).join(', ')}, description = $description
     WHERE id = $id`,
    {
      $id: updatedExpenseData.id,
      $date: updatedExpenseData.date,
      $categoryId: updatedExpenseData.categoryId,
      $originalAmount: updatedExpenseData.originalAmount,
      $originalCurrency: updatedExpenseData.originalCurrency,
      ...dbAmountParams,
      $description: updatedExpenseData.description,
    }
  );
  return { ...updatedExpenseData, amounts };
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
