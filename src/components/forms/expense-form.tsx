
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useData } from "@/contexts/data-context";
import type { Expense, CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { useEffect } from "react"; // Added useEffect import

const formSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  categoryId: z.string().min(1, "Category is required."),
  originalAmount: z.coerce.number().positive("Amount must be positive."),
  originalCurrency: z.enum(SUPPORTED_CURRENCIES, { required_error: "Currency is required." }),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  onSave: () => void; 
}

export function ExpenseForm({ expense, onSave }: ExpenseFormProps) {
  const { categories, addExpense, updateExpense, settings, isLoading: isDataLoading } = useData();
  const { toast } = useToast();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: expense
      ? { 
          date: new Date(expense.date), 
          categoryId: expense.categoryId,
          originalAmount: Number(expense.originalAmount), 
          originalCurrency: expense.originalCurrency,
          description: expense.description || "" 
        }
      : { 
          date: new Date(), 
          originalAmount: undefined, 
          originalCurrency: settings.defaultCurrency, 
          description: "",
          categoryId: ""
        },
  });

  // Update default currency if settings change and it's a new expense form
  useEffect(() => {
    if (!expense && !isDataLoading) {
      form.reset({ 
        date: new Date(), 
        originalAmount: undefined, 
        originalCurrency: settings.defaultCurrency, 
        description: "",
        categoryId: ""
      });
    }
  }, [settings.defaultCurrency, expense, form, isDataLoading]);


  async function onSubmit(values: ExpenseFormValues) {
    if (expense) { // Editing existing expense
      const updatedExpenseData: Expense = {
        ...expense, // Retain ID and potentially unchanged amounts
        date: values.date.toISOString(),
        categoryId: values.categoryId,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        description: values.description,
        // amounts will be recalculated by the server action if originalAmount/Currency changed
      };
      await updateExpense(updatedExpenseData);
      toast({ title: "Expense Updated", description: "Your expense has been successfully updated." });
    } else { // Adding new expense
      const newExpenseData = {
        date: values.date.toISOString(),
        categoryId: values.categoryId,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        description: values.description,
      };
      await addExpense(newExpenseData);
      toast({ title: "Expense Added", description: "New expense has been successfully added." });
    }
    onSave();
    form.reset({ 
        date: new Date(), 
        categoryId: '', 
        originalAmount: undefined, 
        originalCurrency: settings.defaultCurrency, 
        description: '' 
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex gap-4">
            <FormField
            control={form.control}
            name="originalAmount"
            render={({ field }) => (
                <FormItem className="flex-grow">
                <FormLabel>Amount</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="0.00" {...field} step="0.01" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="originalCurrency"
            render={({ field }) => (
                <FormItem className="w-[120px]">
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                        {currency}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Lunch with colleagues" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {expense ? "Save Changes" : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
