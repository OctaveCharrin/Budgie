
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import type { ReportPeriod, ChartDataPoint, Category, CurrencyCode } from "@/lib/types";
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

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface ReportChartProps {
  period: ReportPeriod;
  date: Date; 
}

export function ReportChart({ period, date }: ReportChartProps) {
  const { expenses, subscriptions, getCategoryById, isLoading, settings, getAmountInDefaultCurrency, categories } = useData();
  const defaultCurrency = settings.defaultCurrency;

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

      if (isAfter(subStartDate, reportPeriodEnd)) return; 

      if (period === 'monthly') {
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
      } else { 
        const billingMonthForWeekStart = startOfMonth(reportPeriodStart); 
        const billingMonthForWeekEnd = endOfMonth(reportPeriodStart);

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
      value: total, // Renamed from valueInDefaultCurrency to generic 'value' for pie chart
    })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  };

  const data = calculateReportData();

  const getTitle = () => {
    switch (period) {
      case 'weekly':
        return `Spending Breakdown: ${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(date, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
      case 'monthly':
        return `Spending Breakdown: ${format(date, "MMMM yyyy")}`;
      case 'yearly':
        return `Spending Breakdown: ${format(date, "yyyy")}`;
    }
  }
  
  if (isLoading || !defaultCurrency) {
    return (
      <Card>
        <CardHeader>
           <Skeleton className="h-7 w-3/4" />
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-full" />
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
          <p className="text-muted-foreground">No spending data available for this period.</p>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const totalSpendingForPeriod = data.reduce((sum, entry) => sum + entry.value, 0);
      const percentage = totalSpendingForPeriod > 0 ? (dataPoint.value / totalSpendingForPeriod * 100).toFixed(1) : 0;
      return (
        <div className="p-2 bg-background border border-border rounded-md shadow-lg">
          <p className="font-semibold">{`${dataPoint.name}`}</p>
          <p className="text-sm">{`${formatCurrency(dataPoint.value, defaultCurrency)} (${percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-headline">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + (radius + 15) * Math.cos(-midAngle * RADIAN);
                  const y = cy + (radius + 15) * Math.sin(-midAngle * RADIAN);
                  const textAnchor = x > cx ? 'start' : 'end';
                  if (percent * 100 < 5) return null; // Hide label for very small slices

                  return (
                    <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={textAnchor} dominantBaseline="central" fontSize="12px">
                      {`${name} (${(percent * 100).toFixed(0)}%)`}
                    </text>
                  );
                }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} 
                formatter={(value, entry) => {
                     const { color } = entry;
                     return <span style={{ color }}>{value}</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
