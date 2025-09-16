
import type { Category, AppSettings, CurrencyCode } from './types';
import { SUPPORTED_CURRENCIES } from './types';


export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'restaurant', name: 'Restaurant', icon: 'UtensilsCrossed', isDefault: true },
  { id: 'bar', name: 'Bar', icon: 'Martini', isDefault: true },
  { id: 'transportation', name: 'Transportation', icon: 'Bus', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', isDefault: true },
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', isDefault: true },
  { id: 'food', name: 'Food', icon: 'Apple', isDefault: true },
  { id: 'gift', name: 'Gift', icon: 'Gift', isDefault: true },
  { id: 'home', name: 'Home', icon: 'Home', isDefault: true },
  { id: 'car', name: 'Car', icon: 'Car', isDefault: true },
  { id: 'tech', name: 'Tech', icon: 'Laptop', isDefault: true },
];

export const DATA_FILE_PATHS = {
  settings: 'settings.json',
  categories: 'categories.json',
  rates: 'rates.json',
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'USD',
  apiKey: '',
  monthlyBudget: 0,
  lastRatesSync: null,
};

// Re-export SUPPORTED_CURRENCIES for easier import elsewhere
export { SUPPORTED_CURRENCIES };
