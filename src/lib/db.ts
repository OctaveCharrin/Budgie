
'use server';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const dataDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'budgie.db');

let db: Database | null = null;

async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function openDb(): Promise<Database> {
  if (db) {
    return db;
  }
  await ensureDataDirExists();
  const newDb = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });
  await newDb.exec('PRAGMA foreign_keys = ON;');
  db = newDb;
  return db;
}

const amountColumns = SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} REAL`).join(', ');

export async function initializeDb() {
  const dbInstance = await openDb();

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      categoryId TEXT, 
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      day_of_week INTEGER NOT NULL, 
      ${amountColumns},
      description TEXT
    );
  `);

  // Check and add day_of_week column to expenses if it doesn't exist (for existing databases)
  const expensesTableInfo = await dbInstance.all<{name: string, type: string}>('PRAGMA table_info(expenses);');
  const dayOfWeekColumnExists = expensesTableInfo.some(col => col.name === 'day_of_week');

  if (!dayOfWeekColumnExists) {
    console.log("Adding missing 'day_of_week' column to 'expenses' table with NOT NULL DEFAULT 0.");
    // Add the column with NOT NULL and a DEFAULT value to satisfy the constraint for existing rows.
    // New/updated rows will get the correct calculated value from data-actions.ts.
    await dbInstance.exec('ALTER TABLE expenses ADD COLUMN day_of_week INTEGER NOT NULL DEFAULT 0;');
  }

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT, 
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      ${amountColumns},
      startDate TEXT NOT NULL,
      endDate TEXT,
      description TEXT
    );
  `);
}

initializeDb().catch(console.error);
