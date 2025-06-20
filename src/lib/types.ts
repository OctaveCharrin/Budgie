import type { LucideIcon } from 'lucide-react';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'JPY', 'CHF'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
}

export interface Expense {
  id: string;
  date: string; // ISO string
  categoryId: string;
  originalAmount: number;
  originalCurrency: CurrencyCode;
  amounts: Record<CurrencyCode, number>; // Stores amount in all supported currencies
  description?: string;
}

export interface Subscription {
  id: string;
  name: string;
  categoryId: string;
  amount: number; // Assumed to be in the default display currency
  startDate: string; // ISO string
  description?: string;
}

export interface AppSettings {
  defaultCurrency: CurrencyCode;
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export interface ChartDataPoint {
  name: string;
  [key: string]: number | string;
}