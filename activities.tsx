import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Star, 
  Clock, 
  MapPin, 
  DollarSign, 
  ExternalLink,
  Users,
  Calendar,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { TripWithDetails } from "@shared/schema";

interface Activity {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  price: string;
  duration: string;
  rating: number;
  bookingUrl: string;
  provider?: string;
}

export default function Activities() {
  const { tripId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  // Get trip data
  const { data: trip, isLoading: tripLoading } = useQuery<TripWithDetails>({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId && isAuthenticated,
    retry: false,
  });

  // Get activities
  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities/discover", tripId, searchTerm, selectedCategory, priceRange, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        tripId: tripId!,
        searchTerm,
        category: selectedCategory,
        priceRange,
        sortBy
      });
      
      const response = await fetch(`/api/activities/discover?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch activities');
      }
      
      return response.json();
    },
    enabled: !!tripId && isAuthenticated,
    retry: false,
  });

  const handleProposeActivity = async (activity: Activity) => {
    try {
      // Get current date and time
      const now = new Date();
      const startDate = now.toISOString().split('T')[0]; // Today's date
      const startTime = "12:00"; // Default time
      
      // Combine date and time into ISO string
      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
      
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: activity.name,
          description: activity.description,
          location: activity.location,
          startTime: startDateTime, // Send as ISO string
          endTime: null,
          category: activity.category,
          cost: activity.price ? parseFloat(activity.price) : null,
          maxCapacity: 10,
          tripCalendarId: parseInt(tripId),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to propose activity');
      }

      toast({
        title: "Activity proposed!",
        description: "Your group can now see and accept this activity.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to propose activity",
        variant: "destructive",
      });
    }
  };

  if (authLoading || tripLoading || activitiesLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="text-white w-6 h-6" />
          </div>
          <p className="text-neutral-600">Loading activities...</p>
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation(`/trip/${tripId}`)}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Activities in {trip.destination}
                  {activities && activities.length > 0 && (
                    <span className="text-lg font-normal text-neutral-500 ml-2">
                      ({activities.length} authentic activities available)
                    </span>
                  )}
                </h1>
                <p className="text-neutral-600">
                  Discover authentic experiences powered by Amadeus Global Distribution System
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sightseeing">Sightseeing</SelectItem>
                <SelectItem value="food">Food & Dining</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="nature">Nature</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-25">$0 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100-200">$100 - $200</SelectItem>
                <SelectItem value="200+">$200+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {activities && activities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {activities.slice(0, displayCount).map((activity) => (
              <Card 
                key={activity.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
                onClick={() => {
                  setSelectedActivity(activity);
                  setShowDetailsDialog(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base lg:text-lg leading-tight flex-1 min-w-0">
                        {activity.name}
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm text-neutral-600">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span>{activity.rating}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="truncate">{activity.duration}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge 
                          variant="secondary" 
                          className="capitalize text-xs"
                        >
                          {activity.category}
                        </Badge>
                        {activity.provider === 'Amadeus' && (
                          <Badge variant="outline" className="text-xs">
                            Amadeus
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 pt-2">
                  <div className="flex-1 space-y-3">
                    <p className="text-neutral-600 text-sm line-clamp-3 leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center text-sm text-neutral-600">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{activity.location}</span>
                    </div>
                    
                    {/* Price Section */}
                    <div className="flex items-center text-lg lg:text-xl font-bold text-green-600">
                      <DollarSign className="w-5 h-5 mr-1" />
                      <span>{activity.price}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons - Always at bottom */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProposeActivity(activity);
                      }}
                      className="w-full bg-primary hover:bg-red-600 text-white text-xs lg:text-sm"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Propose to Group
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(activity);
                        setShowBookingDialog(true);
                      }}
                      className="w-full text-xs lg:text-sm"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
            
            {/* Load More Button */}
            {activities.length > displayCount && (
              <div className="text-center mt-8">
                <Button
                  onClick={() => {
                    setIsLoadingMore(true);
                    // Simulate loading delay for better UX
                    setTimeout(() => {
                      setDisplayCount(prev => Math.min(prev + 20, activities.length));
                      setIsLoadingMore(false);
                    }, 500);
                  }}
                  disabled={isLoadingMore}
                  variant="outline"
                  size="lg"
                >
                  {isLoadingMore ? (
                    <>Loading...</>
                  ) : (
                    <>
                      Load More Activities ({Math.min(20, activities.length - displayCount)} of {activities.length - displayCount} remaining)
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Activities Counter */}
            <div className="text-center mt-4 text-sm text-neutral-600">
              Showing {Math.min(displayCount, activities.length)} of {activities.length} authentic activities from Amadeus
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              No activities found
            </h3>
            <p className="text-neutral-600 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setPriceRange("all");
                setSortBy("popularity");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Activity Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>
              View complete activity information and booking options
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-xl mb-2">{selectedActivity.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-neutral-600 mb-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span>{selectedActivity.rating}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{selectedActivity.duration}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="font-semibold text-green-600">${selectedActivity.price}</span>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {selectedActivity.category}
                  </Badge>
                </div>
                <div className="flex items-center mb-4 text-sm text-neutral-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{selectedActivity.location}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                  {selectedActivity.description}
                </p>
              </div>
              
              <div className="border-t pt-4 flex space-x-3">
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleProposeActivity(selectedActivity);
                  }}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Propose to Group
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowBookingDialog(true);
                  }}
                  className="flex-1"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Activity</DialogTitle>
            <DialogDescription>
              Proceed to authentic booking platform
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedActivity.name}</h3>
                <p className="text-sm text-neutral-600 mb-2">{selectedActivity.location}</p>
                <div className="flex items-center space-x-4 text-sm text-neutral-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span>{selectedActivity.rating}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{selectedActivity.duration}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="font-semibold">${selectedActivity.price}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-neutral-600 mb-4">
                  This authentic activity is provided by Amadeus Global Distribution System. You'll be redirected to complete your reservation.
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBookingDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      window.open(selectedActivity.bookingUrl, '_blank');
                      setShowBookingDialog(false);
                      toast({
                        title: "Redirecting to Amadeus booking platform",
                        description: "Opening the authentic booking page in a new tab...",
                      });
                    }}
                    className="flex-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Continue to Book
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}