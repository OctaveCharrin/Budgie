
"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useData } from '@/contexts/data-context';
import { formatCurrency } from '@/lib/utils';
import type { DailyTotalDataPoint, ReportPeriod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import * as RechartsPrimitive from 'recharts';


interface DailyExpensesLineChartProps {
  dailyTotals: DailyTotalDataPoint[];
  accumulate: boolean;
  isLoading: boolean;
  period: ReportPeriod; 
}

interface ChartData {
  date: string; // Formatted display date
  amount: number;
  budget?: number;
}


export function DailyExpensesLineChart({ dailyTotals, accumulate, isLoading, period }: DailyExpensesLineChartProps) {
  const { settings } = useData(); 
  const defaultCurrency = settings.defaultCurrency;
  const monthlyBudget = settings.monthlyBudget || 0;

  const { chartData, totalAverageForPeriod } = useMemo(() => {
    if (isLoading || !defaultCurrency || !dailyTotals) return { chartData: [], totalAverageForPeriod: 0 };

    const numberOfDaysInPeriod = dailyTotals.length;
    const dailyBudget = numberOfDaysInPeriod > 0 ? monthlyBudget / numberOfDaysInPeriod : 0;

    const processedTotals = dailyTotals.map((item, index) => {
        let budgetValue: number | undefined = undefined;
        if (monthlyBudget > 0 && dailyBudget > 0) {
            budgetValue = accumulate ? dailyBudget * (index + 1) : dailyBudget;
        }
        return {
            date: item.displayDate,
            amount: item.amount,
            budget: budgetValue,
        };
    });

    let finalChartData: ChartData[] = [...processedTotals];
    let rawDailyAmounts: number[] = processedTotals.map(item => item.amount);

    if (accumulate) {
      let runningTotal = 0;
      finalChartData = processedTotals.map(item => {
        runningTotal += item.amount;
        return { ...item, amount: runningTotal };
      });
    }

    const totalSpendingForPeriod = rawDailyAmounts.reduce((sum, amount) => sum + amount, 0);
    const avgForPeriod = dailyTotals.length > 0 ? totalSpendingForPeriod / dailyTotals.length : 0;
    
    return { chartData: finalChartData, totalAverageForPeriod: avgForPeriod };

  }, [dailyTotals, defaultCurrency, accumulate, isLoading, monthlyBudget]);

  if (isLoading || !defaultCurrency) {
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
      const budgetPayload = payload.find(p => p.dataKey === 'budget');

      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`Date: ${label}`}</p>
          {mainPayload && <p className="text-sm" style={{ color: mainPayload.stroke }}>{`${mainPayload.name}: ${formatCurrency(mainPayload.value, defaultCurrency)}`}</p>}
          {budgetPayload && <p className="text-sm" style={{ color: budgetPayload.stroke }}>{`${budgetPayload.name}: ${formatCurrency(budgetPayload.value, defaultCurrency)}`}</p>}
        </div>
      );
    }
    return null;
  };

  // Determine X-axis interval dynamically
  const getXAxisInterval = () => {
    if (chartData.length <= 7) return 0; // Show all labels for a week or less
    if (chartData.length <= 31) return Math.floor(chartData.length / 7); // Roughly weekly ticks for a month
    return Math.floor(chartData.length / 12); // Roughly monthly ticks for a year
  };

  const lineDotConfig = period === 'yearly' ? false : { r: 3, fill: 'hsl(var(--primary))' };


  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval={getXAxisInterval()}
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
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
          <Line
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={lineDotConfig}
            activeDot={{ r: 5 }}
            name={accumulate ? "Accumulated Spending" : "Daily Spending"}
            animationDuration={500}
          />
           {monthlyBudget > 0 && (
             <Line
                type="monotone"
                dataKey="budget"
                stroke="#22c55e" // green-500
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={accumulate ? "Accumulated Budget" : "Daily Budget Target"}
                animationDuration={500}
              />
           )}
          {!accumulate && totalAverageForPeriod > 0 && (
             <ReferenceLine
                y={totalAverageForPeriod}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
                strokeWidth={1.5}
             >
                <RechartsPrimitive.Label
                    value={`Avg: ${formatCurrency(totalAverageForPeriod, defaultCurrency, 'en-US').replace(defaultCurrency, '')}`}
                    position="left"
                    fill="hsl(var(--destructive))"
                    fontSize={10}
                    dy={0}
                    dx={-6}
                />
             </ReferenceLine>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

