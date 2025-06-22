
'use server';
import type { CurrencyCode, RatesFile } from '@/lib/types';
import { SUPPORTED_CURRENCIES, DATA_FILE_PATHS } from '@/lib/constants';
import { readData, writeData } from '@/lib/file-service';

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
  base_code: string;
  "error-type"?: string;
}

const DEFAULT_RATES_FILE: RatesFile = { lastFetched: null, rates: {} };

/**
 * Fetches latest rates for a single base currency from the API.
 * This function does not use any cache and is intended to be called by the main update process.
 * @param baseCurrency - The base currency to fetch rates for.
 * @param apiKey - The API key from application settings.
 * @returns A promise that resolves to a record of currency rates.
 * @throws Will throw an error if the API call fails or the API key is invalid.
 */
async function fetchRatesFromApi(baseCurrency: CurrencyCode, apiKey: string): Promise<Record<CurrencyCode, number>> {
  const url = `${API_BASE_URL}/${apiKey}/latest/${baseCurrency}`;
  const response = await fetch(url, { cache: 'no-store' }); // Disable Next.js fetch caching
  const data: ExchangeRateApiResponse = await response.json();

  if (!response.ok || data.result === 'error') {
    const errorType = data["error-type"] || `HTTP error! status: ${response.status}`;
    const error = new Error(`Failed to fetch exchange rates for ${baseCurrency}: ${errorType}`);
    throw error;
  }

  const rates: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  for (const currency of SUPPORTED_CURRENCIES) {
    rates[currency] = data.conversion_rates[currency] || 1;
  }
  return rates;
}

/**
 * Provides hardcoded fallback rates for a given currency.
 * Used when no API key is present or when live rates haven't been fetched yet.
 * @param baseCurrency - The base currency.
 * @returns A record of fallback rates.
 */
function getFallbackRates(baseCurrency: CurrencyCode): Record<CurrencyCode, number> {
  console.warn(`Using fallback exchange rates for base currency ${baseCurrency}.`);
  const fallbackRates = {} as Record<CurrencyCode, number>;
  SUPPORTED_CURRENCIES.forEach(code => fallbackRates[code] = 1);
  fallbackRates[baseCurrency] = 1;

  if (baseCurrency === 'USD') {
      fallbackRates['EUR'] = 0.93; fallbackRates['JPY'] = 157; fallbackRates['CHF'] = 0.90;
  } else if (baseCurrency === 'EUR') {
      fallbackRates['USD'] = 1.08; fallbackRates['JPY'] = 169; fallbackRates['CHF'] = 0.97;
  }
  
  return fallbackRates;
}

/**
 * Fetches the latest rates for all supported currencies and writes them to `rates.json`.
 * @param apiKey - The API key to use for fetching.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function updateAllExchangeRates(apiKey?: string): Promise<{ success: boolean; message?: string }> {
  if (!apiKey) {
    return { success: false, message: "API key is missing. Cannot fetch live rates." };
  }

  try {
    const allRates: RatesFile['rates'] = {};
    console.log("Starting batch fetch of all exchange rates...");
    for (const baseCurrency of SUPPORTED_CURRENCIES) {
      const rates = await fetchRatesFromApi(baseCurrency, apiKey);
      allRates[baseCurrency] = rates;
    }

    const newRatesFile: RatesFile = {
      lastFetched: new Date().toISOString(),
      rates: allRates,
    };

    await writeData(DATA_FILE_PATHS.rates, newRatesFile);
    console.log("Successfully updated and saved all exchange rates.");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update all exchange rates:", error);
    return { success: false, message: error.message || 'An unknown error occurred.' };
  }
}

/**
 * Converts an amount from a base currency to all other supported currencies using stored rates.
 * If stored rates are unavailable, it uses hardcoded fallback rates.
 * @param amount - The amount to convert.
 * @param baseCurrency - The currency of the original amount.
 * @returns A promise resolving to a record of converted amounts for all supported currencies.
 */
export async function convertAmountToAllCurrencies(
  amount: number,
  baseCurrency: CurrencyCode,
): Promise<Record<CurrencyCode, number>> {
  const ratesData = await readData<RatesFile>(DATA_FILE_PATHS.rates, DEFAULT_RATES_FILE);
  const ratesForBase = ratesData.rates[baseCurrency];

  const ratesToUse = ratesForBase && Object.keys(ratesForBase).length > 0 
    ? ratesForBase 
    : getFallbackRates(baseCurrency);

  if (!ratesForBase || Object.keys(ratesForBase).length === 0) {
    console.warn(`Live rates for base currency ${baseCurrency} not found in stored file. Using fallback rates.`);
  }

  const convertedAmounts: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
  for (const targetCurrency of SUPPORTED_CURRENCIES) {
    convertedAmounts[targetCurrency] = amount * (ratesToUse[targetCurrency] || 1);
  }
  return convertedAmounts;
}

/**
 * Retrieves the entire rates file from storage.
 * @returns A promise that resolves to the RatesFile object.
 */
export async function getRatesFile(): Promise<RatesFile> {
  return readData<RatesFile>(DATA_FILE_PATHS.rates, DEFAULT_RATES_FILE);
}
