'use server';

import {
  parseISO, format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  eachDayOfInterval, getDay, getDaysInMonth,
  isWithinInterval, isAfter, isEqual, isBefore
} from 'date-fns';
import type { Expense, Subscription, Category, CurrencyCode, ReportPeriod, DailyTotalDataPoint, CategoryBreakdownPoint, OverallPeriodMetrics } from '@/lib/types';
import { getSubscriptionsAction, getCategoriesAction } from './data-actions';
import { SUPPORTED_CURRENCIES } from '@/lib/constants';
import { openDb } from '@/lib/db'; // Import openDb

// Helper to get the correct amount column name for SQL queries
const getAmountColumnForDb = (currency: CurrencyCode): string => {
  const lowerCurrency = currency.toLowerCase();
  if (!SUPPORTED_CURRENCIES.map(c => c.toLowerCase()).includes(lowerCurrency)) {
    console.warn(`Requested currency ${currency} for SQL query is not directly supported as a pre-converted column. Falling back to originalAmount and originalCurrency which might not be ideal for aggregated reports.`);
    // This fallback is problematic for direct SQL SUMs if original currencies differ.
    // The design relies on pre-converted columns for efficient SQL aggregation.
    // For now, this will likely cause issues if an unsupported defaultCurrency is somehow passed.
    // A robust solution would be to ensure defaultCurrency is always one for which a column exists,
    // or perform conversion post-SQL if summing originalAmount.
    // Given the current structure, we must use a pre-converted column.
    throw new Error(`Invalid default currency for SQL query: ${currency}. No pre-converted amount column exists.`);
  }
  return `amount_${lowerCurrency}`;
};


// Helper to get amount in default currency, duplicated here for server-side use
// without relying on client-side context.
// This is primarily for subscriptions as expenses are now summed via SQL using the correct column.
const getAmountInDefaultCurrencyForSubscription = (subscription: Subscription, defaultCurrency: CurrencyCode): number => {
    if (!subscription.amounts || typeof subscription.amounts[defaultCurrency] !== 'number') {
        if (subscription.originalCurrency === defaultCurrency) return subscription.originalAmount;
        console.warn(`Currency conversion for ${defaultCurrency} not found on subscription ID ${subscription.id}. Falling back to original amount if currency matches, else 0.`);
        return 0;
    }
    const val = subscription.amounts[defaultCurrency];
    if (isNaN(val) || typeof val !== 'number') {
      console.warn(`NaN or invalid number detected for subscription ${subscription.id} in ${defaultCurrency}. Using 0.`);
      return 0;
    }
    return val;
};


export async function getOverallPeriodMetrics(
  period: ReportPeriod,
  selectedDateString: string, // Expecting ISO string from client
  defaultCurrency: CurrencyCode
): Promise<OverallPeriodMetrics> {
  const selectedDate = parseISO(selectedDateString);
  const db = await openDb();
  const amountColumnName = getAmountColumnForDb(defaultCurrency);

  let reportPeriodStart: Date, reportPeriodEnd: Date;
  switch (period) {
    case 'weekly':
      reportPeriodStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      reportPeriodEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      break;
    case 'monthly':
      reportPeriodStart = startOfMonth(selectedDate);
      reportPeriodEnd = endOfMonth(selectedDate);
      break;
    case 'yearly':
    default:
      reportPeriodStart = startOfYear(selectedDate);
      reportPeriodEnd = endOfYear(selectedDate);
      break;
  }
  
  const reportPeriodStartIso = reportPeriodStart.toISOString();
  const reportPeriodEndIso = reportPeriodEnd.toISOString();

  // --- Fetch pre-aggregated expense data using SQL ---
  const dailyExpenseTotalsFromDb: { expense_day: string; daily_total: number }[] = await db.all(
    `SELECT date(date) AS expense_day, SUM(${amountColumnName}) as daily_total
     FROM expenses
     WHERE date >= ? AND date <= ?
     GROUP BY expense_day`,
    reportPeriodStartIso, reportPeriodEndIso
  );

  const categoryExpenseTotalsFromDb: { categoryId: string; category_total: number }[] = await db.all(
    `SELECT categoryId, SUM(${amountColumnName}) as category_total
     FROM expenses
     WHERE date >= ? AND date <= ?
     GROUP BY categoryId`,
    reportPeriodStartIso, reportPeriodEndIso
  );
  
  const weekdayExpenseTotalsAggregated: { day_of_week: number; weekday_total: number }[] = await db.all(
    `SELECT day_of_week, SUM(${amountColumnName}) as weekday_total
     FROM expenses
     WHERE date >= ? AND date <= ?
     GROUP BY day_of_week`,
    reportPeriodStartIso, reportPeriodEndIso
  );
  const finalWeekdayExpenseTotals = Array(7).fill(0);
  weekdayExpenseTotalsAggregated.forEach(row => {
    if (row.day_of_week >= 0 && row.day_of_week <=6) {
       finalWeekdayExpenseTotals[row.day_of_week] = row.weekday_total || 0;
    }
  });


  // --- Fetch other necessary data ---
  const [allSubscriptionsRaw, allCategories] = await Promise.all([
    getSubscriptionsAction(), // Fetches all, then filtered in JS for complex pro-rata
    getCategoriesAction()
  ]);

  const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat.name]));
  const subscriptionsCategoryInfo = allCategories.find(c => c.id === 'subscriptions' || c.name.toLowerCase() === 'subscriptions');

  // --- Initialize maps and arrays for combined data ---
  const dailyTotalsMap = new Map<string, DailyTotalDataPoint>();
  const daysInPeriod = eachDayOfInterval({ start: reportPeriodStart, end: reportPeriodEnd });

  daysInPeriod.forEach(day => {
    const rawDateStr = format(day, 'yyyy-MM-dd');
    let dateFormat = "MMM d";
    if (period === 'yearly' && daysInPeriod.length > 31*3) dateFormat = "MMM"; // Yearly, more than 3 months, show month only
    else if (period === 'yearly') dateFormat = "MMM d"; // Yearly, less than 3 months, show month and day
    else if (period === 'monthly') dateFormat = "d"; // Monthly, show day only
    // Weekly will use MMM d by default from the first condition

    dailyTotalsMap.set(rawDateStr, {
      rawDate: rawDateStr,
      displayDate: format(day, dateFormat),
      amount: 0
    });
  });

  // Add SQL-aggregated daily expenses to dailyTotalsMap
  dailyExpenseTotalsFromDb.forEach(row => {
    if (dailyTotalsMap.has(row.expense_day)) {
      dailyTotalsMap.get(row.expense_day)!.amount += (row.daily_total || 0);
    }
  });
  
  // Initialize categoryTotals with SQL-aggregated expenses
  const categoryTotals: Record<string, number> = {};
  categoryExpenseTotalsFromDb.forEach(row => {
    const categoryId = row.categoryId || 'uncategorized';
    categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + (row.category_total || 0);
  });

  // --- Process Subscriptions (JavaScript logic for pro-rating) ---
  const weekdaySubscriptionTotals = Array(7).fill(0); // 0=Mon, ..., 6=Sun

  allSubscriptionsRaw.forEach(sub => {
    const monthlyAmountInDefault = getAmountInDefaultCurrencyForSubscription(sub, defaultCurrency);
    if (isNaN(monthlyAmountInDefault)) {
        console.warn(`Subscription ${sub.id} amount is NaN in default currency ${defaultCurrency}. Skipping.`);
        return;
    }

    const subStartDate = parseISO(sub.startDate);
    const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;

    daysInPeriod.forEach(dayInPeriod => {
      // Check if subscription is active on this specific dayInPeriod
      // And if this dayInPeriod is within the overall report period
      const isSubscriptionActiveToday =
        isWithinInterval(dayInPeriod, { start: subStartDate, end: subEndDate || reportPeriodEnd }) && // Active based on sub's own dates
        isWithinInterval(dayInPeriod, { start: reportPeriodStart, end: reportPeriodEnd }); // And within the report's window

      if (isSubscriptionActiveToday) {
        const daysInBillingMonth = getDaysInMonth(dayInPeriod); // Calendar month of this specific day
        const dailyContribution = daysInBillingMonth > 0 ? monthlyAmountInDefault / daysInBillingMonth : 0;

        if (dailyContribution > 0 && !isNaN(dailyContribution)) {
          const rawDateStr = format(dayInPeriod, 'yyyy-MM-dd');
          if (dailyTotalsMap.has(rawDateStr)) {
            dailyTotalsMap.get(rawDateStr)!.amount += dailyContribution;
          }

          const subCategoryToUse = sub.categoryId && categoriesMap.has(sub.categoryId)
            ? sub.categoryId
            : (subscriptionsCategoryInfo ? subscriptionsCategoryInfo.id : 'uncategorized_subscriptions');
          categoryTotals[subCategoryToUse] = (categoryTotals[subCategoryToUse] || 0) + dailyContribution;
          
          const dayOfWeekFns = getDay(dayInPeriod); // 0=Sun, 1=Mon ...
          const adjustedDayIndex = dayOfWeekFns === 0 ? 6 : dayOfWeekFns - 1; // 0=Mon, ..., 6=Sun
          weekdaySubscriptionTotals[adjustedDayIndex] += dailyContribution;
        }
      }
    });
  });
  
  const dailyTotalsArray = Array.from(dailyTotalsMap.values())
    .sort((a,b) => parseISO(a.rawDate).getTime() - parseISO(b.rawDate).getTime());
  
  let totalOverallSpending = 0;
  dailyTotalsArray.forEach(day => {
    totalOverallSpending += day.amount;
  });

  const categoryBreakdownArray: CategoryBreakdownPoint[] = Object.entries(categoryTotals)
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoriesMap.get(categoryId) || (categoryId === 'uncategorized_subscriptions' && subscriptionsCategoryInfo ? subscriptionsCategoryInfo.name : 'Uncategorized'),
      totalAmount: total,
    }))
    .filter(item => item.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // --- Weekday Occurrences and Daily Spending by Weekday (for ErrorBar) ---
  const weekdayOccurrences: number[] = Array(7).fill(0);
  const dailySpendingByWeekdayForErrorBar: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  daysInPeriod.forEach(day => { // Iterate through actual days in the report period
    const dayOfWeekFns = getDay(day); // 0=Sun, 1=Mon ...
    const adjustedDayIndex = dayOfWeekFns === 0 ? 6 : dayOfWeekFns - 1; // 0=Mon, ..., 6=Sun
    weekdayOccurrences[adjustedDayIndex]++;

    const rawDateStr = format(day, 'yyyy-MM-dd');
    const dailyTotalEntry = dailyTotalsMap.get(rawDateStr);
    // Ensure amount is not NaN and include 0, and that an entry exists for the day
    if (dailyTotalEntry && typeof dailyTotalEntry.amount === 'number' && !isNaN(dailyTotalEntry.amount)) {
      dailySpendingByWeekdayForErrorBar[adjustedDayIndex].push(dailyTotalEntry.amount);
    } else if (dailyTotalEntry && (typeof dailyTotalEntry.amount !== 'number' || isNaN(dailyTotalEntry.amount))) {
      console.warn(`NaN amount found for rawDate ${rawDateStr} in dailyTotalsMap when building dailySpendingByWeekdayForErrorBar.`);
      dailySpendingByWeekdayForErrorBar[adjustedDayIndex].push(0); // Push 0 if NaN
    } else {
       // If a day in the period somehow doesn't have a dailyTotalEntry (should not happen with current init)
       dailySpendingByWeekdayForErrorBar[adjustedDayIndex].push(0);
    }
  });
  
  return {
    totalOverallSpending,
    dailyTotalsArray,
    categoryBreakdownArray,
    weekdayExpenseTotals: finalWeekdayExpenseTotals, // From SQL
    weekdaySubscriptionTotals, // From JS processing
    weekdayOccurrences,
    dailySpendingByWeekdayForErrorBar,
  };
}
