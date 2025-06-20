
"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ErrorBar } from 'recharts';
import {
  format, parseISO, eachDayOfInterval, getDay,
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

interface WeekdaySpendingBarChartProps {
  period: ReportPeriod;
  selectedDate: Date;
}

interface ChartData {
  name: string; // Weekday name (Mon, Tue, etc.)
  averageSpending: number;
  minMaxRange: [number, number]; // [min, max] for ErrorBar
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdaySpendingBarChart({ period, selectedDate }: WeekdaySpendingBarChartProps) {
  const { expenses, subscriptions, settings, isLoading: isDataContextLoading, getAmountInDefaultCurrency } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const chartData: ChartData[] = useMemo(() => {
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

    const weekdayStats: Array<{
      total: number;
      count: number;
      max: number;
      min: number;
      hasSpending: boolean; // To track if any positive spending occurred
    }> = Array(7).fill(null).map(() => ({
      total: 0,
      count: 0,
      max: 0,
      min: Number.POSITIVE_INFINITY,
      hasSpending: false,
    }));

    const daysInSelectedPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });

    daysInSelectedPeriod.forEach(currentDay => {
      let dailySpending = 0;

      expenses.forEach(expense => {
        if (isSameDay(parseISO(expense.date), currentDay)) {
          dailySpending += getAmountInDefaultCurrency(expense);
        }
      });

      subscriptions.forEach(sub => {
        const subStartDate = parseISO(sub.startDate);
        const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;
        const isSubscriptionActiveToday =
          (isEqual(currentDay, subStartDate) || isAfter(currentDay, subStartDate)) &&
          (!subEndDate || isEqual(currentDay, subEndDate) || isBefore(currentDay, subEndDate));

        if (isSubscriptionActiveToday) {
          const monthlyAmount = getAmountInDefaultCurrency(sub);
          const daysInBillingMonth = getDaysInMonth(currentDay);
          if (daysInBillingMonth > 0) {
            dailySpending += monthlyAmount / daysInBillingMonth;
          }
        }
      });

      const dayOfWeek = getDay(currentDay);
      const adjustedIndex = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;

      weekdayStats[adjustedIndex].total += dailySpending;
      weekdayStats[adjustedIndex].count++;

      if (dailySpending > 0) {
        weekdayStats[adjustedIndex].hasSpending = true;
        weekdayStats[adjustedIndex].max = Math.max(weekdayStats[adjustedIndex].max, dailySpending);
        weekdayStats[adjustedIndex].min = Math.min(weekdayStats[adjustedIndex].min, dailySpending);
      } else {
        // If dailySpending is 0, still consider it for min if other days had spending,
        // or if this is the first day and hasSpending is not yet true.
         if (weekdayStats[adjustedIndex].hasSpending) {
             weekdayStats[adjustedIndex].min = Math.min(weekdayStats[adjustedIndex].min, 0);
         }
         // If max is still 0 (initial value), it remains 0 for a 0 spending day.
      }
    });
    
    return WEEKDAY_LABELS.map((label, index) => {
      const stats = weekdayStats[index];
      const averageSpending = stats.count > 0 ? stats.total / stats.count : 0;

      let minForRange: number;
      let maxForRange: number;

      if (stats.count === 0) { // No occurrences of this weekday in the period
        minForRange = 0;
        maxForRange = 0;
      } else if (!stats.hasSpending) { // Weekday occurred, but all instances had 0 spending
        minForRange = 0;
        maxForRange = 0;
      } else { // Weekday occurred and had some positive spending
        minForRange = stats.min;
        maxForRange = stats.max;
      }
      
      // Ensure the error bar range makes sense relative to the average
      // For example, if average is 50, min is 60 (due to some calculation quirk), fix it.
      // Min should be <= average, Max should be >= average.
      // Also, min should be <= max.
      const finalMin = Math.min(minForRange, averageSpending);
      const finalMax = Math.max(maxForRange, averageSpending);

      return {
        name: label,
        averageSpending: averageSpending,
        minMaxRange: [finalMin, finalMax].sort((a,b) => a-b) as [number, number],
      };
    });

  }, [period, selectedDate, expenses, subscriptions, defaultCurrency, isDataContextLoading, getAmountInDefaultCurrency]);

  if (isDataContextLoading || !defaultCurrency) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const noSpendingData = chartData.every(d => d.averageSpending === 0 && d.minMaxRange[0] === 0 && d.minMaxRange[1] === 0);
  if (noSpendingData) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No spending data available for this period to calculate weekday averages.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const avgSpending = dataPoint.averageSpending;
      const minMax = dataPoint.minMaxRange;

      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Day: ${label}`}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            {`Avg: ${formatCurrency(avgSpending, defaultCurrency)}`}
          </p>
          {minMax && (
            <>
              <p className="text-xs text-muted-foreground">
                {`Min: ${formatCurrency(minMax[0], defaultCurrency)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Max: ${formatCurrency(minMax[1], defaultCurrency)}`}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${formatCurrency(value, defaultCurrency, 'en-US').replace(defaultCurrency, '')}`}
            width={85}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} formatter={(value) => "Average Spending"}/>
          <Bar dataKey="averageSpending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={500}>
            <ErrorBar dataKey="minMaxRange" width={5} strokeWidth={1.5} stroke="hsl(var(--muted-foreground))" direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
