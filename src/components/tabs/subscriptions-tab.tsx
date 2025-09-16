
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { parseISO, isBefore } from "date-fns";


const SELECT_ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";

export function SubscriptionsTab() {
  const { subscriptions, categories, getCategoryById, isLoading, getAmountInDefaultCurrency } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc" | "amount-desc" | "amount-asc">("name-asc");
  const [filterCategory, setFilterCategory] = useState<string>(SELECT_ALL_CATEGORIES_VALUE);

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setIsDialogOpen(true);
  };

  const closeDialogAndReset = () => {
    setIsDialogOpen(false);
    setEditingSubscription(undefined);
  };

  const now = new Date();
  
  const baseOngoingSubscriptions = subscriptions.filter(sub => !sub.endDate || !isBefore(parseISO(sub.endDate), now));
  const baseEndedSubscriptions = subscriptions.filter(sub => sub.endDate && isBefore(parseISO(sub.endDate), now));

  const filterAndSort = (subs: Subscription[]) => {
    return subs
      .filter(sub => {
        const category = getCategoryById(sub.categoryId);
        const nameMatch = sub.name.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryNameMatch = category?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const searchMatch = searchTerm === "" || nameMatch || categoryNameMatch;
        const categoryFilterMatch = filterCategory === SELECT_ALL_CATEGORIES_VALUE || sub.categoryId === filterCategory;
        return searchMatch && categoryFilterMatch;
      })
      .sort((a, b) => {
        const amountA = getAmountInDefaultCurrency(a);
        const amountB = getAmountInDefaultCurrency(b);
        switch (sortOrder) {
          case "name-desc": return b.name.localeCompare(a.name);
          case "amount-desc": return amountB - amountA;
          case "amount-asc": return amountA - amountB;
          case "name-asc":
          default:
            return a.name.localeCompare(b.name);
        }
      });
  };

  const ongoingSubscriptions = filterAndSort(baseOngoingSubscriptions);
  const endedSubscriptions = filterAndSort(baseEndedSubscriptions);


  if (isLoading) {
     return (
      <div className="space-y-6 p-1">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Skeleton className="h-9 w-56" /> {/* "Manage Subscriptions" title */}
          <Skeleton className="h-10 w-full sm:w-40 rounded-lg" /> {/* "Add Subscription" button */}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 my-4">
          <Skeleton className="h-10 flex-grow rounded-md" /> {/* Search Input */}
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" /> {/* Filter Category Select */}
          <Skeleton className="h-10 w-full sm:w-[180px] rounded-md" /> {/* Sort Order Select */}
        </div>
        <div className="space-y-4 pr-3">
          {[...Array(3)].map((_, i) => (
             <Card key={i} className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" /> {/* Subscription Name */}
                      <Skeleton className="h-3 w-40" /> {/* Category & Start Date */}
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-6 w-24 mb-1" /> {/* Amount/month */}
                      <Skeleton className="h-3 w-20" /> {/* Original Amount (optional) */}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                   <Skeleton className="h-4 w-full" /> {/* Description (optional) */}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-3">
                  <Skeleton className="h-8 w-8 rounded" /> {/* Edit Button */}
                  <Skeleton className="h-8 w-8 rounded" /> {/* Delete Button */}
                </CardFooter>
              </Card>
          ))}
        </div>
      </div>
    );
  }

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
            <SelectItem value={SELECT_ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
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
      
      <Accordion type="multiple" defaultValue={['ongoing-subscriptions']} className="w-full">
        <AccordionItem value="ongoing-subscriptions">
          <AccordionTrigger className="text-xl font-semibold font-headline">Ongoing Subscriptions ({ongoingSubscriptions.length})</AccordionTrigger>
          <AccordionContent>
            {ongoingSubscriptions.length > 0 ? (
              <ScrollArea className="h-[calc(50vh_-_10rem)]"> 
                <div className="space-y-4 pr-3 py-2">
                  {ongoingSubscriptions.map(subscription => (
                    <SubscriptionListItem key={subscription.id} subscription={subscription} onEdit={handleEdit} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10">
                  <p className="text-muted-foreground">No ongoing subscriptions found.</p>
                  {subscriptions.length > 0 && <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="ended-subscriptions">
          <AccordionTrigger className="text-xl font-semibold font-headline">Ended Subscriptions ({endedSubscriptions.length})</AccordionTrigger>
          <AccordionContent>
            {endedSubscriptions.length > 0 ? (
              <ScrollArea className="h-[calc(50vh_-_10rem)]">
                <div className="space-y-4 pr-3 py-2">
                  {endedSubscriptions.map(subscription => (
                    <SubscriptionListItem key={subscription.id} subscription={subscription} onEdit={handleEdit} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No ended subscriptions found.</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
