
'use server';
import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_CATEGORIES, DATA_FILE_PATHS } from '@/lib/constants'; // Import DEFAULT_CATEGORIES

const dataDir = path.join(process.cwd(), 'data');

async function ensureDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function readData<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    // Special handling for categories.json to ensure it's initialized if empty or missing
    if (filename === DATA_FILE_PATHS.categories && (!jsonData || (Array.isArray(jsonData) && jsonData.length === 0))) {
        await writeData(filename, DEFAULT_CATEGORIES as unknown as T);
        return DEFAULT_CATEGORIES as unknown as T;
    }
    return jsonData as T;
  } catch (error) {
    // If file doesn't exist or is invalid, write the default value and return it
    if (filename === DATA_FILE_PATHS.categories) {
      await writeData(filename, DEFAULT_CATEGORIES as unknown as T);
      return DEFAULT_CATEGORIES as unknown as T;
    }
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
