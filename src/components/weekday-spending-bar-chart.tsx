
"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdaySpendingBarChart({ period, selectedDate }: WeekdaySpendingBarChartProps) {
  const { expenses, subscriptions, settings, isLoading: isDataContextLoading, getAmountInDefaultCurrency } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const chartData = useMemo(() => {
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

    const weekdayTotals: number[] = Array(7).fill(0);
    const weekdayCounts: number[] = Array(7).fill(0);

    const daysInSelectedPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });

    daysInSelectedPeriod.forEach(currentDay => {
      let dailySpending = 0;

      // Calculate expenses for the currentDay
      expenses.forEach(expense => {
        if (isSameDay(parseISO(expense.date), currentDay)) {
          dailySpending += getAmountInDefaultCurrency(expense);
        }
      });

      // Calculate prorated subscriptions for the currentDay
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

      const dayOfWeek = getDay(currentDay); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      const adjustedIndex = (dayOfWeek === 0) ? 6 : dayOfWeek - 1; // Map to Mon (0) - Sun (6)

      weekdayTotals[adjustedIndex] += dailySpending;
      weekdayCounts[adjustedIndex]++;
    });

    return WEEKDAY_LABELS.map((label, index) => ({
      name: label,
      averageSpending: weekdayCounts[index] > 0 ? weekdayTotals[index] / weekdayCounts[index] : 0,
    }));

  }, [period, selectedDate, expenses, subscriptions, defaultCurrency, isDataContextLoading, getAmountInDefaultCurrency]);

  if (isDataContextLoading || !defaultCurrency) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (chartData.every(d => d.averageSpending === 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No spending data available for this period to calculate weekday averages.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Day: ${label}`}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            {`Avg. Spending: ${formatCurrency(payload[0].value, defaultCurrency)}`}
          </p>
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
          <Bar dataKey="averageSpending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

