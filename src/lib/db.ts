
'use server';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import { DEFAULT_CATEGORIES, SUPPORTED_CURRENCIES } from '@/lib/constants';
import type { Category } from '@/lib/types';

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
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      isDefault BOOLEAN DEFAULT FALSE
    );
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      ${amountColumns},
      description TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      originalAmount REAL NOT NULL,
      originalCurrency TEXT NOT NULL,
      ${amountColumns},
      startDate TEXT NOT NULL,
      endDate TEXT,
      description TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Seed default categories if the table is empty
  const categoriesCount = await dbInstance.get('SELECT COUNT(*) as count FROM categories');
  if (categoriesCount && categoriesCount.count === 0) {
    const stmt = await dbInstance.prepare('INSERT OR IGNORE INTO categories (id, name, icon, isDefault) VALUES (?, ?, ?, ?)');
    for (const category of DEFAULT_CATEGORIES) {
      await stmt.run(category.id, category.name, category.icon, category.isDefault ? 1 : 0);
    }
    await stmt.finalize();
  }
}

// Call initializeDb when this module is loaded
initializeDb().catch(console.error);
