
'use server';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const dataDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'budgie.db');

let db: Database | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Ensures the data directory exists.
 */
async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

const amountColumns = SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} REAL`).join(', ');

/**
 * Performs the actual database initialization, including table creation and schema migration.
 */
async function doInitialize() {
    const dbInstance = await open({
        filename: dbFilePath,
        driver: sqlite3.Database,
    });
    await dbInstance.exec('PRAGMA foreign_keys = ON;');

    // Create expenses table if it doesn't exist
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

    // Schema migration: Add day_of_week if it doesn't exist
    const expensesTableInfo = await dbInstance.all<{name: string, type: string}>('PRAGMA table_info(expenses);');
    const dayOfWeekColumnExists = expensesTableInfo.some(col => col.name === 'day_of_week');

    if (!dayOfWeekColumnExists) {
        console.log("Adding missing 'day_of_week' column to 'expenses' table with NOT NULL DEFAULT 0.");
        await dbInstance.exec('ALTER TABLE expenses ADD COLUMN day_of_week INTEGER NOT NULL DEFAULT 0;');
    }

    // Create subscriptions table if it doesn't exist
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
    
    db = dbInstance;
}

/**
 * Initializes the database connection and schema. Uses a singleton pattern to ensure
 * initialization only runs once.
 */
export async function initializeDb() {
  if (!initializationPromise) {
    initializationPromise = ensureDataDirExists().then(doInitialize);
  }
  await initializationPromise;
}

/**
 * Opens and returns the database connection.
 * It ensures the DB is initialized before returning the connection instance.
 * @returns A promise that resolves to the database instance.
 * @throws Will throw an error if the database is not initialized correctly.
 */
export async function openDb(): Promise<Database> {
  await initializeDb();
  if (!db) {
    throw new Error("Database not initialized after initialization promise.");
  }
  return db;
}
