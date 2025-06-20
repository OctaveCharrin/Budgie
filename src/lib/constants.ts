import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'restaurant', name: 'Restaurant', icon: 'UtensilsCrossed' },
  { id: 'bar', name: 'Bar', icon: 'Martini' },
  { id: 'transportation', name: 'Transportation', icon: 'Bus' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat' },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart' },
  { id: 'food', name: 'Food', icon: 'Apple' },
  { id: 'gift', name: 'Gift', icon: 'Gift' },
  { id: 'home', name: 'Home', icon: 'Home' },
  { id: 'car', name: 'Car', icon: 'Car' },
  { id: 'tech', name: 'Tech', icon: 'Laptop' },
];

// Changed from LOCAL_STORAGE_KEYS to DATA_FILE_PATHS
export const DATA_FILE_PATHS = {
  expenses: 'expenses.json',
  subscriptions: 'subscriptions.json',
  categories: 'categories.json',
};
