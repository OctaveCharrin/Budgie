"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportChart } from "@/components/report-chart";
import type { ReportPeriod } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from "date-fns";
import { cn } from "@/lib/utils";

export function ReportsTab() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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


  return (
    <div className="space-y-6 p-1">
      <h2 className="text-2xl font-semibold font-headline">Expense Reports</h2>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-card">
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

        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} aria-label="Previous period">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-[200px] justify-start text-left font-normal",
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
                    // Show month/year picker based on period for better UX
                    captionLayout={period === 'yearly' ? "dropdown-buttons" : "buttons"}
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 5}
                />
                </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')} aria-label="Next period">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <ReportChart period={period} date={selectedDate} />
    </div>
  );
}
