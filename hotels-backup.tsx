import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Users, Star, Edit, Trash2, ExternalLink, Hotel, Plus, Bed, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertHotelSchema, type HotelWithDetails } from "@shared/schema";

const formSchema = insertHotelSchema.extend({
  checkInDate: z.date(),
  checkOutDate: z.date(),
});

type FormData = z.infer<typeof formSchema>;

export default function HotelsPage() {
  const params = useParams();
  const tripId = parseInt(params.tripId as string);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelWithDetails | null>(null);
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
    try {
      const params = new URLSearchParams({
        location: trip.destination,
        checkIn: trip.startDate.toISOString().split('T')[0],
        checkOut: trip.endDate.toISOString().split('T')[0],
        guests: '2',
        ...(searchFilters.maxPrice && { maxPrice: searchFilters.maxPrice })
      });

      const response = await apiRequest(`/api/hotels/search?${params}`);
      
      let results = response;
      
      // Apply filters
      if (searchFilters.minRating) {
        results = results.filter(hotel => hotel.rating >= parseFloat(searchFilters.minRating));
      }
      
      // Apply sorting
      if (searchFilters.sortBy === 'price') {
        results.sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
          return priceA - priceB;
        });
      } else if (searchFilters.sortBy === 'rating') {
        results.sort((a, b) => b.rating - a.rating);
      }
      
      setSearchResults(results);
      setShowSearch(true);
      
      toast({
        title: "Hotels Found",
        description: `Found ${results.length} hotels in ${trip.destination}`,
      });
    } catch (error) {
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
        title: "Search Failed",
        description: "Unable to search for hotels. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add searched hotel to user's hotel list
  const addSearchedHotel = (hotel) => {
    form.reset({
      tripId,
      name: hotel.name,
      location: hotel.location,
      checkInDate: new Date(trip.startDate),
      checkOutDate: new Date(trip.endDate),
      totalPrice: hotel.price,
      pricePerNight: hotel.pricePerNight || hotel.price,
      bookingPlatform: hotel.platform,
      bookingUrl: hotel.bookingUrl,
      roomType: hotel.roomType || "Standard Room",
      guests: hotel.guests || 2,
      rating: hotel.rating || 4,
      description: `${hotel.name} - ${hotel.amenities || 'Hotel amenities'}`,
      cancellationPolicy: "Standard cancellation policy",
      amenities: hotel.amenities || "WiFi, Breakfast",
      contactInfo: "",
    });
    setIsDialogOpen(true);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripId,
      name: "",
      location: "",
      checkInDate: new Date(),
      checkOutDate: new Date(),
      totalPrice: "",
      pricePerNight: "",
      bookingPlatform: "",
      bookingUrl: "",
      roomType: "",
      guests: 1,
      rating: 5,
      description: "",
      cancellationPolicy: "",
      amenities: "",
      contactInfo: "",
    },
  });

  const createHotelMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest(`/api/trips/${tripId}/hotels`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/hotels`] });
      toast({
        title: "Hotel added successfully",
        description: "Your hotel booking has been saved to the trip.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You need to be logged in to add hotels.",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add hotel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHotelMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest(`/api/hotels/${editingHotel?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/hotels`] });
      toast({
        title: "Hotel updated successfully",
        description: "Your hotel booking has been updated.",
      });
      setIsDialogOpen(false);
      setEditingHotel(null);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You need to be logged in to update hotels.",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update hotel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteHotelMutation = useMutation({
    mutationFn: async (hotelId: number) => {
      return await apiRequest(`/api/hotels/${hotelId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/hotels`] });
      toast({
        title: "Hotel deleted successfully",
        description: "Your hotel booking has been removed.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You need to be logged in to delete hotels.",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete hotel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (hotel: HotelWithDetails) => {
    setEditingHotel(hotel);
    form.reset({
      tripId,
      name: hotel.name,
      location: hotel.location,
      checkInDate: new Date(hotel.checkInDate),
      checkOutDate: new Date(hotel.checkOutDate),
      totalPrice: hotel.totalPrice || "",
      pricePerNight: hotel.pricePerNight || "",
      bookingPlatform: hotel.bookingPlatform || "",
      bookingUrl: hotel.bookingUrl || "",
      roomType: hotel.roomType || "",
      guests: hotel.guests || 1,
      rating: hotel.rating || 5,
      description: hotel.description || "",
      cancellationPolicy: hotel.cancellationPolicy || "",
      amenities: hotel.amenities || "",
      contactInfo: hotel.contactInfo || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (hotelId: number) => {
    if (window.confirm("Are you sure you want to delete this hotel booking?")) {
      deleteHotelMutation.mutate(hotelId);
    }
  };

  const onSubmit = (data: FormData) => {
    if (editingHotel) {
      updateHotelMutation.mutate(data);
    } else {
      createHotelMutation.mutate(data);
    }
  };

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ));
  };

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${format(checkInDate, "MMM d")} - ${format(checkOutDate, "MMM d")} (${nights} nights)`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-6 w-6" />
            Hotels
          </h1>
          <p className="text-muted-foreground">
            Manage hotel bookings for {trip?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4 mr-2" />
            Search Hotels
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingHotel(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Hotel
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? "Edit Hotel" : "Add Hotel"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hotel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Grand Hotel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="New York City, NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="checkInDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Check-in Date</FormLabel>
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
                    name="checkOutDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Check-out Date</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="totalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Price</FormLabel>
                        <FormControl>
                          <Input placeholder="$299" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerNight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Night</FormLabel>
                        <FormControl>
                          <Input placeholder="$99" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guests</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard Room</SelectItem>
                            <SelectItem value="deluxe">Deluxe Room</SelectItem>
                            <SelectItem value="suite">Suite</SelectItem>
                            <SelectItem value="penthouse">Penthouse</SelectItem>
                            <SelectItem value="studio">Studio</SelectItem>
                            <SelectItem value="apartment">Apartment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Star</SelectItem>
                            <SelectItem value="2">2 Stars</SelectItem>
                            <SelectItem value="3">3 Stars</SelectItem>
                            <SelectItem value="4">4 Stars</SelectItem>
                            <SelectItem value="5">5 Stars</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bookingPlatform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Platform</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="booking.com">Booking.com</SelectItem>
                            <SelectItem value="expedia">Expedia</SelectItem>
                            <SelectItem value="hotels.com">Hotels.com</SelectItem>
                            <SelectItem value="airbnb">Airbnb</SelectItem>
                            <SelectItem value="vrbo">VRBO</SelectItem>
                            <SelectItem value="direct">Direct Booking</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bookingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://booking.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="amenities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <FormControl>
                        <Input placeholder="WiFi, Pool, Gym, Spa, Restaurant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional details about the hotel..."
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
                    name="cancellationPolicy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Policy</FormLabel>
                        <FormControl>
                          <Input placeholder="Free cancellation until..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Info</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone, email, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createHotelMutation.isPending || updateHotelMutation.isPending}>
                    {editingHotel ? "Update Hotel" : "Add Hotel"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hotel Search Section */}
      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Hotels in {trip?.destination}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                <Input
                  placeholder="Max Price ($)"
                  value={searchFilters.maxPrice}
                  onChange={(e) => setSearchFilters({ ...searchFilters, maxPrice: e.target.value })}
                />
                <Select
                  value={searchFilters.minRating}
                  onValueChange={(value) => setSearchFilters({ ...searchFilters, minRating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Min Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={searchFilters.sortBy}
                  onValueChange={(value) => setSearchFilters({ ...searchFilters, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price (Low to High)</SelectItem>
                    <SelectItem value="rating">Rating (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
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
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length} hotels found)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((hotel, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{hotel.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {hotel.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-4 h-4",
                              i < hotel.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold text-green-600">{hotel.price}</span>
                    </div>
                    
                    {hotel.pricePerNight && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Per Night:</span>
                        <span className="font-medium">{hotel.pricePerNight}</span>
                      </div>
                    )}
                    
                    {hotel.amenities && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Amenities:</span>
                        <p className="text-xs text-gray-600 mt-1">{hotel.amenities}</p>
                      </div>
                    )}
                    
                    <Badge variant="secondary" className="text-xs">
                      {hotel.platform}
                    </Badge>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(hotel.bookingUrl, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Book Now
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => addSearchedHotel(hotel)}
                        className="flex-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
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
      {hotels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bed className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hotels yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your hotel bookings to keep track of accommodations for your trip.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Hotel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <Card key={hotel.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{hotel.name}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {hotel.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      {getStarRating(hotel.rating || 5)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Check-in/out:</span>
                  <span className="font-medium">
                    {formatDateRange(hotel.checkInDate, hotel.checkOutDate)}
                  </span>
                </div>

                {hotel.roomType && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Room:</span>
                    <span className="font-medium">{hotel.roomType}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Guests:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {hotel.guests}
                  </span>
                </div>

                {hotel.totalPrice && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-semibold text-green-600">{hotel.totalPrice}</span>
                  </div>
                )}

                {hotel.pricePerNight && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Per Night:</span>
                    <span className="font-medium">{hotel.pricePerNight}</span>
                  </div>
                )}

                {hotel.bookingPlatform && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform:</span>
                    <Badge variant="secondary">{hotel.bookingPlatform}</Badge>
                  </div>
                )}

                {hotel.amenities && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Amenities:</span>
                    <p className="text-xs text-muted-foreground mt-1">{hotel.amenities}</p>
                  </div>
                )}

                {hotel.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="text-xs text-muted-foreground mt-1">{hotel.description}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(hotel)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(hotel.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {hotel.bookingUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(hotel.bookingUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}