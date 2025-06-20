
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportChart } from "@/components/report-chart";
import { DailyExpensesLineChart } from "@/components/daily-expenses-line-chart";
import { WeekdaySpendingBarChart } from "@/components/weekday-spending-bar-chart";
import type { ReportPeriod, OverallPeriodMetrics, DailyTotalDataPoint, CategoryBreakdownPoint } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Wallet, TrendingUp, BarChart2 } from "lucide-react";
import { 
  format, addWeeks, subWeeks, 
  addMonths, subMonths, addYears, 
  subYears, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, 
  endOfYear
} from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useData } from "@/contexts/data-context"; // For settings.defaultCurrency
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getOverallPeriodMetrics } from "@/actions/report-actions";


const initialReportData: OverallPeriodMetrics = {
  totalOverallSpending: 0,
  dailyTotalsArray: [],
  categoryBreakdownArray: [],
  weekdayExpenseTotals: Array(7).fill(0),
  weekdaySubscriptionTotals: Array(7).fill(0),
  weekdayOccurrences: Array(7).fill(0),
  dailySpendingByWeekdayForErrorBar: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
};

export function ReportsTab() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [accumulateDailyExpenses, setAccumulateDailyExpenses] = useState(false);
  const [reportData, setReportData] = useState<OverallPeriodMetrics>(initialReportData);
  const [isReportLoading, setIsReportLoading] = useState(true);

  const { settings, isLoading: isDataContextLoading } = useData(); // Get defaultCurrency from context
  const defaultCurrency = settings.defaultCurrency;

  const fetchReportData = useCallback(async () => {
    if (!defaultCurrency || isDataContextLoading) {
      // Don't fetch if default currency isn't loaded yet or if main data is loading
      setIsReportLoading(true); // Keep loading state until currency is available
      return;
    }
    setIsReportLoading(true);
    try {
      const data = await getOverallPeriodMetrics(period, selectedDate.toISOString(), defaultCurrency);
      setReportData(data);
    } catch (error) {
      console.error("Failed to fetch report metrics:", error);
      setReportData(initialReportData); // Reset to initial on error
      // Consider adding a toast notification here
    } finally {
      setIsReportLoading(false);
    }
  }, [period, selectedDate, defaultCurrency, isDataContextLoading]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);


  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate = selectedDate;
    switch (period) {
      case 'weekly':
        newDate = direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1);
        break;
      case 'monthly':
        newDate = direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1);
        break;
      case 'yearly':
        newDate = direction === 'prev' ? subYears(selectedDate, 1) : addYears(selectedDate, 1);
        break;
    }
    setSelectedDate(newDate);
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


  if (isDataContextLoading) { // Still show global loading if core data (like settings) isn't ready
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-9 w-48 mb-4" /> {/* Title */}
        <Skeleton className="h-10 w-full mb-4" /> {/* Controls */}
        <Skeleton className="h-24 w-full mb-4" /> {/* Total Card */}
        <Skeleton className="h-80 w-full mb-4" /> {/* Chart Placeholder */}
        <Skeleton className="h-80 w-full mb-4" /> {/* Chart Placeholder */}
        <Skeleton className="h-80 w-full" />      {/* Chart Placeholder */}
      </div>
    );
  }

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
                        fromYear={startOfYear(subYears(new Date(), 10)).getFullYear()}
                        toYear={endOfYear(addYears(new Date(), 10)).getFullYear()}
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
          {isReportLoading ? (
            <Skeleton className="h-8 w-1/2" />
          ) : (
            <p className="text-3xl font-bold text-primary">
              {defaultCurrency ? formatCurrency(reportData.totalOverallSpending, defaultCurrency) : 'Loading...'}
            </p>
          )}
        </CardContent>
      </Card>
      
      <Separator />

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Daily Spending Trend
            </CardTitle>
            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
              <Checkbox
                id="accumulateCheckbox"
                checked={accumulateDailyExpenses}
                onCheckedChange={(checked) => setAccumulateDailyExpenses(Boolean(checked))}
              />
              <Label htmlFor="accumulateCheckbox" className="text-sm font-medium">
                Accumulate daily totals
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DailyExpensesLineChart
            dailyTotals={reportData.dailyTotalsArray}
            accumulate={accumulateDailyExpenses}
            isLoading={isReportLoading}
            period={period} 
          />
        </CardContent>
      </Card>

      <Separator />
      
      <ReportChart 
        categoryBreakdown={reportData.categoryBreakdownArray} 
        periodTitle={totalCardTitle} // Re-use title from total card for consistency
        isLoading={isReportLoading}
      />

      <Separator />

      <Card className="shadow-md">
        <CardHeader>
           <CardTitle className="text-lg font-semibold flex items-center">
             <BarChart2 className="mr-2 h-5 w-5 text-primary" />
             Average Spending by Weekday
           </CardTitle>
        </CardHeader>
        <CardContent>
          <WeekdaySpendingBarChart 
            weekdayExpenseTotals={reportData.weekdayExpenseTotals}
            weekdaySubscriptionTotals={reportData.weekdaySubscriptionTotals}
            weekdayOccurrences={reportData.weekdayOccurrences}
            dailySpendingByWeekdayForErrorBar={reportData.dailySpendingByWeekdayForErrorBar}
            isLoading={isReportLoading}
          />
        </CardContent>
      </Card>

    </div>
  );
}

