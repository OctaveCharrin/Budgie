
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart"; 
import { useData } from "@/contexts/data-context";
import type { ReportPeriod, ChartDataPoint } from "@/lib/types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO, addYears } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportChartProps {
  period: ReportPeriod;
  date: Date; 
}

const chartConfig = {
  total: {
    label: "Total Expenses",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export function ReportChart({ period, date }: ReportChartProps) {
  const { expenses, subscriptions, getCategoryById, isLoading } = useData();

  const calculateReportData = (): ChartDataPoint[] => {
    if (isLoading) return [];

    let startDate: Date, endDate: Date;

    switch (period) {
      case 'weekly':
        startDate = startOfWeek(date, { weekStartsOn: 1 });
        endDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'monthly':
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
      case 'yearly':
        startDate = startOfYear(date);
        endDate = endOfYear(date);
        break;
    }

    const relevantExpenses = expenses.filter(expense => 
      isWithinInterval(parseISO(expense.date), { start: startDate, end: endDate })
    );

    const relevantSubscriptions = subscriptions.filter(sub => {
      const subStartDate = parseISO(sub.startDate);
      return subStartDate <= endDate;
    });
    
    const subscriptionExpensesForPeriod: { categoryId: string; amount: number }[] = [];

    if (period === 'monthly') {
        relevantSubscriptions.forEach(sub => {
            if (isWithinInterval(startOfMonth(date), {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) { 
                 subscriptionExpensesForPeriod.push({ categoryId: sub.categoryId, amount: sub.amount });
            }
        });
    } else if (period === 'yearly') {
        const monthsInYear = eachMonthOfInterval({ start: startDate, end: endDate });
        monthsInYear.forEach(monthStart => {
            relevantSubscriptions.forEach(sub => {
                if (isWithinInterval(monthStart, {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) {
                    subscriptionExpensesForPeriod.push({ categoryId: sub.categoryId, amount: sub.amount });
                }
            });
        });
    } else { 
        relevantSubscriptions.forEach(sub => {
             if (isWithinInterval(startOfMonth(date), {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) {
                 subscriptionExpensesForPeriod.push({ categoryId: sub.categoryId, amount: sub.amount / 4 });
            }
        });
    }

    const allPeriodExpenses = [...relevantExpenses, ...subscriptionExpensesForPeriod];
    const aggregatedData: { [categoryId: string]: number } = {};
    allPeriodExpenses.forEach(item => {
      aggregatedData[item.categoryId] = (aggregatedData[item.categoryId] || 0) + item.amount;
    });
    
    return Object.entries(aggregatedData).map(([categoryId, total]) => ({
      name: getCategoryById(categoryId)?.name || "Uncategorized",
      total,
    })).sort((a,b) => b.total - a.total);
  };

  const data = calculateReportData();

  const getTitle = () => {
    switch (period) {
      case 'weekly':
        return `Weekly Report: ${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(date, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
      case 'monthly':
        return `Monthly Report: ${format(date, "MMMM yyyy")}`;
      case 'yearly':
        return `Yearly Report: ${format(date, "yyyy")}`;
    }
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="text-xl font-headline">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No data available for this period.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-headline">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={60} 
                interval={0}
                tick={{ fontSize: 12 }} 
              />
              <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, chartConfig[name as keyof typeof chartConfig]?.label || name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
