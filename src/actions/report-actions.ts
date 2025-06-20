
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
import { getExpensesAction, getSubscriptionsAction, getCategoriesAction } from './data-actions';
import { SUPPORTED_CURRENCIES } from '@/lib/constants'; // Ensure this provides the array

// Helper to get amount in default currency, duplicated here for server-side use
// without relying on client-side context.
const getAmountInDefaultCurrencyForExpense = (expense: Expense, defaultCurrency: CurrencyCode): number => {
    if (!expense.amounts || typeof expense.amounts[defaultCurrency] !== 'number') {
        // Fallback or log warning if conversion is missing
        if (expense.originalCurrency === defaultCurrency) return expense.originalAmount;
        console.warn(`Currency conversion for ${defaultCurrency} not found on expense ID ${expense.id}. Falling back to original amount if currency matches, else 0.`);
        return 0;
    }
    const val = expense.amounts[defaultCurrency];
    if (isNaN(val) || typeof val !== 'number') {
      console.warn(`NaN or invalid number detected for expense ${expense.id} in ${defaultCurrency}. Using 0.`);
      return 0;
    }
    return val;
};

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

  const [allExpenses, allSubscriptions, allCategories] = await Promise.all([
    getExpensesAction(),
    getSubscriptionsAction(),
    getCategoriesAction()
  ]);

  const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat.name]));
  const subscriptionsCategoryInfo = allCategories.find(c => c.id === 'subscriptions' || c.name.toLowerCase() === 'subscriptions');


  // --- Overall Total Spending and Daily Totals (for Line Chart) ---
  let totalOverallSpending = 0;
  const dailyTotalsMap = new Map<string, { rawDate: string; displayDate: string; amount: number }>();
  const daysInPeriod = eachDayOfInterval({ start: reportPeriodStart, end: reportPeriodEnd });

  daysInPeriod.forEach(day => {
    const rawDateStr = format(day, 'yyyy-MM-dd');
    let dateFormat = "MMM d";
    if (period === 'yearly' && daysInPeriod.length > 60) dateFormat = "MMM";
    else if (period === 'yearly' && daysInPeriod.length <= 60) dateFormat = "MMM d";
    else if (period === 'monthly') dateFormat = "d";

    dailyTotalsMap.set(rawDateStr, {
      rawDate: rawDateStr,
      displayDate: format(day, dateFormat),
      amount: 0
    });
  });

  // Process Expenses for Daily Totals and Category Breakdown
  const categoryTotals: Record<string, number> = {};
  const weekdayExpenseTotals: number[] = Array(7).fill(0); // 0=Mon, ..., 6=Sun

  allExpenses.forEach(expense => {
    const expenseDate = parseISO(expense.date);
    if (isWithinInterval(expenseDate, { start: reportPeriodStart, end: reportPeriodEnd })) {
      const amountInDefault = getAmountInDefaultCurrencyForExpense(expense, defaultCurrency);
      totalOverallSpending += amountInDefault;

      const rawDateStr = format(expenseDate, 'yyyy-MM-dd');
      if (dailyTotalsMap.has(rawDateStr)) {
        dailyTotalsMap.get(rawDateStr)!.amount += amountInDefault;
      }

      const categoryId = expense.categoryId || 'uncategorized';
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + amountInDefault;

      // For weekday expense breakdown (using stored dayOfWeek: 0=Mon, ..., 6=Sun)
      if (expense.dayOfWeek >= 0 && expense.dayOfWeek <= 6) {
        weekdayExpenseTotals[expense.dayOfWeek] += amountInDefault;
      }
    }
  });

  // Process Subscriptions for Daily Totals, Category Breakdown, and Weekday Subscription Totals
  const weekdaySubscriptionTotals: number[] = Array(7).fill(0); // 0=Mon, ..., 6=Sun

  allSubscriptions.forEach(sub => {
    const monthlyAmountInDefault = getAmountInDefaultCurrencyForSubscription(sub, defaultCurrency);
    const subStartDate = parseISO(sub.startDate);
    const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;

    daysInPeriod.forEach(dayInPeriod => {
      // Check if subscription is active on this specific dayInPeriod
      const isSubscriptionActiveToday =
        (isEqual(dayInPeriod, subStartDate) || isAfter(dayInPeriod, subStartDate)) &&
        (!subEndDate || isEqual(dayInPeriod, subEndDate) || isBefore(dayInPeriod, subEndDate));

      if (isSubscriptionActiveToday) {
        const daysInBillingMonth = getDaysInMonth(dayInPeriod); // Calendar month of this specific day
        const dailyContribution = daysInBillingMonth > 0 ? monthlyAmountInDefault / daysInBillingMonth : 0;

        if (dailyContribution > 0) {
          totalOverallSpending += dailyContribution;
          const rawDateStr = format(dayInPeriod, 'yyyy-MM-dd');
          if (dailyTotalsMap.has(rawDateStr)) {
            dailyTotalsMap.get(rawDateStr)!.amount += dailyContribution;
          }

          const subCategoryToUse = sub.categoryId && categoriesMap.has(sub.categoryId)
            ? sub.categoryId
            : (subscriptionsCategoryInfo ? subscriptionsCategoryInfo.id : 'uncategorized_subscriptions');
          categoryTotals[subCategoryToUse] = (categoryTotals[subCategoryToUse] || 0) + dailyContribution;
          
          // For weekday subscription breakdown
          const dayOfWeekFns = getDay(dayInPeriod); // 0=Sun, 1=Mon ...
          const adjustedDayIndex = dayOfWeekFns === 0 ? 6 : dayOfWeekFns - 1; // 0=Mon, ..., 6=Sun
          weekdaySubscriptionTotals[adjustedDayIndex] += dailyContribution;
        }
      }
    });
  });

  const dailyTotalsArray = Array.from(dailyTotalsMap.values()).sort((a,b) => parseISO(a.rawDate).getTime() - parseISO(b.rawDate).getTime());

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

  daysInPeriod.forEach(day => {
    const dayOfWeekFns = getDay(day); // 0=Sun, 1=Mon ...
    const adjustedDayIndex = dayOfWeekFns === 0 ? 6 : dayOfWeekFns - 1; // 0=Mon, ..., 6=Sun
    weekdayOccurrences[adjustedDayIndex]++;

    const rawDateStr = format(day, 'yyyy-MM-dd');
    const dailyTotalEntry = dailyTotalsMap.get(rawDateStr);
    if (dailyTotalEntry && dailyTotalEntry.amount >= 0) { // Ensure amount is not NaN and include 0
      dailySpendingByWeekdayForErrorBar[adjustedDayIndex].push(dailyTotalEntry.amount);
    }
  });
  
  return {
    totalOverallSpending,
    dailyTotalsArray,
    categoryBreakdownArray,
    weekdayExpenseTotals,
    weekdaySubscriptionTotals,
    weekdayOccurrences,
    dailySpendingByWeekdayForErrorBar,
  };
}
