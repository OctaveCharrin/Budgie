
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
import { BarChartHorizontalBig, PieChart as PieChartIcon } from "lucide-react"; // Updated Icon

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))', 
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
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
      default: // Default to yearly if period is unexpected, though UI should prevent this.
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
    
    // Ensure 'subscriptions' category exists or handle its absence gracefully
    const subscriptionsCategoryInfo = categories.find(c => c.id === 'subscriptions' || c.name.toLowerCase() === 'subscriptions');
    const subscriptionsCategoryId = subscriptionsCategoryInfo ? subscriptionsCategoryInfo.id : 'uncategorized_subscriptions'; // Fallback ID
    const subscriptionsCategoryName = subscriptionsCategoryInfo ? subscriptionsCategoryInfo.name : 'Subscriptions (Uncategorized)'; // Fallback Name
    
    subscriptions.forEach(sub => {
      const subStartDate = parseISO(sub.startDate);
      const subEndDate = sub.endDate ? parseISO(sub.endDate) : null;
      let subContribution = 0;
      const monthlyAmountInDefault = getAmountInDefaultCurrency(sub);

      if (isAfter(subStartDate, reportPeriodEnd) && !isEqual(subStartDate, reportPeriodEnd)) return; 

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
      } else { // weekly
        const billingMonthForWeekStart = startOfMonth(reportPeriodStart); 
        const billingMonthForWeekEnd = endOfMonth(reportPeriodStart); // This should be end of the month reportPeriodStart is in.

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
                    // Check if dayInWeek is within the subscription's active period
                    const dayIsOnOrAfterSubStart = isEqual(dayInWeek, subStartDate) || isAfter(dayInWeek, subStartDate);
                    const dayIsOnOrBeforeSubEnd = !subEndDate || isEqual(dayInWeek, subEndDate) || isBefore(dayInWeek, subEndDate);

                    if (dayIsOnOrAfterSubStart && dayIsOnOrBeforeSubEnd) {
                        activeDaysInWeek++;
                    }
                });
                subContribution = dailyRate * activeDaysInWeek;
            }
        }
      }
      
      if (subContribution > 0) {
         // Use the specific categoryId from the subscription if available, otherwise the general subscriptions category.
         const categoryIdToUse = sub.categoryId && getCategoryById(sub.categoryId) ? sub.categoryId : subscriptionsCategoryId;
         aggregatedData[categoryIdToUse] = (aggregatedData[categoryIdToUse] || 0) + subContribution;
      }
    });
    
    return Object.entries(aggregatedData).map(([categoryId, total]) => {
      let name = getCategoryById(categoryId)?.name;
      if (!name && categoryId === 'uncategorized_subscriptions') {
        name = subscriptionsCategoryName;
      } else if (!name) {
        name = "Uncategorized";
      }
      return {
        name: name,
        value: total, 
      };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  };

  const data = calculateReportData();

  const getTitle = () => {
    let periodName = "";
     switch (period) {
      case 'weekly':
        periodName = `${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(date, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
        break;
      case 'monthly':
        periodName = format(date, "MMMM yyyy");
        break;
      case 'yearly':
        periodName = format(date, "yyyy");
        break;
    }
    return `Category Breakdown: ${periodName}`;
  }
  
  if (isLoading || !defaultCurrency) {
    return (
      <Card className="shadow-md">
        <CardHeader>
           <div className="flex items-center">
             <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
             <Skeleton className="h-6 w-3/4" />
           </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <Skeleton className="h-[280px] w-[280px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No category spending data available for this period.</p>
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
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
          {getTitle()}
        </CardTitle>
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
                  const x = cx + (radius + 25) * Math.cos(-midAngle * RADIAN); // Increased label distance
                  const y = cy + (radius + 25) * Math.sin(-midAngle * RADIAN); // Increased label distance
                  const textAnchor = x > cx ? 'start' : 'end';
                  
                  if (percent * 100 < 3) return null; // Hide label for very small slices to avoid clutter

                  return (
                    <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={textAnchor} dominantBaseline="central" fontSize="12px">
                      {`${name} (${(percent * 100).toFixed(0)}%)`}
                    </text>
                  );
                }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px', paddingBottom: '10px' }} 
                formatter={(value, entry) => {
                     const { color } = entry; // entry.color is provided by Recharts
                     return <span style={{ color: color }}>{value}</span>;
                }}
                iconSize={10}
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
