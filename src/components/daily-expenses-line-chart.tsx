
"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
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


  const { chartData, totalAverageForPeriod } = useMemo(() => {
    if (isDataContextLoading || !defaultCurrency) return { chartData: [], totalAverageForPeriod: 0 };

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
    let rawDailyAmounts: number[] = [];

    let dailyTotals: ChartData[] = daysInPeriod.map(day => {
      let totalForDay = 0;

      expenses.forEach(expense => {
        if (isSameDay(parseISO(expense.date), day)) {
          totalForDay += getAmountInDefaultCurrency(expense);
        }
      });

      subscriptions.forEach(sub => {
        const subStartDate = parseISO(sub.startDate);
        const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;
        const isSubscriptionActiveToday =
          (isEqual(day, subStartDate) || isAfter(day, subStartDate)) &&
          (!subEndDate || isEqual(day, subEndDate) || isBefore(day, subEndDate));

        if (isSubscriptionActiveToday) {
          const monthlyAmount = getAmountInDefaultCurrency(sub);
          const daysInCurrentBillingMonth = getDaysInMonth(day);
          if (daysInCurrentBillingMonth > 0) {
            totalForDay += monthlyAmount / daysInCurrentBillingMonth;
          }
        }
      });

      rawDailyAmounts.push(totalForDay);

      let dateFormat = "MMM d";
      if (period === 'yearly' && daysInPeriod.length > 60) dateFormat = "MMM";
      else if (period === 'yearly' && daysInPeriod.length <= 60) dateFormat = "MMM d";
      else if (period === 'monthly') dateFormat = "d";

      return { date: format(day, dateFormat), amount: totalForDay };
    });

    let finalChartData = [...dailyTotals];

    if (accumulate) {
      let runningTotal = 0;
      finalChartData = dailyTotals.map(item => {
        runningTotal += item.amount;
        return { ...item, amount: runningTotal };
      });
    }

    const totalSpendingForPeriod = rawDailyAmounts.reduce((sum, amount) => sum + amount, 0);
    const avgForPeriod = daysInPeriod.length > 0 ? totalSpendingForPeriod / daysInPeriod.length : 0;

    return { chartData: finalChartData, totalAverageForPeriod: avgForPeriod };

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
      const mainPayload = payload.find(p => p.dataKey === 'amount');

      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Date: ${label}`}</p>
          {mainPayload && <p className="text-sm" style={{ color: mainPayload.stroke }}>{`${mainPayload.name}: ${formatCurrency(mainPayload.value, defaultCurrency)}`}</p>}
        </div>
      );
    }
    return null;
  };


  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}> {/* Adjusted left margin */}
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
            tickFormatter={(value) => `${formatCurrency(value, defaultCurrency, 'en-US').replace(defaultCurrency, '')}`}
            width={85} // Increased width for Y-axis labels
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
            animationDuration={500}
          />
          {!accumulate && totalAverageForPeriod > 0 && (
             <ReferenceLine
                y={totalAverageForPeriod}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                strokeWidth={1.5}
             >
                <RechartsPrimitive.Label
                    value={`Avg: ${formatCurrency(totalAverageForPeriod, defaultCurrency, 'en-US').replace(defaultCurrency, '')}`}
                    position="right"
                    fill="hsl(var(--destructive))"
                    fontSize={10}
                    dy={-5} // Adjust vertical position
                />
             </ReferenceLine>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// RechartsPrimitive.Label needs to be imported if not already globally available in Recharts
// For explicit import, if `Label` is directly from `recharts`
import * as RechartsPrimitive from 'recharts';
