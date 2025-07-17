import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsSection } from "@/components/notifications-section";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Smartphone, Settings, User as UserIcon, MapPin, Plane, PlayCircle } from "lucide-react";
import { useState } from "react";

const profileFormSchema = z.object({
  cashAppUsername: z.string().optional(),
  venmoUsername: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const { resetOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartTour = () => {
    resetOnboarding();
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      cashAppUsername: user?.cashAppUsername || '',
      venmoUsername: user?.venmoUsername || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your payment app settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.profileImageUrl || undefined} />
          <AvatarFallback>
            {user.firstName?.[0] || user.email?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Configure your payment app usernames for easy expense splitting
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartTour}
              className="flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Start Tour
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Payment Apps
                </h3>
                <p className="text-sm text-gray-600">
                  Adding your payment app usernames helps group members quickly send you money 
                  when splitting expenses.
                </p>
                
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="cashAppUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CashApp Username</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                              $
                            </span>
                            <Input
                              {...field}
                              placeholder="your-cashapp-username"
                              className="rounded-l-none"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="venmoUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venmo Username</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                              @
                            </span>
                            <Input
                              {...field}
                              placeholder="your-venmo-username"
                              className="rounded-l-none"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(user.cashAppUsername || user.venmoUsername) && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Current Payment Methods:</h4>
                    <div className="flex gap-2">
                      {user.cashAppUsername && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Smartphone className="w-3 h-3 mr-1" />
                          CashApp: ${user.cashAppUsername}
                        </Badge>
                      )}
                      {user.venmoUsername && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Smartphone className="w-3 h-3 mr-1" />
                          Venmo: @{user.venmoUsername}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="min-w-32"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Location Management Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Default Location Settings
          </CardTitle>
          <CardDescription>
            Set your default departure location for flight searches and group coordination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                How this helps
              </h4>
              <p className="text-sm text-blue-700">
                When you join new trips, your location will be automatically used for flight searches. 
                You can also update this per trip if needed.
              </p>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2">Your location is set individually for each trip when you join. 
              This feature will be available in future updates for setting global defaults.</p>
              <p>For now, you can set your departure location when joining new trips.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <NotificationsSection />
      
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}