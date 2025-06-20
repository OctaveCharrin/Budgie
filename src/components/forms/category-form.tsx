
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

// Schema now only includes 'name'
const formSchema = z.object({
  name: z.string().min(1, "Category name is required."),
});

// Form values type updated
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
    // Default values only for 'name'. Icon is handled separately.
    defaultValues: category ? { name: category.name } : { name: "" },
  });

  function onSubmit(values: CategoryFormValues) {
    if (category) {
      // When updating, preserve the existing icon. Only name changes.
      updateCategory({ ...category, name: values.name });
      toast({ title: "Category Updated", description: "Category has been successfully updated." });
    } else {
      // When adding, icon is always "DollarSign"
      addCategory({ name: values.name, icon: "DollarSign" });
      toast({ title: "Category Added", description: "New category has been successfully added." });
    }
    onSave();
    form.reset({ name: "" }); // Reset only name
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
        
        {/* Icon selection FieldRemoved */}
        
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {category ? "Save Changes" : "Add Category"}
        </Button>
      </form>
    </Form>
  );
}
