import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
}

export interface Expense {
  id: string;
  date: string; // ISO string
  categoryId: string;
  amount: number;
  description?: string;
}

export interface Subscription {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  startDate: string; // ISO string
  description?: string;
}

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly';

export interface ChartDataPoint {
  name: string;
  [key: string]: number | string; // Allows for dynamic series keys, e.g., { name: 'Category A', Expenses: 100 }
}
