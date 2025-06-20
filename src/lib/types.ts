
import type { LucideIcon } from 'lucide-react';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'JPY', 'CHF'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  isDefault?: boolean; // Added to mark default categories
}

export interface Expense {
  id: string;
  date: string; // ISO string
  categoryId: string;
  originalAmount: number;
  originalCurrency: CurrencyCode;
  amounts: Record<CurrencyCode, number>; // Stores amount in all supported currencies
  dayOfWeek: number; // 0 for Monday, 1 for Tuesday, ..., 6 for Sunday
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

export interface ChartDataPoint {
  name: string;
  value: number; 
}

export interface DailyTotalDataPoint {
  rawDate: string; // e.g., '2023-10-27'
  displayDate: string; // e.g., 'Oct 27' or '27' depending on period
  amount: number;
}

