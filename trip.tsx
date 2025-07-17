import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Plus, 
  Users, 
  MapPin, 
  Bell, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Package,
  DollarSign,
  ShoppingCart,
  Plane,
  Hotel,
  Utensils,
  Star,
  Trash2,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CalendarGrid } from "@/components/calendar-grid";
import { ActivityCard } from "@/components/activity-card";
import { AddActivityModal } from "@/components/add-activity-modal";
import { InviteLinkModal } from "@/components/invite-link-modal";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { PackingList } from "@/components/packing-list";
import { ExpenseTracker } from "@/components/expense-tracker";
import { GroceryList } from "@/components/grocery-list";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationIcon } from "@/components/notification-icon";
import { LeaveTripButton } from "@/components/leave-trip-button";
import type { TripWithDetails, ActivityWithDetails } from "@shared/schema";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export default function Trip() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: trip, isLoading: tripLoading, error: tripError } = useQuery<TripWithDetails>({
    queryKey: ["/api/trips", id],
    enabled: !!id && isAuthenticated,
    retry: false,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: [`/api/trips/${id}/activities`],
    enabled: !!id && isAuthenticated,
    retry: false,
  });

  // Handle errors
  useEffect(() => {
    if (tripError) {
      const errorMessage = (tripError as any)?.message || "";
      
      if (isUnauthorizedError(tripError as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else if (errorMessage.includes("no longer a member")) {
        toast({
          title: "Access Denied", 
          description: "You are no longer a member of this trip",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      }
    }
  }, [tripError, toast, setLocation]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!trip || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join_trip',
        userId: user.id,
        tripId: trip.id
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'activity_created' || 
          message.type === 'activity_accepted' || 
          message.type === 'activity_declined') {
        // Refresh activities
        queryClient.invalidateQueries({ queryKey: ["/api/trips", id, "activities"] });
      }
    };

    return () => socket.close();
  }, [trip, user, id, queryClient]);

  const acceptActivityMutation = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to accept activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${id}/activities`] });
      toast({
        title: "Activity accepted!",
        description: "Added to your personal calendar",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept activity",
        variant: "destructive",
      });
    },
  });

  const declineActivityMutation = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/accept`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to decline activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${id}/activities`] });
      toast({
        title: "Activity declined",
        description: "Removed from your calendar",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to decline activity",
        variant: "destructive",
      });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete trip');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Deleted",
        description: "The trip has been permanently deleted for all members.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setLocation('/');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const getFilteredActivities = () => {
    if (!activities) return [];
    
    // For group calendar view, show ALL activities regardless of response status
    // This allows everyone to see what everyone else is doing, even if they're not participating
    let filteredActivities = activities;
    
    if (categoryFilter === "all") return filteredActivities;
    return filteredActivities.filter(activity => activity.category === categoryFilter);
  };

  const getMySchedule = () => {
    if (!activities || !user) return [];
    return activities.filter(activity => activity.isAccepted);
  };

  if (authLoading || tripLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <p className="text-neutral-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Trip not found</h1>
            <p className="text-neutral-600 mb-4">
              The trip you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => setLocation("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Mobile Navigation */}
      <MobileNav 
        trip={trip}
        user={user}
        onAddActivity={() => setShowAddActivity(true)}
      />

      {/* Desktop Sidebar */}
      <Sidebar 
        trip={trip}
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Trip Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900">
                  {trip.name}
                </h1>
                <div className="flex flex-wrap items-center mt-2 space-x-6 text-sm text-neutral-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{trip.destination}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="flex items-center cursor-pointer hover:text-primary transition-colors">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{trip.memberCount} members</span>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Trip Members
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {trip.members.map((member, index) => (
                          <div key={member.user.id}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                {member.user.firstName?.[0] || member.user.email?.[0] || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {member.user.firstName} {member.user.lastName}
                                  </p>
                                  {member.user.id === trip.createdBy && (
                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                      Creator
                                    </Badge>
                                  )}
                                  {member.role === 'organizer' && member.user.id !== trip.createdBy && (
                                    <Badge variant="secondary" className="text-xs">
                                      Organizer
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                  <span>{member.user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  {member.user.cashAppUsername && (
                                    <Badge variant="outline" className="text-xs">
                                      CashApp: ${member.user.cashAppUsername}
                                    </Badge>
                                  )}
                                  {member.user.venmoUsername && (
                                    <Badge variant="outline" className="text-xs">
                                      Venmo: @{member.user.venmoUsername}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {index < trip.members.length - 1 && <div className="border-t border-gray-100 my-2" />}
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <NotificationIcon />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  data-onboarding="invite-button"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Invite Members
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/trip/${trip.id}/members`)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Member Schedules
                </Button>
                <Button 
                  onClick={() => setShowAddActivity(true)}
                  className="bg-primary hover:bg-red-600 text-white"
                  size="sm"
                  data-onboarding="add-activity"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </Button>
                <LeaveTripButton trip={trip} user={user} />
                
                {/* Delete Trip Button (Creator Only) */}
                {user?.id === trip.createdBy && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive"
                        size="sm"
                        disabled={deleteTripMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Trip
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this trip? This action will permanently remove the trip and all its data for all members. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteTripMutation.mutate(trip.id)}
                          disabled={deleteTripMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleteTripMutation.isPending ? "Deleting..." : "Delete Trip"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Calendar Controls */}
        <div className="bg-white px-4 lg:px-8 py-4 border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList className="bg-gray-100" data-onboarding="discover-tabs">
                    <TabsTrigger value="calendar">Group Calendar</TabsTrigger>
                    <TabsTrigger value="schedule" data-onboarding="personal-schedule">My Schedule</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="packing" data-onboarding="packing-tab">Packing</TabsTrigger>
                    <TabsTrigger value="expenses" data-onboarding="expenses-tab">Expenses</TabsTrigger>
                    <TabsTrigger value="groceries">Groceries</TabsTrigger>
                    <TabsTrigger value="flights">Flights</TabsTrigger>
                    <TabsTrigger value="hotels">Hotels</TabsTrigger>
                    <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {activeTab === "calendar" && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-neutral-900 min-w-[120px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="food">Food & Dining</option>
                  <option value="sightseeing">Sightseeing</option>
                  <option value="transport">Transportation</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="shopping">Shopping</option>
                  <option value="culture">Culture</option>
                  <option value="outdoor">Outdoor</option>
                </select>
                <Button variant="ghost" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="calendar" className="mt-0">
                <CalendarGrid
                  currentMonth={currentMonth}
                  activities={getFilteredActivities()}
                  trip={trip}
                  selectedDate={selectedDate}
                  onDayClick={(date) => {
                    setSelectedDate(date);
                    setShowAddActivity(true);
                  }}
                />
                
                {/* Recent Activities */}
                <div className="mt-8">
                  <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-neutral-900">Recent Activities</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {getFilteredActivities().slice(0, 5).map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          currentUser={user}
                          onAccept={() => acceptActivityMutation.mutate(activity.id)}
                          onDecline={() => declineActivityMutation.mutate(activity.id)}
                          isLoading={acceptActivityMutation.isPending || declineActivityMutation.isPending}
                        />
                      ))}
                      {getFilteredActivities().length === 0 && (
                        <div className="p-8 text-center">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-neutral-900 mb-2">No activities yet</h3>
                          <p className="text-neutral-600 mb-4">Be the first to add an activity to this trip!</p>
                          <Button 
                            onClick={() => setShowAddActivity(true)}
                            className="bg-primary hover:bg-red-600 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Activity
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                {/* Personal Calendar View */}
                <Card className="mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900">My Personal Calendar</h2>
                        <p className="text-sm text-neutral-600">Visual calendar of your accepted activities</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-neutral-900 min-w-[120px] text-center">
                          {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <CalendarGrid
                      currentMonth={currentMonth}
                      activities={getMySchedule()}
                      trip={trip}
                      selectedDate={selectedDate}
                      onDayClick={(date) => {
                        setSelectedDate(date);
                        setShowAddActivity(true);
                      }}
                    />
                  </div>
                </Card>

                {/* Personal Schedule List */}
                <Card>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-neutral-900">My Activity List</h2>
                    <p className="text-sm text-neutral-600">Detailed list of your confirmed activities</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {getMySchedule().map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        currentUser={user}
                        onAccept={() => acceptActivityMutation.mutate(activity.id)}
                        onDecline={() => declineActivityMutation.mutate(activity.id)}
                        isLoading={acceptActivityMutation.isPending || declineActivityMutation.isPending}
                        isScheduleView={true}
                      />
                    ))}
                    {getMySchedule().length === 0 && (
                      <div className="p-8 text-center">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">No activities in your schedule</h3>
                        <p className="text-neutral-600 mb-4">Accept activities from the group calendar to see them here!</p>
                        <Button 
                          onClick={() => setActiveTab("calendar")}
                          variant="outline"
                        >
                          View Group Calendar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Activities</h2>
                      <p className="text-sm text-neutral-600">Discover and book activities for your trip</p>
                    </div>
                    <Button 
                      onClick={() => setLocation(`/trip/${id}/activities`)}
                      className="bg-primary hover:bg-red-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Explore Activities
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">
                          Discover Activities in {trip.destination}
                        </h3>
                        <p className="text-neutral-600 mb-4">
                          Find tours, attractions, restaurants, and experiences to share with your group
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Sightseeing</span>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Dining</span>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <ShoppingCart className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Shopping</span>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Users className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Events</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => setLocation(`/trip/${id}/activities`)}
                          className="bg-primary hover:bg-red-600 text-white"
                        >
                          Start Exploring
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

<TabsContent value="packing" className="mt-0">
                <PackingList tripId={parseInt(id || "0")} />
              </TabsContent>

              <TabsContent value="expenses" className="mt-0">
                <ExpenseTracker tripId={parseInt(id || "0")} user={user} />
              </TabsContent>

              <TabsContent value="groceries" className="mt-0">
                <GroceryList tripId={parseInt(id || "0")} user={user} />
              </TabsContent>

              <TabsContent value="flights" className="mt-0">
                <FlightCoordination tripId={parseInt(id || "0")} user={user} />
              </TabsContent>
              
              <TabsContent value="hotels" className="mt-0">
                <HotelBooking tripId={parseInt(id || "0")} user={user} />
              </TabsContent>
              
              <TabsContent value="restaurants" className="mt-0">
                <RestaurantBooking tripId={parseInt(id || "0")} user={user} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Leave Trip Section */}
        {user && trip && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 border-t border-gray-200 mt-8">
            <div className="bg-red-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Leave Trip</h3>
              <p className="text-red-700 mb-4">
                {trip.createdBy === user.id 
                  ? "As the trip creator, you manage this trip for everyone. You cannot leave, but you can delete the entire trip if needed."
                  : "No longer able to join this trip? You can leave the group, but you won't be able to rejoin without a new invitation."
                }
              </p>
              <LeaveTripButton trip={trip} user={user} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button 
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center py-2 ${activeTab === "calendar" ? "text-primary" : "text-neutral-600"}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Group</span>
          </button>
          <button 
            onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center py-2 ${activeTab === "schedule" ? "text-primary" : "text-neutral-600"}`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs mt-1">Personal</span>
          </button>

          <button 
            onClick={() => setActiveTab("packing")}
            className={`flex flex-col items-center py-2 ${activeTab === "packing" ? "text-primary" : "text-neutral-600"}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs mt-1">Packing</span>
          </button>
          <button 
            onClick={() => setActiveTab("expenses")}
            className={`flex flex-col items-center py-2 ${activeTab === "expenses" ? "text-primary" : "text-neutral-600"}`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs mt-1">Expenses</span>
          </button>
          <button 
            onClick={() => setActiveTab("flights")}
            className={`flex flex-col items-center py-2 ${activeTab === "flights" ? "text-primary" : "text-neutral-600"}`}
          >
            <Plane className="w-5 h-5" />
            <span className="text-xs mt-1">Flights</span>
          </button>
          <button 
            onClick={() => setActiveTab("hotels")}
            className={`flex flex-col items-center py-2 ${activeTab === "hotels" ? "text-primary" : "text-neutral-600"}`}
          >
            <Hotel className="w-5 h-5" />
            <span className="text-xs mt-1">Hotels</span>
          </button>
          <button 
            onClick={() => setShowAddActivity(true)}
            className="flex flex-col items-center py-2 text-neutral-600"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-1">
              <Plus className="text-white w-4 h-4" />
            </div>
            <span className="text-xs text-primary font-medium">Add</span>
          </button>
        </div>
      </div>

      <AddActivityModal
        open={showAddActivity}
        onOpenChange={(open) => {
          setShowAddActivity(open);
          if (!open) {
            setSelectedDate(null);
          }
        }}
        tripId={parseInt(id || "0")}
        selectedDate={selectedDate}
      />

      {trip && (
        <InviteLinkModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          trip={trip}
        />
      )}
    </div>
  );
}

// Helper function for formatting flight duration
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Flight Coordination Component
function FlightCoordination({ tripId, user }: { tripId: number; user: any }) {
  const [, setLocation] = useLocation();
  const { data: flights, isLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/flights`],
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Flight Coordination</h2>
          <p className="text-gray-600">Coordinate flights with your group</p>
        </div>
        <Button 
          onClick={() => {
            setLocation(`/trip/${tripId}/flights`);
          }}
          className="bg-primary hover:bg-red-600 text-white"
        >
          <Plane className="w-4 h-4 mr-2" />
          Manage Flights
        </Button>
      </div>

      {flights && flights.length > 0 ? (
        <div className="grid gap-4">
          {flights.slice(0, 3).map((flight: any) => (
            <Card key={flight.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{flight.airline}</span>
                      <Badge variant="secondary">{flight.flightNumber}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{flight.departureCode} → {flight.arrivalCode}</div>
                      <div>{format(new Date(flight.departureTime), 'MMM d, p')}</div>
                      <div className="text-xs">
                        {flight.user.firstName} {flight.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      {flight.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {flights.length > 3 && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/trip/${tripId}/flights`)}
              >
                View All {flights.length} Flights
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Plane className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No flights added yet</h3>
            <p className="text-neutral-600 mb-4">
              Start coordinating flights with your group members
            </p>
            <Button 
              onClick={() => setLocation(`/trip/${tripId}/flights`)}
              className="bg-primary hover:bg-red-600 text-white"
            >
              <Plane className="w-4 h-4 mr-2" />
              Add First Flight
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hotel Booking Component
function HotelBooking({ tripId, user }: { tripId: number; user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    maxPrice: '',
    minRating: '',
    sortBy: 'price'
  });

  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
  });

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/hotels`],
    enabled: !!tripId,
  });

  // Generate sample hotels for testing
  const generateSampleHotels = (destination: string) => {
    const destLower = destination.toLowerCase();
    
    if (destLower.includes('tokyo') || destLower.includes('japan')) {
      return [
        {
          id: 'sample-1',
          name: 'Park Hyatt Tokyo',
          rating: 4.8,
          price: '$450',
          pricePerNight: '$450',
          location: 'Shinjuku, Tokyo',
          amenities: 'Spa, Pool, Fine Dining, City Views',
          platform: 'Amadeus',
          bookingUrl: `https://www.booking.com/searchresults.html?ss=tokyo&checkin=${new Date(trip.startDate).toISOString().split('T')[0]}&checkout=${new Date(trip.endDate).toISOString().split('T')[0]}`
        },
        {
          id: 'sample-2', 
          name: 'The Ritz-Carlton Tokyo',
          rating: 4.7,
          price: '$380',
          pricePerNight: '$380',
          location: 'Roppongi, Tokyo',
          amenities: 'Spa, Multiple Restaurants, Club Access',
          platform: 'Booking.com',
          bookingUrl: `https://www.booking.com/searchresults.html?ss=tokyo&checkin=${new Date(trip.startDate).toISOString().split('T')[0]}&checkout=${new Date(trip.endDate).toISOString().split('T')[0]}`
        },
        {
          id: 'sample-3',
          name: 'Shibuya Sky Hotel',
          rating: 4.3,
          price: '$180',
          pricePerNight: '$180',
          location: 'Shibuya, Tokyo',
          amenities: 'WiFi, Breakfast, Modern Rooms',
          platform: 'Hotels.com',
          bookingUrl: `https://www.hotels.com/search.do?q-destination=tokyo&q-check-in=${new Date(trip.startDate).toISOString().split('T')[0]}&q-check-out=${new Date(trip.endDate).toISOString().split('T')[0]}`
        }
      ];
    }
    
    return [
      {
        id: 'sample-generic-1',
        name: `Grand Hotel ${destination}`,
        rating: 4.2,
        price: '$220',
        pricePerNight: '$220',
        location: destination,
        amenities: 'WiFi, Restaurant, Fitness Center',
        platform: 'Amadeus',
        bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`
      },
      {
        id: 'sample-generic-2',
        name: `City Inn ${destination}`,
        rating: 4.0,
        price: '$150',
        pricePerNight: '$150',
        location: destination,
        amenities: 'WiFi, Breakfast, Central Location',
        platform: 'Booking.com',
        bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`
      }
    ];
  };

  // Hotel search function
  const searchHotels = async () => {
    if (!trip || !trip.destination || !trip.startDate || !trip.endDate) {
      toast({
        title: "Search Error",
        description: "Trip information is missing for hotel search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setShowSearch(true);

    try {
      // For now, let's show sample hotels for the destination if API fails
      const sampleHotels = generateSampleHotels(trip.destination);
      setSearchResults(sampleHotels);
      
      toast({
        title: "Hotels Found",
        description: `Showing sample hotels for ${trip.destination}. Live search temporarily unavailable.`,
      });
    } catch (error) {
      console.error("Hotel search error:", error);
      
      // For now, let's show sample hotels for the destination if API fails
      const sampleHotels = generateSampleHotels(trip.destination);
      setSearchResults(sampleHotels);
      setShowSearch(true);
      
      toast({
        title: "Hotel Search",
        description: `Showing sample hotels for ${trip.destination}. Live search temporarily unavailable.`,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add searched hotel to user's hotel list
  const addSearchedHotel = (hotel) => {
    setEditingHotel(null);
    setIsDialogOpen(true);
    // Pre-fill form with hotel data
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
        const locationInput = form.querySelector('input[name="location"]') as HTMLInputElement;
        const totalPriceInput = form.querySelector('input[name="totalPrice"]') as HTMLInputElement;
        
        if (nameInput) nameInput.value = hotel.name;
        if (locationInput) locationInput.value = hotel.location;
        if (totalPriceInput) totalPriceInput.value = hotel.price;
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Hotels</h2>
          <p className="text-gray-600">Search and coordinate hotel bookings with your group</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSearch(!showSearch)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {showSearch ? "Hide Search" : "Search Hotels"}
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-primary hover:bg-red-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hotel
          </Button>
        </div>
      </div>

      {/* Hotel Search Section */}
      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Search Hotels in {trip?.destination}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                <input
                  placeholder="Max Price ($)"
                  value={searchFilters.maxPrice}
                  onChange={(e) => setSearchFilters({ ...searchFilters, maxPrice: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                />
                <select
                  value={searchFilters.minRating}
                  onChange={(e) => setSearchFilters({ ...searchFilters, minRating: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
                <select
                  value={searchFilters.sortBy}
                  onChange={(e) => setSearchFilters({ ...searchFilters, sortBy: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="price">Price (Low to High)</option>
                  <option value="rating">Rating (High to Low)</option>
                </select>
              </div>
              <Button onClick={searchHotels} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search Hotels"}
              </Button>
            </div>
            
            {trip && (
              <div className="text-sm text-muted-foreground">
                Searching for hotels in {trip.destination} from {format(new Date(trip.startDate), 'MMM d')} to {format(new Date(trip.endDate), 'MMM d')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Available Hotels ({searchResults.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hotels for {trip?.destination} • {trip && format(new Date(trip.startDate), 'MMM d')} - {trip && format(new Date(trip.endDate), 'MMM d')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {searchResults.map((hotel, index) => (
                <Card key={index} className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-semibold">{hotel.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                          <MapPin className="h-4 w-4" />
                          {hotel.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{hotel.rating}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Price:</span>
                        <span className="text-lg font-bold text-green-600">{hotel.price}</span>
                      </div>
                      {hotel.pricePerNight && hotel.pricePerNight !== hotel.price && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Per Night:</span>
                          <span className="text-sm font-medium text-green-600">{hotel.pricePerNight}</span>
                        </div>
                      )}
                    </div>
                    
                    {hotel.amenities && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Amenities:</span>
                        <p className="text-sm text-gray-600 leading-relaxed">{hotel.amenities}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="text-xs">
                        {hotel.platform}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(hotel.bookingUrl, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addSearchedHotel(hotel)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Trip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Hotels */}
      {hotels && hotels.length > 0 ? (
        <div className="grid gap-4">
          {hotels.map((hotel: any) => (
            <Card key={hotel.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{hotel.name}</span>
                      {hotel.rating && (
                        <div className="flex items-center">
                          {Array.from({ length: hotel.rating }, (_, i) => (
                            <span key={i} className="text-yellow-400">★</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {hotel.location}
                      </div>
                      <div className="mt-1">
                        {format(new Date(hotel.checkInDate), 'MMM d')} - {format(new Date(hotel.checkOutDate), 'MMM d')}
                      </div>
                      <div className="text-xs mt-1">
                        {hotel.user.firstName} {hotel.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hotel.totalPrice && (
                      <div className="text-sm font-semibold text-green-600">
                        {hotel.totalPrice}
                      </div>
                    )}
                    {hotel.roomType && (
                      <Badge variant="secondary" className="mt-1">
                        {hotel.roomType}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Hotel className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No hotels added yet</h3>
            <p className="text-neutral-600 mb-4">
              Search for hotels or add your hotel bookings to coordinate accommodations with your group.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => setShowSearch(true)}
                variant="outline"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Search Hotels
              </Button>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-red-600 text-white"
              >
                <Hotel className="w-4 h-4 mr-2" />
                Add Hotel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Restaurant Booking Component
function RestaurantBooking({ tripId, user }: { tripId: number; user: any }) {
  const [, setLocation] = useLocation();
  const { data: restaurants, isLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/restaurants`],
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Restaurant Reservations</h2>
          <p className="text-gray-600">Coordinate restaurant bookings with your group</p>
        </div>
        <Button 
          onClick={() => {
            setLocation(`/trip/${tripId}/restaurants`);
          }}
          className="bg-primary hover:bg-red-600 text-white"
        >
          <Utensils className="w-4 h-4 mr-2" />
          Manage Restaurants
        </Button>
      </div>

      {restaurants && restaurants.length > 0 ? (
        <div className="grid gap-4">
          {restaurants.slice(0, 3).map((restaurant: any) => (
            <Card key={restaurant.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{restaurant.name}</span>
                      <Badge variant="secondary">{restaurant.cuisine}</Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {restaurant.rating}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {restaurant.address}
                      </div>
                      <div className="mt-1">
                        {format(new Date(restaurant.reservationDate), 'MMM d')} at {restaurant.reservationTime}
                      </div>
                      <div className="text-xs mt-1">
                        {restaurant.user.firstName} {restaurant.user.lastName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {restaurant.priceRange}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {restaurant.partySize} people
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {restaurants.length > 3 && (
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/trip/${tripId}/restaurants`)}
              >
                View All {restaurants.length} Restaurants
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No restaurants added yet</h3>
            <p className="text-neutral-600 mb-4">
              Search for restaurants and add reservations to coordinate dining with your group.
            </p>
            <Button 
              onClick={() => setLocation(`/trip/${tripId}/restaurants`)}
              className="bg-primary hover:bg-red-600 text-white"
            >
              <Utensils className="w-4 h-4 mr-2" />
              Find Restaurants
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
