
'use server';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { SUPPORTED_CURRENCIES } from '@/lib/constants'; // DEFAULT_CATEGORIES removed

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
  await newDb.exec('PRAGMA foreign_keys = ON;'); // Keep for expenses/subscriptions FKs if categories were in DB
  db = newDb;
  return db;
}

const amountColumns = SUPPORTED_CURRENCIES.map(c => `amount_${c.toLowerCase()} REAL`).join(', ');

export async function initializeDb() {
  const dbInstance = await openDb();

  // Categories table is no longer managed by SQLite
  // await dbInstance.exec(`
  //   CREATE TABLE IF NOT EXISTS categories (
  //     id TEXT PRIMARY KEY,
  //     name TEXT NOT NULL UNIQUE,
  //     icon TEXT NOT NULL,
  //     isDefault BOOLEAN DEFAULT FALSE
  //   );
  // `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      categoryId TEXT, -- No longer a strict FK to a categories table in this DB
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      ${amountColumns},
      description TEXT
      -- FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL -- This FK is conceptual now
    );
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT, -- No longer a strict FK to a categories table in this DB
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      ${amountColumns},
      startDate TEXT NOT NULL,
      endDate TEXT,
      description TEXT
      -- FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL -- This FK is conceptual now
    );
  `);

  // Seeding default categories into the database is removed
}

// Call initializeDb when this module is loaded
initializeDb().catch(console.error);
