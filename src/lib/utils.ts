
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyCode } from "./types";

/**
 * Combines multiple class names into a single string, handling conditional classes
 * and resolving Tailwind CSS conflicts.
 * @param inputs - A list of class names or conditional class objects.
 * @returns A string of combined class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as a currency string according to the specified currency code and locale.
 * @param amount - The number to format.
 * @param currencyCode - The ISO 4217 currency code (e.g., 'USD', 'EUR').
 * @param locale - The locale string (e.g., 'en-US', 'de-DE'). Defaults to 'en-US'.
 * @returns A formatted currency string.
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode, locale: string = 'en-US'): string {
  // Check for NaN or other invalid number types to prevent errors
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

    