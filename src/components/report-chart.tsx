
"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import type { CategoryBreakdownPoint } from "@/lib/types";
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
  categoryBreakdown: CategoryBreakdownPoint[];
  periodTitle: string;
  isLoading: boolean;
}

export function ReportChart({ categoryBreakdown, periodTitle, isLoading }: ReportChartProps) {
  const { settings } = useData();
  const defaultCurrency = settings.defaultCurrency;
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Map categoryBreakdown to chart data format
  const data = categoryBreakdown.map(item => ({
    name: item.categoryName,
    value: item.totalAmount,
  }));
  
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
            Category Breakdown: {periodTitle.replace('Total Spending: ', '')}
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
        outerRadius={outerRadius + 6} 
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill} 
        strokeWidth={1}
      />
    );
  };


  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
          Category Breakdown: {periodTitle.replace('Total Spending: ', '')}
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
