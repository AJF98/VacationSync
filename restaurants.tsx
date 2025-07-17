import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Phone, Clock, Star, Users, ExternalLink, Search, Filter, ChefHat, DollarSign, SortAsc, Utensils, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { TripWithDetails, RestaurantWithDetails } from "@shared/schema";

const restaurantFormSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  cuisine: z.string().min(1, "Cuisine type is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  priceRange: z.string().min(1, "Price range is required"),
  rating: z.number().min(1).max(5),
  reservationDate: z.date(),
  reservationTime: z.string().min(1, "Reservation time is required"),
  partySize: z.number().min(1, "Party size must be at least 1"),
  specialRequests: z.string().optional(),
  website: z.string().url().optional(),
  openTableUrl: z.string().url().optional(),
});

type RestaurantFormData = z.infer<typeof restaurantFormSchema>;

export default function RestaurantsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search state
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCuisine, setSearchCuisine] = useState("all");
  const [searchPriceRange, setSearchPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);

  // Get trip details
  const { data: trip } = useQuery({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId,
  });

  // Get current trip restaurants
  const { data: tripRestaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "restaurants"],
    enabled: !!tripId,
  });

  // Search restaurants
  const { data: searchResults = [], isLoading: searchLoading, refetch: searchRestaurants } = useQuery({
    queryKey: ["/api/restaurants/search", searchLocation, searchCuisine, searchPriceRange, sortBy],
    enabled: false,
  });

  // Set default search location from trip
  useEffect(() => {
    if (trip && !searchLocation) {
      setSearchLocation(trip.destination);
    }
  }, [trip, searchLocation]);

  // Restaurant form
  const form = useForm<RestaurantFormData>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      name: "",
      cuisine: "",
      address: "",
      phone: "",
      priceRange: "$$",
      rating: 4.5,
      reservationDate: new Date(),
      reservationTime: "7:00 PM",
      partySize: 2,
      specialRequests: "",
      website: "",
      openTableUrl: "",
    },
  });

  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: (data: RestaurantFormData) => apiRequest(`/api/trips/${tripId}/restaurants`, "POST", data),
    onSuccess: () => {
      toast({
        title: "Restaurant Added",
        description: "Restaurant reservation has been added to your trip.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "restaurants"] });
      setShowBooking(false);
      form.reset();
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
        description: "Failed to add restaurant. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle search
  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location to search for restaurants.",
        variant: "destructive",
      });
      return;
    }
    searchRestaurants();
  };

  // Handle add restaurant from search
  const handleAddFromSearch = (restaurant: any) => {
    form.setValue("name", restaurant.name);
    form.setValue("cuisine", restaurant.cuisine);
    form.setValue("address", restaurant.address);
    form.setValue("phone", restaurant.phone || "");
    form.setValue("priceRange", restaurant.priceRange);
    form.setValue("rating", restaurant.rating);
    form.setValue("website", restaurant.website || "");
    form.setValue("openTableUrl", restaurant.openTableUrl || "");
    setSelectedRestaurant(restaurant);
    setShowBooking(true);
  };

  // Handle form submission
  const onSubmit = (data: RestaurantFormData) => {
    createRestaurantMutation.mutate(data);
  };

  // Handle unauthorized access
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Restaurant Reservations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {trip ? `Find and book restaurants for ${trip.destination}` : "Find and book restaurants"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSearch(!showSearch)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search Restaurants
          </Button>
          
          <Dialog open={showBooking} onOpenChange={setShowBooking}>
            <DialogTrigger asChild>
              <Button>
                <Utensils className="h-4 w-4 mr-2" />
                Add Restaurant
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Search Section */}
      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Restaurants
            </CardTitle>
            <CardDescription>
              Find restaurants in {trip?.destination || "your destination"} and add them to your trip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Enter city or location"
                />
              </div>
              
              <div>
                <Label htmlFor="cuisine">Cuisine Type</Label>
                <Select value={searchCuisine} onValueChange={setSearchCuisine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="japanese">Japanese</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                    <SelectItem value="thai">Thai</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="steakhouse">Steakhouse</SelectItem>
                    <SelectItem value="seafood">Seafood</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priceRange">Price Range</Label>
                <Select value={searchPriceRange} onValueChange={setSearchPriceRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="$">$ - Budget</SelectItem>
                    <SelectItem value="$$">$$ - Moderate</SelectItem>
                    <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                    <SelectItem value="$$$$">$$$$ - Very Expensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sortBy">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleSearch} 
              disabled={searchLoading}
              className="w-full sm:w-auto"
            >
              {searchLoading ? "Searching..." : "Search Restaurants"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((restaurant: any) => (
              <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4" />
                        {restaurant.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary">{restaurant.cuisine}</Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {restaurant.priceRange}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {restaurant.rating}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {restaurant.address}
                  </div>
                  
                  {restaurant.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-4 w-4" />
                      {restaurant.phone}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {restaurant.description}
                  </p>
                  
                  {restaurant.features && restaurant.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {restaurant.features.map((feature: string) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAddFromSearch(restaurant)}
                      size="sm"
                      className="flex-1"
                    >
                      Add to Trip
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(restaurant.openTableUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Current Trip Restaurants */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Restaurant Reservations</h2>
        
        {restaurantsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tripRestaurants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Utensils className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No restaurants yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Search for restaurants or add your own reservations to start planning your dining experiences.
              </p>
              <Button onClick={() => setShowSearch(true)}>
                <Search className="h-4 w-4 mr-2" />
                Search Restaurants
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripRestaurants.map((restaurant: RestaurantWithDetails) => (
              <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4" />
                        {restaurant.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary">{restaurant.cuisine}</Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {restaurant.priceRange}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {restaurant.rating}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {restaurant.address}
                  </div>
                  
                  {restaurant.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-4 w-4" />
                      {restaurant.phone}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(restaurant.reservationDate), "PPP")}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    {restaurant.reservationTime}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    {restaurant.partySize} people
                  </div>
                  
                  {restaurant.specialRequests && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Special Requests:</strong> {restaurant.specialRequests}
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {restaurant.openTableUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(restaurant.openTableUrl, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        OpenTable
                      </Button>
                    )}
                    
                    {restaurant.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(restaurant.website, '_blank')}
                        className="flex-1"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Restaurant Reservation</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter restaurant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cuisine" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="american">American</SelectItem>
                          <SelectItem value="italian">Italian</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                          <SelectItem value="chinese">Chinese</SelectItem>
                          <SelectItem value="mexican">Mexican</SelectItem>
                          <SelectItem value="indian">Indian</SelectItem>
                          <SelectItem value="thai">Thai</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="steakhouse">Steakhouse</SelectItem>
                          <SelectItem value="seafood">Seafood</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter restaurant address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Range</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select price range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="$">$ - Budget</SelectItem>
                          <SelectItem value="$$">$$ - Moderate</SelectItem>
                          <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                          <SelectItem value="$$$$">$$$$ - Very Expensive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="reservationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Reservation Date</FormLabel>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reservationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                          <SelectItem value="5:30 PM">5:30 PM</SelectItem>
                          <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                          <SelectItem value="6:30 PM">6:30 PM</SelectItem>
                          <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                          <SelectItem value="7:30 PM">7:30 PM</SelectItem>
                          <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                          <SelectItem value="8:30 PM">8:30 PM</SelectItem>
                          <SelectItem value="9:00 PM">9:00 PM</SelectItem>
                          <SelectItem value="9:30 PM">9:30 PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="partySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Size</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          placeholder="Number of people"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any dietary restrictions, seating preferences, or special occasions..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://restaurant-website.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="openTableUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenTable URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://opentable.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBooking(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRestaurantMutation.isPending}>
                  {createRestaurantMutation.isPending ? "Adding..." : "Add Restaurant"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}