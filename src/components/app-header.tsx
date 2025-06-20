
"use client";
import { PiggyBank } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="py-4 px-6">
      <div className="container mx-auto">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors duration-150 ease-in-out">
          <PiggyBank className="h-8 w-8" />
          <h1 className="text-3xl font-bold font-headline">Budgie</h1>
        </Link>
      </div>
    </header>
  );
}
