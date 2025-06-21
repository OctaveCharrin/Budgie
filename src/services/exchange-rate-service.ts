
'use server';
import type { CurrencyCode, AppSettings } from '@/lib/types';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  "error-type"?: string; // The API returns error-type at the top level for some errors
}

interface CachedRates {
  timestamp: number;
  rates: Record<CurrencyCode, number>;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const exchangeRateCache = new Map<CurrencyCode, CachedRates>();

/**
 * Retrieves exchange rates from the cache if they are not stale.
 * @param baseCurrency - The base currency for the rates.
 * @returns The cached rates or null if not found or stale.
 */
function getCachedRates(baseCurrency: CurrencyCode): Record<CurrencyCode, number> | null {
  const cachedEntry = exchangeRateCache.get(baseCurrency);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    return cachedEntry.rates;
  }
  exchangeRateCache.delete(baseCurrency);
  return null;
}

/**
 * Stores fetched exchange rates in the cache.
 * @param baseCurrency - The base currency for the rates.
 * @param rates - The exchange rates to cache.
 */
function setCachedRates(baseCurrency: CurrencyCode, rates: Record<CurrencyCode, number>): void {
  exchangeRateCache.set(baseCurrency, {
    timestamp: Date.now(),
    rates,
  });
}

/**
 * Fetches exchange rates for a given base currency.
 * It uses a cache to avoid redundant API calls. If an API key is not provided,
 * it returns hardcoded fallback rates.
 * @param baseCurrency - The base currency to fetch rates for.
 * @param apiKeyFromSettings - The API key from application settings.
 * @returns A promise that resolves to a record of currency rates, or null on failure.
 * @throws Will throw an error if the API call fails or the API key is invalid.
 */
export async function fetchExchangeRates(
  baseCurrency: CurrencyCode,
  apiKeyFromSettings?: string
): Promise<Record<CurrencyCode, number>> {
  const cached = getCachedRates(baseCurrency);
  if (cached) {
    console.log(`Using cached exchange rates for ${baseCurrency}`);
    return cached;
  }

  if (!apiKeyFromSettings) {
    console.warn("ExchangeRate-API key is not configured. Using fallback rates.");
    const fallbackRates = {} as Record<CurrencyCode, number>;
    SUPPORTED_CURRENCIES.forEach(code => fallbackRates[code] = 1); 
    fallbackRates[baseCurrency] = 1; 

    if (baseCurrency === 'USD') {
        fallbackRates['EUR'] = 0.93; fallbackRates['JPY'] = 157; fallbackRates['CHF'] = 0.90;
    } else if (baseCurrency === 'EUR') {
        fallbackRates['USD'] = 1.08; fallbackRates['JPY'] = 169; fallbackRates['CHF'] = 0.97;
    }
    
    // Do not cache fallback rates as they are static
    return fallbackRates;
  }

  const url = `${API_BASE_URL}/${apiKeyFromSettings}/latest/${baseCurrency}`;
  console.log(`Fetching live exchange rates for ${baseCurrency}.`);

  try {
    const response = await fetch(url, { next: { revalidate: CACHE_TTL / 1000 } });
    const data: ExchangeRateApiResponse = await response.json();

    if (!response.ok || data.result === 'error') {
      const errorType = data["error-type"] || `HTTP error! status: ${response.status}`;
      console.error(`API Error fetching rates for ${baseCurrency}: ${errorType}`);
      const isApiKeyInvalid = ['invalid-key', 'inactive-account'].includes(errorType);
      const error = new Error(`Failed to fetch exchange rates: ${errorType}`);
      (error as any).isApiKeyInvalid = isApiKeyInvalid;
      throw error;
    }
    
    const rates: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
    for (const currency of SUPPORTED_CURRENCIES) {
      if (data.conversion_rates[currency]) {
        rates[currency] = data.conversion_rates[currency];
      } else {
        console.warn(`Rate for ${currency} not found in API response for base ${baseCurrency}. Defaulting to 1.`);
        rates[currency] = 1; 
      }
    }
    setCachedRates(baseCurrency, rates);
    return rates;
  } catch (error) {
    console.error('Error in fetchExchangeRates:', error);
    throw error; 
  }
}

/**
 * Converts an amount from a base currency to all supported currencies.
 * @param amount - The amount to convert.
 * @param baseCurrency - The currency of the original amount.
 * @param apiKeyFromSettings - The API key from application settings.
 * @returns A promise that resolves to a record of the converted amounts in all supported currencies.
 */
export async function convertAmountToAllCurrencies(
  amount: number,
  baseCurrency: CurrencyCode,
  apiKeyFromSettings?: string
): Promise<Record<CurrencyCode, number>> {
  try {
    const rates = await fetchExchangeRates(baseCurrency, apiKeyFromSettings);
    const convertedAmounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
    for (const targetCurrency of SUPPORTED_CURRENCIES) {
      convertedAmounts[targetCurrency] = amount * (rates[targetCurrency] || 1); 
    }
    return convertedAmounts;
  } catch (error) {
    console.error(`Failed to get rates for ${baseCurrency}, cannot convert amount ${amount}.`);
    // Re-throw the original error to be handled by the caller (e.g., DataContext)
    throw error;
  }
}
