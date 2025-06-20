import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'UtensilsCrossed' },
  { id: 'transport', name: 'Car' },
  { id: 'utilities', name: 'Lightbulb' },
  { id: 'entertainment', name: 'Gamepad2' },
  { id: 'health', name: 'Stethoscope' },
  { id: 'shopping', name: 'ShoppingBag' },
  { id: 'subscriptions_cat', name: 'Subscriptions', icon: 'Repeat' }, // Category specific for grouping subscription payments
  { id: 'housing', name: 'Home' },
  { id: 'education', name: 'School'},
  { id: 'personal_care', name: 'PersonStanding'}, // Or a more generic icon like 'Smile' if available
  { id: 'gifts_donations', name: 'Gift'},
  { id: 'other', name: 'HelpCircle' },
];

export const LOCAL_STORAGE_KEYS = {
  expenses: 'trackright-expenses',
  subscriptions: 'trackright-subscriptions',
  categories: 'trackright-categories',
};
