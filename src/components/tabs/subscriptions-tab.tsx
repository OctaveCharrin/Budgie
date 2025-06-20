"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { SubscriptionListItem } from "@/components/list-items/subscription-list-item";
import type { Subscription } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SubscriptionsTab() {
  const { subscriptions, categories, getCategoryById } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc" | "amount-desc" | "amount-asc">("name-asc");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsDialogOpen(true);
  };

  const closeDialogAndReset = () => {
    setIsDialogOpen(false);
    setEditingSubscription(undefined);
  };

  const filteredAndSortedSubscriptions = subscriptions
    .filter(sub => {
      const category = getCategoryById(sub.categoryId);
      const nameMatch = sub.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryNameMatch = category?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const searchMatch = searchTerm === "" || nameMatch || categoryNameMatch;
      const categoryFilterMatch = filterCategory === "" || sub.categoryId === filterCategory;
      return searchMatch && categoryFilterMatch;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "name-desc": return b.name.localeCompare(a.name);
        case "amount-desc": return b.amount - a.amount;
        case "amount-asc": return a.amount - b.amount;
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });


  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold font-headline">Manage Subscriptions</h2>
         <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeDialogAndReset(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSubscription ? "Edit Subscription" : "Add New Subscription"}</DialogTitle>
            </DialogHeader>
            <SubscriptionForm subscription={editingSubscription} onSave={closeDialogAndReset} />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 my-4">
        <Input 
          placeholder="Search subscriptions (name, category)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
            <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
          </SelectContent>
        </Select>
      </div>


      {filteredAndSortedSubscriptions.length > 0 ? (
         <ScrollArea className="h-[calc(100vh_-_20rem)]"> {/* Adjust height as needed */}
          <div className="space-y-4 pr-3">
            {filteredAndSortedSubscriptions.map(subscription => (
              <SubscriptionListItem key={subscription.id} subscription={subscription} onEdit={handleEdit} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-10">
            <p className="text-muted-foreground">No subscriptions found.</p>
            {subscriptions.length > 0 && <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>}
        </div>
      )}
    </div>
  );
}
