
'use server';
import type { CurrencyCode } from '@/lib/types';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

// IMPORTANT: Replace 'YOUR_API_KEY' with your actual ExchangeRate-API key.
// You can get a free key from https://www.exchangerate-api.com
// Consider storing this in an environment variable (e.g., .env.local)
// For example: EXCHANGE_RATE_API_KEY=yourkey
const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'YOUR_PLACEHOLDER_API_KEY';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  error?: { type: string };
}

export async function fetchExchangeRates(
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number> | null> {
  if (API_KEY === 'YOUR_PLACEHOLDER_API_KEY') {
    console.error("ExchangeRate-API key is not configured. Please set EXCHANGE_RATE_API_KEY.");
    // Fallback for prototyping if API key isn't set - assumes 1:1 for all, which is INCORRECT for real use.
    // This is to prevent app from crashing during development if key is missing.
    // In a real app, you'd throw an error or handle this more robustly.
    const fallbackRates = {} as Record<CurrencyCode, number>;
    SUPPORTED_CURRENCIES.forEach(code => fallbackRates[code] = 1);
    fallbackRates[baseCurrency] = 1;
    // Simulate conversion for other currencies based on USD as an extremely rough placeholder
    if (baseCurrency === 'USD') {
        fallbackRates['EUR'] = 0.93; fallbackRates['JPY'] = 157; fallbackRates['CHF'] = 0.90;
    } else if (baseCurrency === 'EUR') {
        fallbackRates['USD'] = 1.08; fallbackRates['JPY'] = 169; fallbackRates['CHF'] = 0.97;
    } // Add more if needed for other base for placeholder
    console.warn(`Using placeholder exchange rates for ${baseCurrency}. THIS IS NOT REAL DATA.`);
    return fallbackRates;
  }

  const url = `${API_BASE_URL}/${API_KEY}/latest/${baseCurrency}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error (${response.status}): ${errorBody}`);
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }
    const data: ExchangeRateApiResponse = await response.json();

    if (data.result === 'error' || data.error) {
        console.error('ExchangeRate-API returned an error:', data.error?.type || 'Unknown API error');
        throw new Error(data.error?.type || 'Failed to fetch exchange rates due to API error');
    }
    
    const rates: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
    for (const currency of SUPPORTED_CURRENCIES) {
      if (data.conversion_rates[currency]) {
        rates[currency] = data.conversion_rates[currency];
      } else {
        console.warn(`Rate for ${currency} not found in API response for base ${baseCurrency}.`);
        // Fallback to 1 if a specific supported currency is missing, though unlikely for major ones.
        rates[currency] = 1; 
      }
    }
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function convertAmountToAllCurrencies(
  amount: number,
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number>> {
  const rates = await fetchExchangeRates(baseCurrency);
  if (!rates) {
    throw new Error('Could not fetch exchange rates for conversion.');
  }

  const convertedAmounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  for (const targetCurrency of SUPPORTED_CURRENCIES) {
    convertedAmounts[targetCurrency] = amount * (rates[targetCurrency] || 1); // rates[baseCurrency] should be 1
  }
  return convertedAmounts;
}
