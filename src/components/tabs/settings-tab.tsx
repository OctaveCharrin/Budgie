
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, RotateCcw, Settings2, AlertTriangle, KeyRound, Eye, EyeOff, Dot, RefreshCw, Loader2, PiggyBank } from "lucide-react";
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
import { formatDistanceToNow } from 'date-fns';

export function SettingsTab() {
  const { 
    categories, 
    isLoading: isDataLoading, 
    deleteAllExpenses, 
    deleteAllSubscriptions,
    resetCategories: resetCategoriesContext,
    settings,
    updateSettings,
    forceUpdateRates
  } = useData();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  
  const [isDeleteExpensesAlertOpen, setIsDeleteExpensesAlertOpen] = useState(false);
  const [deleteExpensesConfirmationInput, setDeleteExpensesConfirmationInput] = useState("");
  
  const [isDeleteSubscriptionsAlertOpen, setIsDeleteSubscriptionsAlertOpen] = useState(false);
  const [deleteSubscriptionsConfirmationInput, setDeleteSubscriptionsConfirmationInput] = useState("");

  const [isResetCategoriesAlertOpen, setIsResetCategoriesAlertOpen] = useState(false);
  const [resetCategoriesConfirmationInput, setResetCategoriesConfirmationInput] = useState("");

  const [apiKeyInput, setApiKeyInput] = useState(""); 
  const [showApiKey, setShowApiKey] = useState(false);
  const [isRemoveApiKeyAlertOpen, setIsRemoveApiKeyAlertOpen] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  
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
    updateSettings({ ...settings, defaultCurrency: currency });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numberValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numberValue) && numberValue >= 0) {
        updateSettings({ ...settings, monthlyBudget: numberValue });
    } else if (value === '') {
        updateSettings({ ...settings, monthlyBudget: 0 });
    }
  };

  const handleApiKeySave = async () => {
    try {
      await updateSettings({ ...settings, apiKey: apiKeyInput.trim() });
      toast({ title: "API Key Saved", description: "ExchangeRate-API key has been updated." });
      setApiKeyInput(""); 
      setShowApiKey(false); 
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save API key." });
    }
  };
  
  const handleApiKeyRemove = async () => {
    try {
      await updateSettings({ ...settings, apiKey: '' });
      toast({ title: "API Key Removed", description: "ExchangeRate-API key has been removed." });
      setApiKeyInput(""); 
      setShowApiKey(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not remove API key." });
    }
    setIsRemoveApiKeyAlertOpen(false); // Close dialog
  };

  const getMaskedApiKeyDisplay = () => {
    if (isDataLoading || !settings || !settings.apiKey || settings.apiKey.length === 0) {
      return "Not Set";
    }
    if (settings.apiKey.length <= 7) {
      return "••••••••";
    }
    return `••••••••${settings.apiKey.slice(-4)}`;
  };
  
  const handleForceUpdateRates = async () => {
    setIsFetchingRates(true);
    await forceUpdateRates();
    setIsFetchingRates(false);
  };
  
  const lastSyncTime = settings.lastRatesSync ? new Date(settings.lastRatesSync) : null;
  
  if (isDataLoading) {
    return (
      <div className="space-y-8 p-1">
        {/* General Settings Skeleton */}
        <section>
           <div className="flex items-center mb-4">
             <Skeleton className="h-7 w-7 mr-3 rounded-full" />
             <Skeleton className="h-9 w-1/2" />
           </div>
           <div className="space-y-4">
            <Card className="shadow-md">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-48 rounded-md" />
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-48 rounded-md" />
                </CardContent>
            </Card>
           </div>
        </section>
        <Separator/>
        {/* API Key Settings Skeleton */}
        <section>
           <div className="flex items-center mb-4">
             <Skeleton className="h-7 w-7 mr-3 rounded-full" />
             <Skeleton className="h-9 w-1/2" />
           </div>
           <Card className="shadow-md">
            <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" /> 
                <Skeleton className="h-4 w-full mb-1" /> 
                <Skeleton className="h-4 w-3/4" />      
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" /> 
                 <Skeleton className="h-4 w-full" /> 
            </CardContent>
             <CardFooter className="gap-2">
                <Skeleton className="h-10 w-32 rounded-md" /> 
                <Skeleton className="h-10 w-32 rounded-md" /> 
            </CardFooter>
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
          <div className="flex items-baseline gap-2 mb-4">
            <Skeleton className="h-9 w-1/2" /> {/* "Data Management" title */}
            <Skeleton className="h-6 w-28" /> {/* "Danger Zone" */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-md border-destructive">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-48 rounded-lg" /> 
              </CardContent>
            </Card>
            <Card className="shadow-md border-destructive">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" /> 
                <Skeleton className="h-4 w-full" /> 
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-56 rounded-lg" /> 
              </CardContent>
            </Card>
            <Card className="shadow-md border-destructive">
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
            <Settings2 className="mr-3 h-7 w-7 text-primary" /> General Settings
        </h2>
        <div className="space-y-4">
          <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Default Display Currency</CardTitle>
                  <CardDescription>
                      Choose the default currency for displaying totals. Expenses will still be stored with their original currency.
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
          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Monthly Budget</CardTitle>
                <CardDescription>
                    Set a monthly spending budget. This will be shown on your dashboard to help you track your spending.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="max-w-xs">
                    <Label htmlFor="monthlyBudgetInput">Budget Amount ({settings.defaultCurrency})</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input
                            id="monthlyBudgetInput"
                            type="number"
                            value={settings.monthlyBudget || ''}
                            onChange={handleBudgetChange}
                            placeholder="e.g., 1000"
                            min="0"
                        />
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center">
            <KeyRound className="mr-3 h-7 w-7 text-primary" /> Exchange Rate API Key
        </h2>
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>ExchangeRate-API Key</CardTitle>
                <CardDescription>
                    Provide your API key from <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">ExchangeRate-API.com</a> for live currency conversions.
                    The key is stored securely on the server.
                    If no key is provided, placeholder rates will be used and updates will fail.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="apiKeyInput">API Key</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input
                        id="apiKeyInput"
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your API key"
                        className="flex-grow"
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)} aria-label={showApiKey ? "Hide API key" : "Show API key"}>
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                     <p className="text-sm text-muted-foreground mt-2">
                        Current Saved Key: {getMaskedApiKeyDisplay()}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                 <Button onClick={handleApiKeySave} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save API Key</Button>
                 <AlertDialog open={isRemoveApiKeyAlertOpen} onOpenChange={setIsRemoveApiKeyAlertOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!settings.apiKey}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove Key
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the saved API key. Currency conversions will use fallback rates until a new key is provided.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleApiKeyRemove}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Yes, remove key
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
      </section>

      <Separator />

      <section>
          <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center">
              <RefreshCw className="mr-3 h-7 w-7 text-primary" /> Exchange Rate Sync
          </h2>
          <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Sync Exchange Rates</CardTitle>
                  <CardDescription>
                      Exchange rates are fetched on app startup and once daily. You can also manually trigger an update here. A valid API key is required to perform an update.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">
                      Last updated: {lastSyncTime ? `${formatDistanceToNow(lastSyncTime)} ago` : 'Never'}
                  </p>
              </CardContent>
              <CardFooter className="items-center">
                  <Button onClick={handleForceUpdateRates} disabled={isFetchingRates || !settings.apiKey}>
                      {isFetchingRates ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      {isFetchingRates ? "Updating..." : "Update Now"}
                  </Button>
                  {!settings.apiKey && (
                      <p className="text-sm text-muted-foreground ml-4">
                          An API key is required to fetch rates.
                      </p>
                  )}
              </CardFooter>
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
        <div className="flex items-baseline gap-2 mb-4">
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
