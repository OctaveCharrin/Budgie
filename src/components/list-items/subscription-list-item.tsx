
"use client";

import { format, parseISO } from "date-fns";
import { Pencil, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import type { Subscription } from "@/lib/types";
import { IconDisplay } from "@/components/icon-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface SubscriptionListItemProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
}

export function SubscriptionListItem({ subscription, onEdit }: SubscriptionListItemProps) {
  const { getCategoryById, deleteSubscription, settings, isLoading: isDataLoading, getAmountInDefaultCurrency } = useData();
  const { toast } = useToast();
  const category = getCategoryById(subscription.categoryId);

  const categoryName = category?.name || "Uncategorized";
  const categoryIcon = category?.icon || "HelpCircle";

  const handleDelete = () => {
    deleteSubscription(subscription.id);
    toast({ title: "Subscription Deleted", description: "The subscription has been successfully deleted." });
  };

  const displayAmount = getAmountInDefaultCurrency(subscription);
  const formattedDisplayAmount = isDataLoading || !settings.defaultCurrency
    ? "Loading..."
    : formatCurrency(displayAmount, settings.defaultCurrency);
  
  const formattedOriginalAmount = subscription.originalCurrency && typeof subscription.originalAmount === 'number'
    ? formatCurrency(subscription.originalAmount, subscription.originalCurrency)
    : "N/A";
  
  const startDate = parseISO(subscription.startDate);
  const endDate = subscription.endDate ? parseISO(subscription.endDate) : null;

  const dateDetails = endDate
    ? `Starts: ${format(startDate, "MMM dd, yyyy")} | Ends: ${format(endDate, "MMM dd, yyyy")}`
    : `Starts: ${format(startDate, "MMM dd, yyyy")} (Ongoing)`;


  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              <IconDisplay name={categoryIcon} className="mr-2 h-5 w-5 text-primary" />
              {subscription.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Category: {categoryName} | {dateDetails}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-primary">
              {formattedDisplayAmount}<span className="text-sm text-muted-foreground">/month</span>
            </p>
            {subscription.originalCurrency && settings.defaultCurrency !== subscription.originalCurrency && (
              <p className="text-xs text-muted-foreground">
                ({formattedOriginalAmount}/month)
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      {subscription.description && (
        <CardContent className="py-2">
          <p className="text-sm text-muted-foreground">{subscription.description}</p>
        </CardContent>
      )}
      <CardFooter className="flex justify-end gap-2 pt-2 pb-3 px-3">
        <Button variant="ghost" size="icon" onClick={() => onEdit(subscription)} aria-label="Edit subscription">
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete subscription">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this subscription.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
