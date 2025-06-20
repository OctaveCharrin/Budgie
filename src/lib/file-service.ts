
'use server';
import fs from 'fs/promises';
import path from 'path';
// DEFAULT_CATEGORIES and DATA_FILE_PATHS.categories are no longer needed here for category initialization
// as categories are now managed by the database.

const dataDir = path.join(process.cwd(), 'data');

async function ensureDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    // If directory doesn't exist, create it.
    // This is also where the SQLite DB file will be stored by db.ts.
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readData<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    // If file doesn't exist or is invalid, write the default value and return it
    await writeData(filename, defaultValue);
    return defaultValue;
  }
}

export async function writeData<T>(filename: string, data: T): Promise<void> {
  await ensureDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to file ${filename}:`, error);
    throw new Error(`Failed to write data to ${filename}`);
  }
}
