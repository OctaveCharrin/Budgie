
'use server';
import type { CurrencyCode } from '@/lib/types';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';
const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'YOUR_PLACEHOLDER_API_KEY';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  error?: { type: string };
}

interface CachedRates {
  timestamp: number;
  rates: Record<CurrencyCode, number>;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const exchangeRateCache = new Map<CurrencyCode, CachedRates>();

function getCachedRates(baseCurrency: CurrencyCode): Record<CurrencyCode, number> | null {
  const cachedEntry = exchangeRateCache.get(baseCurrency);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    return cachedEntry.rates;
  }
  exchangeRateCache.delete(baseCurrency); // Remove expired or non-existent entry
  return null;
}

function setCachedRates(baseCurrency: CurrencyCode, rates: Record<CurrencyCode, number>): void {
  exchangeRateCache.set(baseCurrency, {
    timestamp: Date.now(),
    rates,
  });
}

export async function fetchExchangeRates(
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number> | null> {
  const cached = getCachedRates(baseCurrency);
  if (cached) {
    console.log(`Using cached exchange rates for ${baseCurrency}`);
    return cached;
  }

  if (API_KEY === 'YOUR_PLACEHOLDER_API_KEY') {
    console.warn("ExchangeRate-API key is not configured. Please set EXCHANGE_RATE_API_KEY.");
    const fallbackRates = {} as Record<CurrencyCode, number>;
    SUPPORTED_CURRENCIES.forEach(code => fallbackRates[code] = 1);
    fallbackRates[baseCurrency] = 1;
    if (baseCurrency === 'USD') {
        fallbackRates['EUR'] = 0.93; fallbackRates['JPY'] = 157; fallbackRates['CHF'] = 0.90;
    } else if (baseCurrency === 'EUR') {
        fallbackRates['USD'] = 1.08; fallbackRates['JPY'] = 169; fallbackRates['CHF'] = 0.97;
    }
    console.warn(`Using placeholder exchange rates for ${baseCurrency}. THIS IS NOT REAL DATA.`);
    setCachedRates(baseCurrency, fallbackRates); // Cache placeholder rates too
    return fallbackRates;
  }

  const url = `${API_BASE_URL}/${API_KEY}/latest/${baseCurrency}`;
  console.log(`Fetching live exchange rates for ${baseCurrency} from API.`);

  try {
    const response = await fetch(url, { next: { revalidate: CACHE_TTL / 1000 } }); // Next.js fetch cache revalidation
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
        rates[currency] = 1; 
      }
    }
    setCachedRates(baseCurrency, rates);
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Don't cache on error, let it retry next time
    throw error; 
  }
}

export async function convertAmountToAllCurrencies(
  amount: number,
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number>> {
  const rates = await fetchExchangeRates(baseCurrency);
  if (!rates) {
    // This case should ideally be handled more gracefully, perhaps by returning original amount for base currency
    // and zero or error indicators for others, or by having a more robust fallback.
    // For now, throwing an error signifies a critical failure in obtaining rates.
    console.error(`Failed to get rates for ${baseCurrency}, cannot convert amount ${amount}.`);
    throw new Error(`Could not fetch exchange rates for conversion from ${baseCurrency}.`);
  }

  const convertedAmounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  for (const targetCurrency of SUPPORTED_CURRENCIES) {
    convertedAmounts[targetCurrency] = amount * (rates[targetCurrency] || 1); 
  }
  return convertedAmounts;
}
