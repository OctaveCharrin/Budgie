
"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ErrorBar } from 'recharts';
import { useData } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface WeekdaySpendingBarChartProps {
  weekdayExpenseTotals: number[];      // Index 0=Mon, ..., 6=Sun
  weekdaySubscriptionTotals: number[]; // Index 0=Mon, ..., 6=Sun
  weekdayOccurrences: number[];        // Index 0=Mon, ..., 6=Sun
  dailySpendingByWeekdayForErrorBar: Record<number, number[]>; // Key 0-6, value array of daily totals
  isLoading: boolean;
}

interface ChartData {
  name: string; // Weekday name (Mon, Tue, etc.)
  averageSpending: number;
  errorValues?: [number, number]; // [deviation downwards from avg, deviation upwards from avg] - CAN BE UNDEFINED
  absoluteMinForTooltip: number;
  absoluteMaxForTooltip: number;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekdaySpendingBarChart({ 
  weekdayExpenseTotals, 
  weekdaySubscriptionTotals, 
  weekdayOccurrences,
  dailySpendingByWeekdayForErrorBar,
  isLoading 
}: WeekdaySpendingBarChartProps) {
  const { settings } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const chartData: ChartData[] = useMemo(() => {
    if (isLoading || !defaultCurrency) return [];

    return WEEKDAY_LABELS.map((label, index) => {
      const totalExpenses = weekdayExpenseTotals[index] || 0;
      const totalSubscriptions = weekdaySubscriptionTotals[index] || 0;
      const occurrences = weekdayOccurrences[index] || 0;
      
      const totalSpendingForWeekday = totalExpenses + totalSubscriptions;
      const averageSpending = occurrences > 0 ? totalSpendingForWeekday / occurrences : 0;

      const dailyTotalsForThisWeekday = dailySpendingByWeekdayForErrorBar[index] || [];
      let currentMin = 0;
      let currentMax = 0;
      let errorValuesData: [number, number] | undefined = undefined;

      if (dailyTotalsForThisWeekday.length > 0) {
        currentMin = Math.min(...dailyTotalsForThisWeekday);
        currentMax = Math.max(...dailyTotalsForThisWeekday);
      }
      
      // Only define errorValuesData if there's an actual range to display
      if (currentMin < currentMax) {
        let lowerDeviation = averageSpending - currentMin;
        let upperDeviation = currentMax - averageSpending;

        // Ensure deviations are not negative (can happen with floating point math or if avg is outside min/max)
        lowerDeviation = Math.max(0, lowerDeviation);
        upperDeviation = Math.max(0, upperDeviation);
        
        errorValuesData = [lowerDeviation, upperDeviation];
      }

      return {
        name: label,
        averageSpending: averageSpending,
        errorValues: errorValuesData, // Can be undefined
        absoluteMinForTooltip: currentMin,
        absoluteMaxForTooltip: currentMax,
      };
    });

  }, [
      weekdayExpenseTotals, 
      weekdaySubscriptionTotals, 
      weekdayOccurrences, 
      dailySpendingByWeekdayForErrorBar, 
      defaultCurrency, 
      isLoading
    ]);

  if (isLoading || !defaultCurrency) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  const noSpendingData = chartData.every(d => 
    d.averageSpending === 0 && 
    d.absoluteMinForTooltip === 0 && 
    d.absoluteMaxForTooltip === 0
  );

  if (noSpendingData) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No spending data available for this period to calculate weekday averages.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartData; 
      const avgSpending = dataPoint.averageSpending;
      
      const displayMin = dataPoint.absoluteMinForTooltip;
      const displayMax = dataPoint.absoluteMaxForTooltip;

      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Day: ${label}`}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            {`Avg: ${formatCurrency(avgSpending, defaultCurrency)}`}
          </p>
          { dailySpendingByWeekdayForErrorBar[WEEKDAY_LABELS.indexOf(label)]?.length > 0 &&
             displayMin !== displayMax && // Only show min/max if there's an actual range
            <>
              <p className="text-xs text-muted-foreground">
                {`Max Daily Total: ${formatCurrency(displayMax, defaultCurrency)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Min Daily Total: ${formatCurrency(displayMin, defaultCurrency)}`}
              </p>
            </>
          }
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
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} formatter={(value) => "Average Daily Spending"}/>
          <Bar dataKey="averageSpending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={500}>
            {/* Render ErrorBar component if there's a difference between min and max daily spending for at least one weekday in the chartData */}
            {/* Recharts will then use the 'errorValues' dataKey from each bar's data. If 'errorValues' is undefined for a bar, no error segment will be drawn for it. */}
            {chartData.some(d => d.errorValues && (d.errorValues[0] > 0 || d.errorValues[1] > 0)) && (
              <ErrorBar dataKey="errorValues" width={5} strokeWidth={1.5} stroke="hsl(var(--muted-foreground))" direction="y" />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

