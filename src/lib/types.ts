

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
  originalAmount: number; 
  originalCurrency: CurrencyCode; 
  amounts: Record<CurrencyCode, number>; 
  startDate: string; // ISO string
  endDate?: string; // Optional ISO string
  description?: string;
}

export interface AppSettings {
  defaultCurrency: CurrencyCode;
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

// Updated to reflect that 'value' is the generic term for the pie chart data key
export interface ChartDataPoint {
  name: string; // Typically category name
  value: number; // The aggregated amount for that category in the default currency
}

