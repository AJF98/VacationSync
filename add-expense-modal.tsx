import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type TripWithDetails, type User } from "@shared/schema";
import { useState } from "react";
import { DollarSign, Smartphone } from "lucide-react";

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
}

const formSchema = insertExpenseSchema.omit({ 
  tripId: true 
}).extend({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  selectedMembers: z.array(z.string()).min(1, "Select at least one member to split with"),
});

type FormData = z.infer<typeof formSchema>;

const expenseCategories = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transport', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
];

export function AddExpenseModal({ open, onOpenChange, tripId }: AddExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Get trip data to access members
  const { data: trip } = useQuery<TripWithDetails>({
    queryKey: [`/api/trips/${tripId}`],
  });

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: '',
      category: 'other',
      currency: 'USD',
      splitType: 'equal',
      activityId: undefined,
      splitData: null,
      receiptUrl: undefined,
      selectedMembers: [],
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const totalAmount = parseFloat(data.amount);
      const splitAmount = totalAmount / data.selectedMembers.length;
      
      const expenseData = {
        ...data,
        amount: totalAmount,
        tripId,
        splitData: {
          members: data.selectedMembers,
          splitAmount: splitAmount,
          splitType: 'equal'
        }
      };
      
      await apiRequest(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="What did you spend on?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
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
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Selection */}
            <FormField
              control={form.control}
              name="selectedMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Split with Members</FormLabel>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Select members to split this expense with</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {trip?.members?.map((member) => {
                        const isSelected = field.value.includes(member.user.id);
                        return (
                          <div key={member.user.id} className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-gray-50">
                            <Checkbox
                              id={member.user.id}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelection = checked
                                  ? [...field.value, member.user.id]
                                  : field.value.filter((id) => id !== member.user.id);
                                field.onChange(newSelection);
                              }}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.user.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {member.user.firstName?.[0] || member.user.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {member.user.cashAppUsername && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Smartphone className="w-3 h-3 mr-1" />
                                    ${member.user.cashAppUsername}
                                  </Badge>
                                )}
                                {member.user.venmoUsername && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Smartphone className="w-3 h-3 mr-1" />
                                    @{member.user.venmoUsername}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && field.value.length > 0 && (
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  ${(parseFloat(form.watch('amount') || '0') / field.value.length).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">per person</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment App Integration Section */}
            {form.watch('selectedMembers')?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment App Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {form.watch('selectedMembers')?.map((memberId) => {
                    const member = trip?.members?.find(m => m.user.id === memberId)?.user;
                    if (!member) return null;
                    
                    const splitAmount = (parseFloat(form.watch('amount') || '0') / form.watch('selectedMembers').length).toFixed(2);
                    
                    return (
                      <div key={memberId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={member.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.firstName?.[0] || member.email?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${splitAmount}</span>
                          <div className="flex gap-1">
                            {member.cashAppUsername && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `https://cash.app/$${member.cashAppUsername}/${splitAmount}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-xs px-2 py-1"
                              >
                                CashApp
                              </Button>
                            )}
                            {member.venmoUsername && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `https://venmo.com/${member.venmoUsername}?txn=pay&amount=${splitAmount}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-xs px-2 py-1"
                              >
                                Venmo
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="splitType"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>Split Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How to split the expense" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="equal">Split Equally</SelectItem>
                      <SelectItem value="percentage">By Percentage</SelectItem>
                      <SelectItem value="exact">Exact Amounts</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Link to receipt or photo" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}