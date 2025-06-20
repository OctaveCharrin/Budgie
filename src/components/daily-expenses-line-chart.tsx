
"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  format, parseISO, eachDayOfInterval,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  isSameDay, getDaysInMonth,
  isAfter, isEqual, isBefore
} from 'date-fns';
import { useData } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import type { ReportPeriod, Expense, Subscription } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyExpensesLineChartProps {
  period: ReportPeriod;
  selectedDate: Date;
  accumulate: boolean;
}

interface ChartData {
  date: string; // Formatted date for display
  amount: number;
}

export function DailyExpensesLineChart({ period, selectedDate, accumulate }: DailyExpensesLineChartProps) {
  const { expenses, subscriptions, settings, isLoading: isDataContextLoading, getAmountInDefaultCurrency } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const chartData = useMemo((): ChartData[] => {
    if (isDataContextLoading || !defaultCurrency) return [];

    let periodStart: Date, periodEnd: Date;

    switch (period) {
      case 'weekly':
        periodStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        periodEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        periodStart = startOfMonth(selectedDate);
        periodEnd = endOfMonth(selectedDate);
        break;
      case 'yearly':
      default:
        periodStart = startOfYear(selectedDate);
        periodEnd = endOfYear(selectedDate);
        break;
    }

    const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });
    let dailyTotals: ChartData[] = daysInPeriod.map(day => {
      let totalForDay = 0;

      // Calculate expenses for the day
      expenses.forEach(expense => {
        if (isSameDay(parseISO(expense.date), day)) {
          totalForDay += getAmountInDefaultCurrency(expense);
        }
      });

      // Calculate subscription contributions for the day
      subscriptions.forEach(sub => {
        const subStartDate = parseISO(sub.startDate);
        const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;

        const isSubscriptionActiveToday = 
          (isEqual(day, subStartDate) || isAfter(day, subStartDate)) &&
          (!subEndDate || isEqual(day, subEndDate) || isBefore(day, subEndDate));

        if (isSubscriptionActiveToday) {
          const monthlyAmount = getAmountInDefaultCurrency(sub);
          // Prorate subscription for the day. The billing month for 'day' is the month 'day' is in.
          const daysInCurrentBillingMonth = getDaysInMonth(day);
          if (daysInCurrentBillingMonth > 0) {
            totalForDay += monthlyAmount / daysInCurrentBillingMonth;
          }
        }
      });
      
      let dateFormat = "MMM d";
      if (period === 'yearly' && daysInPeriod.length > 60) dateFormat = "MMM"; // Show only month for yearly if many days
      else if (period === 'yearly' && daysInPeriod.length <= 60) dateFormat = "MMM d";
      else if (period === 'monthly') dateFormat = "d"; // Show day number for monthly

      return { date: format(day, dateFormat), amount: totalForDay };
    });

    if (accumulate) {
      let runningTotal = 0;
      dailyTotals = dailyTotals.map(item => {
        runningTotal += item.amount;
        return { ...item, amount: runningTotal };
      });
    }
    
    return dailyTotals;

  }, [period, selectedDate, expenses, subscriptions, defaultCurrency, accumulate, isDataContextLoading, getAmountInDefaultCurrency]);

  if (isDataContextLoading || !defaultCurrency) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  if (chartData.length === 0) {
    return (
        <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No spending data to display for this period.</p>
        </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Date: ${label}`}</p>
          <p className="text-sm">{`Amount: ${formatCurrency(payload[0].value, defaultCurrency)}`}</p>
        </div>
      );
    }
    return null;
  };


  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval={period === 'yearly' && chartData.length > 12 ? Math.floor(chartData.length / 12) : 'preserveStartEnd'}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${formatCurrency(value, defaultCurrency, 'en-US').replace(defaultCurrency, '')}`} // Remove currency symbol for cleaner axis
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2} 
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
            name={accumulate ? "Accumulated Spending" : "Daily Spending"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
