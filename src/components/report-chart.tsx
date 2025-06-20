
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart"; 
import { useData } from "@/contexts/data-context";
import type { ReportPeriod, ChartDataPoint } from "@/lib/types";
import { 
  format, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, 
  startOfYear, endOfYear, 
  eachDayOfInterval, eachMonthOfInterval, 
  isWithinInterval, parseISO, 
  getDaysInMonth,
  isBefore, isEqual, isAfter
} from "date-fns";
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

    let reportPeriodStart: Date, reportPeriodEnd: Date;

    switch (period) {
      case 'weekly':
        reportPeriodStart = startOfWeek(date, { weekStartsOn: 1 });
        reportPeriodEnd = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'monthly':
        reportPeriodStart = startOfMonth(date);
        reportPeriodEnd = endOfMonth(date);
        break;
      case 'yearly':
        reportPeriodStart = startOfYear(date);
        reportPeriodEnd = endOfYear(date);
        break;
    }

    const aggregatedData: { [categoryId: string]: number } = {};

    expenses.forEach(expense => {
      if (isWithinInterval(parseISO(expense.date), { start: reportPeriodStart, end: reportPeriodEnd })) {
        const amountInDefault = getAmountInDefaultCurrency(expense);
        aggregatedData[expense.categoryId] = (aggregatedData[expense.categoryId] || 0) + amountInDefault;
      }
    });
    
    const subscriptionsCategoryId = categories.find(c => c.name.toLowerCase() === 'subscriptions')?.id || 'subscriptions_placeholder_id';
    
    subscriptions.forEach(sub => {
      const subStartDate = parseISO(sub.startDate);
      const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;
      let subContribution = 0;
      const monthlyAmountInDefault = getAmountInDefaultCurrency(sub);

      if (isAfter(subStartDate, reportPeriodEnd)) return; // Subscription starts after the report period ends

      if (period === 'monthly') {
        // Active if starts before/on report end AND (no end date OR ends after/on report start)
        const isActiveInMonth = 
          (isEqual(subStartDate, reportPeriodEnd) || isBefore(subStartDate, reportPeriodEnd)) &&
          (!subEndDate || isEqual(subEndDate, reportPeriodStart) || isAfter(subEndDate, reportPeriodStart));
        if (isActiveInMonth) {
          subContribution = monthlyAmountInDefault;
        }
      } else if (period === 'yearly') {
        const yearMonths = eachMonthOfInterval({ start: reportPeriodStart, end: reportPeriodEnd });
        yearMonths.forEach(monthInYear => {
          const monthStart = startOfMonth(monthInYear);
          const monthEnd = endOfMonth(monthInYear);
          const isActiveInMonth = 
            (isEqual(subStartDate, monthEnd) || isBefore(subStartDate, monthEnd)) &&
            (!subEndDate || isEqual(subEndDate, monthStart) || isAfter(subEndDate, monthStart));
          if (isActiveInMonth) {
             subContribution += monthlyAmountInDefault;
          }
        });
      } else { // weekly
        const billingMonthForWeekStart = startOfMonth(reportPeriodStart); // The month this week's expenses are billed against for this sub
        const billingMonthForWeekEnd = endOfMonth(reportPeriodStart);

        // Is the subscription active at all during this billing month?
        const isActiveInBillingMonth =
          (isEqual(subStartDate, billingMonthForWeekEnd) || isBefore(subStartDate, billingMonthForWeekEnd)) &&
          (!subEndDate || isEqual(subEndDate, billingMonthForWeekStart) || isAfter(subEndDate, billingMonthForWeekStart));

        if (isActiveInBillingMonth) {
            const daysInBillingMonth = getDaysInMonth(billingMonthForWeekStart);
            if (daysInBillingMonth > 0) {
                const dailyRate = monthlyAmountInDefault / daysInBillingMonth;
                const weekDaysInterval = eachDayOfInterval({start: reportPeriodStart, end: reportPeriodEnd});
                let activeDaysInWeek = 0;
                weekDaysInterval.forEach(dayInWeek => {
                    const isActiveThisDay = 
                        (isEqual(dayInWeek, subStartDate) || isAfter(dayInWeek, subStartDate)) &&
                        (!subEndDate || isEqual(dayInWeek, subEndDate) || isBefore(dayInWeek, subEndDate));
                    if (isActiveThisDay) {
                        activeDaysInWeek++;
                    }
                });
                subContribution = dailyRate * activeDaysInWeek;
            }
        }
      }
      
      if (subContribution > 0) {
         const categoryIdToUse = sub.categoryId || subscriptionsCategoryId; 
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
           <Skeleton className="h-7 w-3/4" />
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
