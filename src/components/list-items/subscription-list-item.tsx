"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
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

interface SubscriptionListItemProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
}

export function SubscriptionListItem({ subscription, onEdit }: SubscriptionListItemProps) {
  const { getCategoryById, deleteSubscription } = useData();
  const { toast } = useToast();
  const category = getCategoryById(subscription.categoryId);

  const handleDelete = () => {
    deleteSubscription(subscription.id);
    toast({ title: "Subscription Deleted", description: "The subscription has been successfully deleted." });
  };

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {category && <IconDisplay name={category.icon} className="mr-2 h-5 w-5 text-primary" />}
              {subscription.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Category: {category?.name || "Uncategorized"} | Starts: {format(new Date(subscription.startDate), "MMM dd, yyyy")}
            </p>
          </div>
          <p className="text-xl font-semibold text-primary">
            ${subscription.amount.toFixed(2)}<span className="text-sm text-muted-foreground">/month</span>
          </p>
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
