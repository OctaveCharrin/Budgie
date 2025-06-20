
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart"; 
import { useData } from "@/contexts/data-context";
import type { ReportPeriod, ChartDataPoint, CurrencyCode, Category } from "@/lib/types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, addYears, differenceInMonths, getDaysInMonth } from "date-fns";
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
    valueInDefaultCurrency: { 
      label: `Total Spending (${defaultCurrency})`,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;


  const calculateReportData = (): ChartDataPoint[] => {
    if (isLoading || !defaultCurrency || !categories) return [];

    let periodStart: Date, periodEnd: Date;

    switch (period) {
      case 'weekly':
        periodStart = startOfWeek(date, { weekStartsOn: 1 });
        periodEnd = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'monthly':
        periodStart = startOfMonth(date);
        periodEnd = endOfMonth(date);
        break;
      case 'yearly':
        periodStart = startOfYear(date);
        periodEnd = endOfYear(date);
        break;
    }

    const aggregatedData: { [categoryId: string]: number } = {};

    // Aggregate expenses
    expenses.forEach(expense => {
      if (isWithinInterval(parseISO(expense.date), { start: periodStart, end: periodEnd })) {
        const amountInDefault = getAmountInDefaultCurrency(expense);
        aggregatedData[expense.categoryId] = (aggregatedData[expense.categoryId] || 0) + amountInDefault;
      }
    });
    
    // Aggregate subscriptions
    const subscriptionsCategoryId = categories.find(c => c.name.toLowerCase() === 'subscriptions')?.id || 'subscriptions_placeholder_id';
    
    subscriptions.forEach(sub => {
      const subStartDate = parseISO(sub.startDate);
      let subContribution = 0;
      const amountInDefault = getAmountInDefaultCurrency(sub);

      if (subStartDate > periodEnd) return; // Subscription hasn't started yet

      if (period === 'monthly') {
        // If subscription is active for any part of the month
        if (subStartDate <= periodEnd && isWithinInterval(periodStart, {start: subStartDate, end: addYears(subStartDate, 100)})) {
            subContribution = amountInDefault;
        }
      } else if (period === 'yearly') {
        // Calculate how many full or partial months the subscription is active within the year
        const yearMonths = eachMonthOfInterval({ start: periodStart, end: periodEnd });
        yearMonths.forEach(monthInYearStart => {
          const monthInYearEnd = endOfMonth(monthInYearStart);
          if (subStartDate <= monthInYearEnd && isWithinInterval(monthInYearStart, {start: subStartDate, end: addYears(subStartDate, 100)})) {
             subContribution += amountInDefault;
          }
        });
      } else { // weekly
        // Pro-rate monthly subscription for a week
        // This is an approximation. A daily rate would be more accurate.
        // Assuming sub amount is monthly. If subscription starts mid-week or ends mid-week, this gets complex.
        // For simplicity: if active in the month of this week, add weekly portion.
        const monthOfPeriodStart = startOfMonth(periodStart);
        const monthOfPeriodEnd = endOfMonth(periodStart); // week is within one month
         if (subStartDate <= periodEnd && isWithinInterval(monthOfPeriodStart, {start: subStartDate, end: addYears(subStartDate, 100)}) ) {
            const daysInMonth = getDaysInMonth(monthOfPeriodStart);
            const weeklyRate = (amountInDefault / daysInMonth) * 7; // approximate weekly rate
            
            // More precise: count overlapping days
            const weekDays = eachDayOfInterval({start: periodStart, end: periodEnd});
            let activeDaysInWeek = 0;
            weekDays.forEach(day => {
                if(day >= subStartDate) activeDaysInWeek++;
            })
            subContribution = (amountInDefault / daysInMonth) * activeDaysInWeek;
        }
      }
      
      if (subContribution > 0) {
         const categoryIdToUse = sub.categoryId || subscriptionsCategoryId; // Use sub's category or default
         aggregatedData[categoryIdToUse] = (aggregatedData[categoryIdToUse] || 0) + subContribution;
      }
    });
    
    return Object.entries(aggregatedData).map(([categoryId, total]) => ({
      name: getCategoryById(categoryId)?.name || (categoryId === subscriptionsCategoryId ? 'Subscriptions' : "Uncategorized"),
      valueInDefaultCurrency: total,
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
                formatter={(value: number, name: string, props) => {
                    // The key for 'valueInDefaultCurrency' is what recharts uses internally from Bar dataKey
                    const configKey = props.dataKey as keyof typeof chartConfig; 
                    const label = chartConfig[configKey]?.label || name;
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
