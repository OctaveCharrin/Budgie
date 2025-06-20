
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart"; 
import { useData } from "@/contexts/data-context";
import type { ReportPeriod, ChartDataPoint, CurrencyCode, Category } from "@/lib/types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO, addYears } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";


interface ReportChartProps {
  period: ReportPeriod;
  date: Date; 
}

export function ReportChart({ period, date }: ReportChartProps) {
  const { expenses, subscriptions, getCategoryById, isLoading, settings, getAmountInDefaultCurrency, categories } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const chartConfig = {
    valueInDefaultCurrency: { // Renamed from 'total'
      label: `Total Expenses (${defaultCurrency})`,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;


  const calculateReportData = (): ChartDataPoint[] => {
    if (isLoading || !defaultCurrency) return [];

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
      // Consider active if start date is before or on period end, and end date (if exists) is after or on period start
      // For simplicity, assuming subscriptions are ongoing if started.
      return subStartDate <= endDate; 
    });
    
    // Calculate subscription contributions for the period
    let totalSubscriptionAmountForPeriod = 0;
    if (period === 'monthly') {
        relevantSubscriptions.forEach(sub => {
            if (isWithinInterval(startOfMonth(date), {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) {
                 totalSubscriptionAmountForPeriod += sub.amount; // Assumed to be in default currency
            }
        });
    } else if (period === 'yearly') {
        const monthsInYear = eachMonthOfInterval({ start: startDate, end: endDate });
        monthsInYear.forEach(monthStart => {
            relevantSubscriptions.forEach(sub => {
                 if (isWithinInterval(monthStart, {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) {
                    totalSubscriptionAmountForPeriod += sub.amount; // Assumed to be in default currency
                }
            });
        });
    } else { // weekly
        relevantSubscriptions.forEach(sub => {
             // Pro-rate monthly subscription for a week
             if (isWithinInterval(startOfMonth(date), {start: parseISO(sub.startDate), end: endOfMonth(addYears(parseISO(sub.startDate), 100))} ) ) {
                totalSubscriptionAmountForPeriod += sub.amount / 4.33; // Approx weeks in month
            }
        });
    }
    
    const aggregatedData: { [categoryId: string]: number } = {};

    relevantExpenses.forEach(item => {
      const amountInDefault = getAmountInDefaultCurrency(item);
      aggregatedData[item.categoryId] = (aggregatedData[item.categoryId] || 0) + amountInDefault;
    });

    // Add total subscription cost to a "Subscriptions" category or distribute if categorized
    // For simplicity, let's add it to a generic subscriptions category if one exists, or as "Uncategorized"
    const subscriptionsCategoryId = categories.find(c => c.name.toLowerCase() === 'subscriptions')?.id || 'subscriptions_placeholder';
    if (totalSubscriptionAmountForPeriod > 0) {
        aggregatedData[subscriptionsCategoryId] = (aggregatedData[subscriptionsCategoryId] || 0) + totalSubscriptionAmountForPeriod;
    }
    
    return Object.entries(aggregatedData).map(([categoryId, total]) => ({
      name: getCategoryById(categoryId)?.name || (categoryId === 'subscriptions_placeholder' ? 'Subscriptions' : "Uncategorized"),
      valueInDefaultCurrency: total, // Key matches chartConfig
    })).sort((a,b) => b.valueInDefaultCurrency - a.valueInDefaultCurrency);
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
  
  if (isLoading || !defaultCurrency) {
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
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={60} 
                interval={0}
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, defaultCurrency)} 
                tick={{ fontSize: 12 }} 
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number, name: string) => {
                    const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                    return [formatCurrency(value, defaultCurrency), label];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="valueInDefaultCurrency" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

