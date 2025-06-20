
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, RotateCcw, Settings2, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { useData } from "@/contexts/data-context";
import { CategoryForm } from "@/components/forms/category-form";
import { CategoryListItem } from "@/components/list-items/category-list-item";
import type { Category, AppSettings, CurrencyCode } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";


export function SettingsTab() {
  const { 
    categories, 
    isLoading: isDataLoading, 
    deleteAllExpenses, 
    deleteAllSubscriptions,
    resetCategories: resetCategoriesContext,
    settings,
    updateSettings 
  } = useData();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  
  const [isDeleteExpensesAlertOpen, setIsDeleteExpensesAlertOpen] = useState(false);
  const [deleteExpensesConfirmationInput, setDeleteExpensesConfirmationInput] = useState("");
  
  const [isDeleteSubscriptionsAlertOpen, setIsDeleteSubscriptionsAlertOpen] = useState(false);
  const [deleteSubscriptionsConfirmationInput, setDeleteSubscriptionsConfirmationInput] = useState("");

  const [isResetCategoriesAlertOpen, setIsResetCategoriesAlertOpen] = useState(false);
  const [resetCategoriesConfirmationInput, setResetCategoriesConfirmationInput] = useState("");
  
  const { toast } = useToast();

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const closeCategoryDialogAndReset = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(undefined);
  };

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const handleDeleteAllExpenses = async () => {
    if (deleteExpensesConfirmationInput !== "DELETE") {
      toast({ variant: "destructive", title: "Confirmation Failed", description: "Please type DELETE to confirm." });
      return;
    }
    try {
      await deleteAllExpenses();
      toast({ title: "Success", description: "All expenses have been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete expenses." });
    }
    setDeleteExpensesConfirmationInput("");
    setIsDeleteExpensesAlertOpen(false);
  };

  const handleDeleteAllSubscriptions = async () => {
    if (deleteSubscriptionsConfirmationInput !== "DELETE") {
      toast({ variant: "destructive", title: "Confirmation Failed", description: "Please type DELETE to confirm." });
      return;
    }
    try {
      await deleteAllSubscriptions();
      toast({ title: "Success", description: "All subscriptions have been deleted." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete subscriptions." });
    }
    setDeleteSubscriptionsConfirmationInput("");
    setIsDeleteSubscriptionsAlertOpen(false);
  };

  const handleResetCategories = async () => {
     if (resetCategoriesConfirmationInput !== "RESET") {
      toast({ variant: "destructive", title: "Confirmation Failed", description: "Please type RESET to confirm." });
      return;
    }
    try {
      await resetCategoriesContext();
      toast({ title: "Success", description: "Categories have been reset to default." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not reset categories." });
    }
    setResetCategoriesConfirmationInput("");
    setIsResetCategoriesAlertOpen(false);
  };

  const handleDefaultCurrencyChange = (currency: CurrencyCode) => {
    updateSettings({ defaultCurrency: currency });
  };
  
  if (isDataLoading) {
    return (
      <div className="space-y-8 p-1">
        {/* Currency Settings Skeleton */}
        <section>
           <div className="flex items-center mb-4">
             <Skeleton className="h-7 w-7 mr-3 rounded-full" />
             <Skeleton className="h-9 w-1/2" />
           </div>
           <Card className="shadow-md">
            <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> {/* CardTitle */}
                <Skeleton className="h-4 w-full mb-1" /> {/* CardDescription line 1 */}
                <Skeleton className="h-4 w-5/6" />      {/* CardDescription line 2 */}
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-48 rounded-md" /> {/* Select dropdown */}
            </CardContent>
           </Card>
        </section>
        <Separator/>
        {/* Manage Categories Skeleton */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-9 w-48" /> {/* "Manage Categories" title */}
            <Skeleton className="h-10 w-36 rounded-lg" /> {/* "Add Category" button */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" /> {/* Icon */}
                    <Skeleton className="h-5 w-24" /> {/* Category Name */}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded" /> {/* Edit Button */}
                    <Skeleton className="h-8 w-8 rounded" /> {/* Delete Button */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <Separator />
        {/* Data Management Skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-9 w-1/2" /> {/* "Data Management" title */}
            <Skeleton className="h-6 w-28" /> {/* "Danger Zone" */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-48 rounded-lg" /> 
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-56 rounded-lg" /> 
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-56 rounded-lg" /> 
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }


  return (
    <div className="space-y-8 p-1">
      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center">
            <Settings2 className="mr-3 h-7 w-7 text-primary" /> Currency Settings
        </h2>
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Default Display Currency</CardTitle>
                <CardDescription>
                    Choose the default currency for displaying amounts in dashboards and reports. Expenses will still be stored with their original currency and converted values.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="max-w-xs">
                    <Label htmlFor="defaultCurrencySelect" className="sr-only">Default Currency</Label>
                    <Select
                        value={settings.defaultCurrency}
                        onValueChange={(value) => handleDefaultCurrencyChange(value as CurrencyCode)}
                    >
                        <SelectTrigger id="defaultCurrencySelect">
                            <SelectValue placeholder="Select default currency" />
                        </SelectTrigger>
                        <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                            {currency}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
      </section>

      <Separator />
      
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold font-headline">Manage Categories</h2>
          <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) closeCategoryDialogAndReset(); else setIsCategoryDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              </DialogHeader>
              <CategoryForm category={editingCategory} onSave={closeCategoryDialogAndReset} />
            </DialogContent>
          </Dialog>
        </div>

        {sortedCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCategories.map(category => (
              <CategoryListItem key={category.id} category={category} onEdit={handleEditCategory} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
              <p className="text-muted-foreground">No categories found. Add one to get started or reset to defaults.</p>
          </div>
        )}
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-semibold font-headline">Data Management</h2>
          <span className="text-destructive font-semibold flex items-center">
            <AlertTriangle className="mr-1 h-5 w-5" />
            DANGER ZONE
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md border-destructive">
            <CardHeader>
              <CardTitle>Delete All Expenses</CardTitle>
              <CardDescription>
                Permanently delete all your recorded expenses. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isDeleteExpensesAlertOpen} onOpenChange={(open) => {
                setIsDeleteExpensesAlertOpen(open);
                if (!open) setDeleteExpensesConfirmationInput("");
              }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All Expenses
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all expense data. This action cannot be undone.
                      To confirm, please type "DELETE" in the box below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <Label htmlFor="deleteExpensesConfirmInput" className="sr-only">
                      Type DELETE to confirm
                    </Label>
                    <Input
                      id="deleteExpensesConfirmInput"
                      value={deleteExpensesConfirmationInput}
                      onChange={(e) => setDeleteExpensesConfirmationInput(e.target.value)}
                      placeholder='Type "DELETE" here'
                      className="border-destructive focus-visible:ring-destructive"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteExpensesConfirmationInput("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllExpenses}
                      disabled={deleteExpensesConfirmationInput !== "DELETE"}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, delete all expenses
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card className="shadow-md border-destructive">
            <CardHeader>
              <CardTitle>Delete All Subscriptions</CardTitle>
              <CardDescription>
                Permanently delete all your recorded subscriptions. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isDeleteSubscriptionsAlertOpen} onOpenChange={(open) => {
                setIsDeleteSubscriptionsAlertOpen(open);
                if (!open) setDeleteSubscriptionsConfirmationInput("");
              }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All Subscriptions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all subscription data. This action cannot be undone.
                      To confirm, please type "DELETE" in the box below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <Label htmlFor="deleteSubscriptionsConfirmInput" className="sr-only">
                      Type DELETE to confirm
                    </Label>
                    <Input
                      id="deleteSubscriptionsConfirmInput"
                      value={deleteSubscriptionsConfirmationInput}
                      onChange={(e) => setDeleteSubscriptionsConfirmationInput(e.target.value)}
                      placeholder='Type "DELETE" here'
                      className="border-destructive focus-visible:ring-destructive"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteSubscriptionsConfirmationInput("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllSubscriptions}
                      disabled={deleteSubscriptionsConfirmationInput !== "DELETE"}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, delete all subscriptions
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card className="shadow-md border-destructive">
            <CardHeader>
              <CardTitle>Reset Categories</CardTitle>
              <CardDescription>
                Reset all categories to the application defaults. Custom categories will be removed. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isResetCategoriesAlertOpen} onOpenChange={(open) => {
                setIsResetCategoriesAlertOpen(open);
                if (!open) setResetCategoriesConfirmationInput("");
              }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset Categories to Default
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to reset categories?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace all current categories with the default set. Any expenses or subscriptions linked to custom categories will become uncategorized. This action cannot be undone.
                      To confirm, please type "RESET" in the box below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                     <Label htmlFor="resetCategoriesConfirmInput" className="sr-only">
                      Type RESET to confirm
                    </Label>
                    <Input
                      id="resetCategoriesConfirmInput"
                      value={resetCategoriesConfirmationInput}
                      onChange={(e) => setResetCategoriesConfirmationInput(e.target.value)}
                      placeholder='Type "RESET" here'
                      className="border-destructive focus-visible:ring-destructive"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setResetCategoriesConfirmationInput("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetCategories}
                      disabled={resetCategoriesConfirmationInput !== "RESET"}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, reset categories
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
    
