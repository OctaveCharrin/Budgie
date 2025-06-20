
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
import type { Subscription, CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Subscription name is required."),
  startDate: z.date({ required_error: "Start date is required." }),
  categoryId: z.string().min(1, "Category is required."),
  originalAmount: z.coerce.number().positive("Amount must be positive."),
  originalCurrency: z.enum(SUPPORTED_CURRENCIES, { required_error: "Currency is required." }),
  description: z.string().optional(),
});

type SubscriptionFormValues = z.infer<typeof formSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSave: () => void; 
}

export function SubscriptionForm({ subscription, onSave }: SubscriptionFormProps) {
  const { categories, addSubscription, updateSubscription, settings, isLoading: isDataLoading } = useData();
  const { toast } = useToast();

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: subscription
      ? { 
          name: subscription.name,
          startDate: new Date(subscription.startDate), 
          categoryId: subscription.categoryId,
          originalAmount: Number(subscription.originalAmount), 
          originalCurrency: subscription.originalCurrency,
          description: subscription.description || "" 
        }
      : { 
          name: "",
          startDate: new Date(), 
          originalAmount: '' as unknown as number, // Initialize with empty string
          originalCurrency: settings.defaultCurrency, 
          description: "",
          categoryId: ""
        },
  });

  useEffect(() => {
    if (!subscription && !isDataLoading && settings.defaultCurrency) {
      form.reset({ 
        name: "",
        startDate: new Date(), 
        originalAmount: '' as unknown as number, // Reset with empty string
        originalCurrency: settings.defaultCurrency, 
        description: "",
        categoryId: ""
      });
    }
  }, [settings.defaultCurrency, subscription, form, isDataLoading]);


  async function onSubmit(values: SubscriptionFormValues) {
    if (subscription) { 
      const updatedSubscriptionData: Subscription = {
        ...subscription, 
        name: values.name,
        startDate: values.startDate.toISOString(),
        categoryId: values.categoryId,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        description: values.description,
      };
      await updateSubscription(updatedSubscriptionData);
      toast({ title: "Subscription Updated", description: "Subscription details have been successfully updated." });
    } else { 
      const newSubscriptionData = {
        name: values.name,
        startDate: values.startDate.toISOString(),
        categoryId: values.categoryId,
        originalAmount: values.originalAmount,
        originalCurrency: values.originalCurrency,
        description: values.description,
      };
      await addSubscription(newSubscriptionData as Omit<Subscription, 'id' | 'amounts'> & { originalAmount: number; originalCurrency: CurrencyCode; name: string; categoryId: string; startDate: string; description?: string; });
      toast({ title: "Subscription Added", description: "New subscription has been successfully added." });
    }
    onSave();
    form.reset({ 
        name: "",
        startDate: new Date(), 
        categoryId: '', 
        originalAmount: '' as unknown as number, // Reset with empty string
        originalCurrency: settings.defaultCurrency, 
        description: '' 
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Netflix, Gym Membership" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
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
                <FormLabel>Monthly Amount</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="0.00" {...field} step="0.01" value={field.value === undefined || isNaN(field.value) ? '' : field.value} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || settings.defaultCurrency}>
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
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
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
                <Textarea placeholder="e.g., Premium plan" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {subscription ? "Save Changes" : "Add Subscription"}
        </Button>
      </form>
    </Form>
  );
}
