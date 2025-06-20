
"use client";

import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { ExpensesTab } from "@/components/tabs/expenses-tab";
import { SubscriptionsTab } from "@/components/tabs/subscriptions-tab";
import { ReportsTab } from "@/components/tabs/reports-tab";
import { SettingsTab } from "@/components/tabs/settings-tab"; // New SettingsTab
import { LayoutDashboard, ListChecks, Repeat, BarChartHorizontalBig, Settings } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background mx-auto max-w-[70%]">
      <AppHeader />
      <main className="flex-grow px-4 py-6"> {/* Removed 'container' and 'mx-auto' */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 h-auto p-2 mb-6 rounded-lg bg-card shadow">
            <TabsTrigger value="dashboard" className="flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ListChecks className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" /> Expenses
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Repeat className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" /> Subscriptions
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChartHorizontalBig className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" /> Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground col-span-2 sm:col-span-1 md:col-span-1">
              <Settings className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>
          <TabsContent value="subscriptions">
            <SubscriptionsTab />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
       <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Budgie &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
