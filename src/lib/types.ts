
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
  apiKey?: string;
  monthlyBudget?: number;
  lastRatesSync?: string | null; // For display purposes, dynamically populated
}

export interface RatesFile {
  lastFetched: string | null;
  rates: Partial<Record<CurrencyCode, Partial<Record<CurrencyCode, number>>>>;
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

// Used by DailyExpensesLineChart and for intermediate calcs in report-actions
export interface DailyTotalDataPoint {
  rawDate: string; // e.g., '2023-10-27' (actual date string)
  displayDate: string; // e.g., 'Oct 27' or '27' (formatted for display)
  amount: number; // Total spending for this day
}

// Specific structure for category breakdown in reports
export interface CategoryBreakdownPoint {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
}

// Overall metrics returned by the main report action
export interface OverallPeriodMetrics {
  totalOverallSpending: number;
  dailyTotalsArray: DailyTotalDataPoint[];
  categoryBreakdownArray: CategoryBreakdownPoint[];
  // New fields for WeekdaySpendingBarChart
  weekdayExpenseTotals: number[]; // Index 0=Mon, ..., 6=Sun
  weekdaySubscriptionTotals: number[]; // Index 0=Mon, ..., 6=Sun
  weekdayOccurrences: number[]; // Index 0=Mon, ..., 6=Sun
  dailySpendingByWeekdayForErrorBar: Record<number, number[]>; // Key 0-6 (Mon-Sun), value is array of daily total amounts
}
