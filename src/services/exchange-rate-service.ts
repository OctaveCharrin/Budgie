
'use server';
import type { CurrencyCode } from '@/lib/types';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  error?: { type: string; 'error-type'?: string };
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
  exchangeRateCache.delete(baseCurrency);
  return null;
}

function setCachedRates(baseCurrency: CurrencyCode, rates: Record<CurrencyCode, number>): void {
  exchangeRateCache.set(baseCurrency, {
    timestamp: Date.now(),
    rates,
  });
}

export async function fetchExchangeRates(
  baseCurrency: CurrencyCode,
  apiKeyFromSettings?: string
): Promise<Record<CurrencyCode, number> | null> {
  const cached = getCachedRates(baseCurrency);
  if (cached) {
    console.log(`Using cached exchange rates for ${baseCurrency}`);
    return cached;
  }

  const resolvedApiKey = apiKeyFromSettings; // Rely solely on the key from settings

  if (!resolvedApiKey || resolvedApiKey.trim() === '' || resolvedApiKey === 'YOUR_PLACEHOLDER_API_KEY') {
    console.warn("ExchangeRate-API key is not configured in settings or is a placeholder. Using fallback rates.");
    const fallbackRates = {} as Record<CurrencyCode, number>;
    SUPPORTED_CURRENCIES.forEach(code => fallbackRates[code] = 1); 
    fallbackRates[baseCurrency] = 1; 

    if (baseCurrency === 'USD') {
        fallbackRates['EUR'] = 0.93; fallbackRates['JPY'] = 157; fallbackRates['CHF'] = 0.90;
    } else if (baseCurrency === 'EUR') {
        fallbackRates['USD'] = 1.08; fallbackRates['JPY'] = 169; fallbackRates['CHF'] = 0.97;
    }
    
    setCachedRates(baseCurrency, fallbackRates);
    return fallbackRates;
  }

  const url = `${API_BASE_URL}/${resolvedApiKey}/latest/${baseCurrency}`;
  console.log(`Fetching live exchange rates for ${baseCurrency} using API key from settings.`);

  try {
    const response = await fetch(url, { next: { revalidate: CACHE_TTL / 1000 } });
    if (!response.ok) {
      const errorBody = await response.json() as ExchangeRateApiResponse; 
      const errorType = errorBody?.error?.['error-type'] || errorBody?.error?.type || `HTTP ${response.status}`;
      console.error(`API Error (${response.status}) fetching rates for ${baseCurrency}: ${errorType}`);
      throw new Error(`Failed to fetch exchange rates: ${errorType}`);
    }
    const data: ExchangeRateApiResponse = await response.json();

    if (data.result === 'error' || data.error) {
        const errorType = data.error?.['error-type'] || data.error?.type || 'Unknown API error';
        console.error(`ExchangeRate-API returned an error for ${baseCurrency}: ${errorType}`);
        throw new Error(`Failed to fetch exchange rates: ${errorType}`);
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

export async function convertAmountToAllCurrencies(
  amount: number,
  baseCurrency: CurrencyCode,
  apiKeyFromSettings?: string
): Promise<Record<CurrencyCode, number>> {
  const rates = await fetchExchangeRates(baseCurrency, apiKeyFromSettings);
  if (!rates) {
    console.error(`Failed to get rates for ${baseCurrency}, cannot convert amount ${amount}.`);
    const fallbackAmounts = {} as Record<CurrencyCode, number>;
    SUPPORTED_CURRENCIES.forEach(code => {
        fallbackAmounts[code] = (code === baseCurrency) ? amount : amount; 
    });
    console.warn(`Returning potentially inaccurate conversions for ${baseCurrency} due to rate fetch failure.`);
    return fallbackAmounts;
  }

  const convertedAmounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  for (const targetCurrency of SUPPORTED_CURRENCIES) {
    convertedAmounts[targetCurrency] = amount * (rates[targetCurrency] || 1); 
  }
  return convertedAmounts;
}
