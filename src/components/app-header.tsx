"use client";
import { PiggyBank } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="py-4 px-6">
      <div className="container mx-auto flex items-center gap-2">
        <PiggyBank className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-primary font-headline">Budgie</h1>
      </div>
    </header>
  );
}
