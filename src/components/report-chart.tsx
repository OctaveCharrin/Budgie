
"use client";

import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";
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
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = [
  '#FF6384', // Pinkish Red
  '#36A2EB', // Sky Blue
  '#FFCE56', // Light Yellow
  '#4BC0C0', // Teal
  '#9966FF', // Lavender
  '#FF9F40', // Orange
  '#8AC926', // Lime Green
  '#E76F51', // Burnt Sienna
  '#F4A261', // Sandy Brown
  '#2A9D8F', // Jungle Green
  '#6A0DAD', // Purple
  '#0077B6', // Dark Cerulean
];


interface ReportChartProps {
  period: ReportPeriod;
  date: Date; 
}

export function ReportChart({ period, date }: ReportChartProps) {
  const { expenses, subscriptions, getCategoryById, isLoading, settings, getAmountInDefaultCurrency, categories } = useData();
  const defaultCurrency = settings.defaultCurrency;
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

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
      default:
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
    
    const subscriptionsCategoryInfo = categories.find(c => c.id === 'subscriptions' || c.name.toLowerCase() === 'subscriptions');
    const subscriptionsCategoryId = subscriptionsCategoryInfo ? subscriptionsCategoryInfo.id : 'uncategorized_subscriptions'; 
    const subscriptionsCategoryName = subscriptionsCategoryInfo ? subscriptionsCategoryInfo.name : 'Subscriptions (Uncategorized)'; 
    
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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6} // Make slice slightly larger on hover
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill} // Optional: add a stroke of the same color for emphasis
        strokeWidth={1}
      />
    );
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
                outerRadius={120}
                fill="#8884d8" 
                dataKey="value"
                nameKey="name"
                animationDuration={500}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="hsl(var(--background))" 
                    strokeWidth={2} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px', paddingBottom: '10px' }} 
                formatter={(value, entry) => {
                     const { color } = entry; 
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
