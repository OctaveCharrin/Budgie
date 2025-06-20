
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportChart } from "@/components/report-chart";
import type { ReportPeriod, Expense, Subscription, CurrencyCode } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { 
  format, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, 
  subYears, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, 
  endOfYear, isWithinInterval, parseISO,
  getDaysInMonth, isBefore, isEqual, isAfter,
  eachDayOfInterval, eachMonthOfInterval
} from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useData } from "@/contexts/data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


export function ReportsTab() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [totalPeriodSpending, setTotalPeriodSpending] = useState<number | null>(null);
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(true);

  const { expenses, subscriptions, isLoading: isDataContextLoading, settings, getAmountInDefaultCurrency, getCategoryById, categories } = useData();
  const defaultCurrency = settings.defaultCurrency;

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (period) {
      case 'weekly':
        setSelectedDate(direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1));
        break;
      case 'monthly':
        setSelectedDate(direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1));
        break;
      case 'yearly':
        setSelectedDate(direction === 'prev' ? subYears(selectedDate, 1) : addYears(selectedDate, 1));
        break;
    }
  };
  
  const getDateRangeDisplay = () => {
    switch (period) {
      case 'weekly':
        return format(selectedDate, "'Week of' MMM d, yyyy");
      case 'monthly':
        return format(selectedDate, "MMMM yyyy");
      case 'yearly':
        return format(selectedDate, "yyyy");
      default:
        return format(selectedDate, "PPP");
    }
  };

  useEffect(() => {
    if (isDataContextLoading || !defaultCurrency || !categories) {
      setIsCalculatingTotal(true);
      setTotalPeriodSpending(null);
      return;
    }
    setIsCalculatingTotal(true);

    let reportPeriodStart: Date, reportPeriodEnd: Date;
    switch (period) {
      case 'weekly':
        reportPeriodStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        reportPeriodEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        reportPeriodStart = startOfMonth(selectedDate);
        reportPeriodEnd = endOfMonth(selectedDate);
        break;
      case 'yearly':
      default:
        reportPeriodStart = startOfYear(selectedDate);
        reportPeriodEnd = endOfYear(selectedDate);
        break;
    }

    let currentTotal = 0;

    expenses.forEach(expense => {
      if (isWithinInterval(parseISO(expense.date), { start: reportPeriodStart, end: reportPeriodEnd })) {
        currentTotal += getAmountInDefaultCurrency(expense);
      }
    });

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
        if (isActiveInMonth) subContribution = monthlyAmountInDefault;
      } else if (period === 'yearly') {
        const yearMonths = eachMonthOfInterval({ start: reportPeriodStart, end: reportPeriodEnd });
        yearMonths.forEach(monthInYear => {
          const monthStart = startOfMonth(monthInYear);
          const monthEnd = endOfMonth(monthInYear);
          const isActiveInMonth = 
            (isEqual(subStartDate, monthEnd) || isBefore(subStartDate, monthEnd)) &&
            (!subEndDate || isEqual(subEndDate, monthStart) || isAfter(subEndDate, monthStart));
          if (isActiveInMonth) subContribution += monthlyAmountInDefault;
        });
      } else { // weekly
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
                    if (isActiveThisDay) activeDaysInWeek++;
                });
                subContribution = dailyRate * activeDaysInWeek;
            }
        }
      }
      currentTotal += subContribution;
    });
    
    setTotalPeriodSpending(currentTotal);
    setIsCalculatingTotal(false);

  }, [period, selectedDate, expenses, subscriptions, defaultCurrency, isDataContextLoading, getAmountInDefaultCurrency, categories]);


  const totalCardTitle = useMemo(() => {
    switch (period) {
      case 'weekly':
        return `Total Spending: ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
      case 'monthly':
        return `Total Spending: ${format(selectedDate, "MMMM yyyy")}`;
      case 'yearly':
        return `Total Spending: ${format(selectedDate, "yyyy")}`;
      default:
        return "Total Spending";
    }
  }, [period, selectedDate]);


  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold font-headline">Expense Reports</h2>
         <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
            </Select>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} aria-label="Previous period" className="h-10 w-10">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[200px] justify-start text-left font-normal h-10",
                        !selectedDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDateRangeDisplay()}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        initialFocus
                        captionLayout={period === 'yearly' ? "dropdown-buttons" : "buttons"}
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 5}
                    />
                    </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')} aria-label="Next period" className="h-10 w-10">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-primary" />
            {totalCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isDataContextLoading || isCalculatingTotal || totalPeriodSpending === null ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(totalPeriodSpending, defaultCurrency)}
            </p>
          )}
        </CardContent>
      </Card>

      <ReportChart period={period} date={selectedDate} />
    </div>
  );
}

