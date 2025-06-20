import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from '@/contexts/data-context';

export const metadata: Metadata = {
  title: 'TrackRight - Daily Expense Tracker',
  description: 'Track your daily expenses and visualize your spending habits with TrackRight. Data stored locally on the server.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <DataProvider>
          <div className="flex-grow">
            {children}
          </div>
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
