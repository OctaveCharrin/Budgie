
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
import { useData } from "@/contexts/data-context";
import type { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from 'lucide-react';
import { IconDisplay } from "@/components/icon-display";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Category name is required."),
  icon: z.string().min(1, "Icon is required."),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  category?: Category;
  onSave: () => void;
}

// Refined filter for lucideIconNames
const lucideIconNames = Object.keys(LucideIcons)
  .filter(key => {
    const component = (LucideIcons as any)[key];
    // Check if it's a function (React components are)
    // and if its displayName (set by Lucide's createLucideIcon) matches the export key.
    // Also, explicitly exclude known non-icon exports.
    return typeof component === 'function' &&
           component.displayName === key &&
           key !== 'createLucideIcon' &&
           key !== 'LucideIcon' &&
           key !== 'IconNode' &&
           key !== 'default';
  })
  .sort();

export function CategoryForm({ category, onSave }: CategoryFormProps) {
  const { addCategory, updateCategory } = useData();
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category
      ? { name: category.name, icon: category.icon }
      : { name: "", icon: "DollarSign" },
  });

  function onSubmit(values: CategoryFormValues) {
    if (category) {
      updateCategory({ ...category, ...values });
      toast({ title: "Category Updated", description: "Category has been successfully updated." });
    } else {
      addCategory({ name: values.name, icon: values.icon || "DollarSign" });
      toast({ title: "Category Added", description: "New category has been successfully added." });
    }
    onSave();
    form.reset({ name: "", icon: "DollarSign" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {field.value && <IconDisplay name={field.value} className="h-4 w-4" />}
                      <SelectValue placeholder="Select an icon" />
                    </div>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {lucideIconNames.map((iconName) => (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <IconDisplay name={iconName} className="h-4 w-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {category ? "Save Changes" : "Add Category"}
        </Button>
      </form>
    </Form>
  );
}
