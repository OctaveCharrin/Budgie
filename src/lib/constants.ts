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

export const LOCAL_STORAGE_KEYS = {
  expenses: 'trackright-expenses',
  subscriptions: 'trackright-subscriptions',
  categories: 'trackright-categories',
};
