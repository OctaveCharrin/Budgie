
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
import { useData } from "@/contexts/data-context";
import type { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconDisplay } from "@/components/icon-display";

const lucideIconNames = Object.keys(LucideIcons)
  .filter(
    (key) =>
      key !== 'default' && // Often 'default' is the module itself or a specific export
      key !== 'createLucideIcon' &&
      key !== 'icons' && // This is the object with SVG data, not components
      typeof (LucideIcons as any)[key] === 'function' && // Icon components are functions
      /^[A-Z]/.test(key) // Conventionally, React components are PascalCase
  )
  .sort();


const formSchema = z.object({
  name: z.string().min(1, "Category name is required."),
  icon: z.string().min(1, "Icon is required."),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  category?: Category;
  onSave: () => void;
}

export function CategoryForm({ category, onSave }: CategoryFormProps) {
  const { addCategory, updateCategory } = useData();
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category || { name: "", icon: "Package" },
  });

  function onSubmit(values: CategoryFormValues) {
    if (category) {
      updateCategory({ ...values, id: category.id });
      toast({ title: "Category Updated", description: "Category has been successfully updated." });
    } else {
      addCategory(values);
      toast({ title: "Category Added", description: "New category has been successfully added." });
    }
    onSave();
    form.reset({ name: "", icon: "Package" });
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
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-72">
                  {lucideIconNames.map((iconName) => (
                    <SelectItem key={iconName} value={iconName}>
                      <div className="flex items-center">
                        <IconDisplay name={iconName} className="mr-2 h-4 w-4" />
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
