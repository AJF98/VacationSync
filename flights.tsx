import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plane, Clock, MapPin, User, Edit, Trash2, Plus, Search, Filter, ArrowUpDown, SlidersHorizontal, ChevronDown, Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FlightWithDetails, InsertFlight } from "@shared/schema";

// Helper function to format duration in minutes to "Xh Ym" format
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Helper function to get flight status color
function getFlightStatusColor(status: string): string {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    case "delayed": return "bg-yellow-100 text-yellow-800";
    case "completed": return "bg-blue-100 text-blue-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

// Helper function to convert destination names to airport codes
function getDestinationCode(destination: string): string {
  const destinationMap: { [key: string]: string } = {
    "Croatia": "ZAG", // Zagreb
    "Croatia 2025": "ZAG",
    "Croatia 2025 Girls": "ZAG",
    "Paris": "CDG",
    "London": "LHR",
    "Rome": "FCO",
    "Barcelona": "BCN",
    "Amsterdam": "AMS",
    "Berlin": "BER",
    "Vienna": "VIE",
    "Prague": "PRG",
    "Budapest": "BUD",
    "Warsaw": "WAW",
    "Stockholm": "ARN",
    "Copenhagen": "CPH",
    "Oslo": "OSL",
    "Helsinki": "HEL",
    "Zurich": "ZUR",
    "Geneva": "GVA",
    "Brussels": "BRU",
    "Dublin": "DUB",
    "Edinburgh": "EDI",
    "Madrid": "MAD",
    "Lisbon": "LIS",
    "Athens": "ATH",
    "Istanbul": "IST",
    "New York": "JFK",
    "Los Angeles": "LAX",
    "Chicago": "ORD",
    "Miami": "MIA",
    "San Francisco": "SFO",
    "Tokyo": "HND",
    "Seoul": "ICN",
    "Hong Kong": "HKG",
    "Singapore": "SIN",
    "Sydney": "SYD",
    "Melbourne": "MEL",
    "Toronto": "YYZ",
    "Vancouver": "YVR",
  };
  
  // Try exact match first
  if (destinationMap[destination]) {
    return destinationMap[destination];
  }
  
  // Try partial match
  for (const [key, code] of Object.entries(destinationMap)) {
    if (destination.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(destination.toLowerCase())) {
      return code;
    }
  }
  
  // Default to a major European airport if no match found
  return "LHR";
}

export default function FlightsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightWithDetails | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [autoSearchTriggered, setAutoSearchTriggered] = useState(false);
  const [filters, setFilters] = useState({
    maxPrice: '',
    maxStops: '',
    airlines: [] as string[],
    departureTimeRange: '',
    duration: '',
    sortBy: 'duration' as 'price' | 'duration' | 'departure' | 'arrival',
    sortOrder: 'asc' as 'asc' | 'desc'
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: flights, isLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/flights`],
    enabled: !!tripId,
  });

  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
  });

  const { data: memberLocation } = useQuery({
    queryKey: [`/api/trips/${tripId}/my-location`],
    enabled: !!tripId,
  });

  // Auto-populate flight search when trip data is available
  useEffect(() => {
    if (trip && memberLocation && !autoSearchTriggered && flights?.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const tripStartDate = new Date(trip.startDate).toISOString().split('T')[0];
      const tripEndDate = new Date(trip.endDate).toISOString().split('T')[0];
      
      // Only auto-search if the trip is in the future
      if (tripStartDate > today) {
        // Use user's stored airport code or default to major airport
        const originCode = memberLocation.departureAirport || "JFK";
        
        const autoSearchParams = {
          origin: originCode,
          destination: getDestinationCode(trip.destination),
          departureDate: tripStartDate,
          returnDate: tripEndDate,
          passengers: 1,
          class: "economy",
        };
        
        // Only search if we have a valid destination
        if (autoSearchParams.destination) {
          searchFlights(autoSearchParams);
          setAutoSearchTriggered(true);
        }
      }
    }
  }, [trip, memberLocation, flights, autoSearchTriggered]);

  // Filter and sort results when filters change
  useEffect(() => {
    if (searchResults.length === 0) {
      setFilteredResults([]);
      return;
    }

    let filtered = [...searchResults];

    // Apply filters
    if (filters.maxPrice) {
      filtered = filtered.filter(flight => flight.price <= parseInt(filters.maxPrice));
    }

    if (filters.maxStops && filters.maxStops !== "any") {
      filtered = filtered.filter(flight => flight.stops <= parseInt(filters.maxStops));
    }

    if (filters.airlines.length > 0) {
      filtered = filtered.filter(flight => filters.airlines.includes(flight.airline));
    }

    if (filters.departureTimeRange && filters.departureTimeRange !== "any") {
      const [start, end] = filters.departureTimeRange.split('-').map(t => parseInt(t));
      filtered = filtered.filter(flight => {
        const hour = new Date(flight.departureTime).getHours();
        return hour >= start && hour <= end;
      });
    }

    if (filters.duration) {
      filtered = filtered.filter(flight => flight.duration <= parseInt(filters.duration));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'departure':
          aValue = new Date(a.departureTime).getTime();
          bValue = new Date(b.departureTime).getTime();
          break;
        case 'arrival':
          aValue = new Date(a.arrivalTime).getTime();
          bValue = new Date(b.arrivalTime).getTime();
          break;
        default:
          aValue = a.duration;
          bValue = b.duration;
      }

      if (filters.sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setFilteredResults(filtered);
  }, [searchResults, filters]);

  // Flight search using FlightAPI.io
  const searchFlights = async (searchParams: any) => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Flight search failed');
      }
      
      const data = await response.json();
      const results = data.data || [];
      setSearchResults(results);
      setFilteredResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No flights found",
          description: "No real flight data available for this route and date. Try different dates or airports.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Flight search error:", error);
      
      // Handle specific API limitation errors
      if (error.message.includes('Future flight search requires')) {
        toast({
          title: "API Plan Limitation",
          description: "Your Aviationstack free plan only shows real-time flights (currently in air). Upgrade to search future flights.",
          variant: "destructive",
        });
      } else if (error.message.includes('real-time flight data')) {
        toast({
          title: "Plan Upgrade Required",
          description: "Future flight schedules require Aviationstack paid plan ($49.99+/month).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Error",
          description: "Unable to retrieve real flight data. Please check your API configuration.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const createFlightMutation = useMutation({
    mutationFn: async (flightData: InsertFlight) => {
      return apiRequest(`/api/trips/${tripId}/flights`, {
        method: "POST",
        body: flightData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      setIsAddFlightOpen(false);
      setEditingFlight(null);
      toast({
        title: "Success",
        description: "Flight added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add flight",
        variant: "destructive",
      });
    },
  });

  const updateFlightMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<InsertFlight> }) => {
      return apiRequest(`/api/flights/${data.id}`, {
        method: "PUT",
        body: data.updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      setEditingFlight(null);
      toast({
        title: "Success",
        description: "Flight updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update flight",
        variant: "destructive",
      });
    },
  });

  const deleteFlightMutation = useMutation({
    mutationFn: async (flightId: number) => {
      return apiRequest(`/api/flights/${flightId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      toast({
        title: "Success",
        description: "Flight deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete flight",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatLayovers = (layovers: any[]) => {
    if (!layovers || layovers.length === 0) return "Direct";
    return layovers.map(layover => `${layover.code} (${layover.duration}min)`).join(", ");
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Flight Coordination</h1>
        <p className="text-gray-600">
          Search flights, track bookings, and coordinate travel with your group
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Find Flights</TabsTrigger>
          <TabsTrigger value="group">Group Flights</TabsTrigger>
          <TabsTrigger value="manual">Add Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Flight Search
              </CardTitle>
              {trip && (
                <p className="text-sm text-gray-600">
                  Searching flights for {trip.destination} • {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <FlightSearchForm 
                onSearch={searchFlights} 
                isSearching={isSearching} 
                trip={trip}
                memberLocation={memberLocation}
              />
              
              {isSearching && (
                <div className="mt-6 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching for flights...</p>
                </div>
              )}
              
              {searchResults.length > 0 && !isSearching && (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Available Flights ({filteredResults.length} of {searchResults.length})
                    </h3>
                  </div>
                  
                  <FlightFilters 
                    filters={filters} 
                    onFiltersChange={setFilters}
                    searchResults={searchResults}
                  />
                  
                  <div className="space-y-3">
                    {filteredResults.map((flight) => (
                      <SearchResultCard
                        key={flight.id}
                        flight={flight}
                        onBook={(flightData) => createFlightMutation.mutate(flightData)}
                        isBooking={createFlightMutation.isPending}
                      />
                    ))}
                  </div>
                  
                  {filteredResults.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No flights match your current filters</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setFilters({
                          maxPrice: '',
                          maxStops: '',
                          airlines: [],
                          departureTimeRange: '',
                          duration: '',
                          sortBy: 'duration',
                          sortOrder: 'asc'
                        })}
                        className="mt-2"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Group Flight Coordination</h2>
          </div>
          
          {flights && flights.length > 0 ? (
            <div className="space-y-4">
              <GroupFlightSearch flights={flights} />
              <div className="grid gap-4">
                {flights.map((flight: FlightWithDetails) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onEdit={setEditingFlight}
                    onDelete={(id) => deleteFlightMutation.mutate(id)}
                    isDeleting={deleteFlightMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Plane className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No flights added yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Search for flights or add them manually to coordinate with your group
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Flight Manually
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManualFlightForm
                onSubmit={(flightData) => createFlightMutation.mutate(flightData)}
                isSubmitting={createFlightMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Flight Dialog */}
      <Dialog open={!!editingFlight} onOpenChange={(open) => !open && setEditingFlight(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Flight</DialogTitle>
          </DialogHeader>
          {editingFlight && (
            <ManualFlightForm
              initialData={editingFlight}
              onSubmit={(flightData) => updateFlightMutation.mutate({
                id: editingFlight.id,
                updates: flightData
              })}
              isSubmitting={updateFlightMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Advanced Flight Filters Component
function FlightFilters({ filters, onFiltersChange, searchResults }: {
  filters: any;
  onFiltersChange: (filters: any) => void;
  searchResults: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get unique airlines from search results
  const availableAirlines = [...new Set(searchResults.map(flight => flight.airline))];
  
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleAirlineToggle = (airline: string) => {
    const newAirlines = filters.airlines.includes(airline)
      ? filters.airlines.filter((a: string) => a !== airline)
      : [...filters.airlines, airline];
    handleFilterChange('airlines', newAirlines);
  };

  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== '' && value !== 'price' && value !== 'asc';
  }).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Price Filter */}
          <div className="space-y-2">
            <Label htmlFor="maxPrice">Max Price ($)</Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="e.g., 500"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </div>

          {/* Stops Filter */}
          <div className="space-y-2">
            <Label htmlFor="maxStops">Max Stops</Label>
            <Select value={filters.maxStops} onValueChange={(value) => handleFilterChange('maxStops', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0">Direct flights only</SelectItem>
                <SelectItem value="1">1 stop max</SelectItem>
                <SelectItem value="2">2 stops max</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Filter */}
          <div className="space-y-2">
            <Label htmlFor="duration">Max Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 480"
              value={filters.duration}
              onChange={(e) => handleFilterChange('duration', e.target.value)}
            />
          </div>

          {/* Departure Time Filter */}
          <div className="space-y-2">
            <Label htmlFor="departureTime">Departure Time</Label>
            <Select value={filters.departureTimeRange} onValueChange={(value) => handleFilterChange('departureTimeRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="0-6">Early morning (12AM-6AM)</SelectItem>
                <SelectItem value="6-12">Morning (6AM-12PM)</SelectItem>
                <SelectItem value="12-18">Afternoon (12PM-6PM)</SelectItem>
                <SelectItem value="18-24">Evening (6PM-12AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="departure">Departure Time</SelectItem>
                <SelectItem value="arrival">Arrival Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Low to High</SelectItem>
                <SelectItem value="desc">High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Airlines Filter */}
        {availableAirlines.length > 0 && (
          <div className="space-y-2">
            <Label>Airlines</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableAirlines.map((airline) => (
                <div key={airline} className="flex items-center space-x-2">
                  <Checkbox
                    id={airline}
                    checked={filters.airlines.includes(airline)}
                    onCheckedChange={() => handleAirlineToggle(airline)}
                  />
                  <Label htmlFor={airline} className="text-sm font-normal cursor-pointer">
                    {airline}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            onClick={() => onFiltersChange({
              maxPrice: '',
              maxStops: '',
              airlines: [],
              departureTimeRange: '',
              duration: '',
              sortBy: 'duration',
              sortOrder: 'asc'
            })}
            className="w-full"
          >
            Clear All Filters
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Component for flight search form
function FlightSearchForm({ onSearch, isSearching, trip, memberLocation }: { onSearch: (params: any) => void; isSearching: boolean; trip?: any; memberLocation?: any }) {
  const [searchParams, setSearchParams] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    passengers: 1,
    class: "economy",
  });
  const [hasUserEditedDestination, setHasUserEditedDestination] = useState(false);
  const [hasUserEditedOrigin, setHasUserEditedOrigin] = useState(false);

  // Pre-populate form with trip data and member location when available
  useEffect(() => {
    if (trip && !hasUserEditedDestination && !searchParams.destination) {
      setSearchParams(prev => ({
        ...prev,
        destination: getDestinationCode(trip.destination),
        departureDate: new Date(trip.startDate).toISOString().split('T')[0],
        returnDate: new Date(trip.endDate).toISOString().split('T')[0],
      }));
    }
  }, [trip]);

  // Pre-populate origin with member's stored departure airport
  useEffect(() => {
    if (memberLocation && memberLocation.departureAirport && !hasUserEditedOrigin && !searchParams.origin) {
      setSearchParams(prev => ({
        ...prev,
        origin: memberLocation.departureAirport,
      }));
    }
  }, [memberLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchParamsWithTrip = {
      ...searchParams,
      tripId: trip?.id
    };
    onSearch(searchParamsWithTrip);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="origin">From</Label>
          <Input
            id="origin"
            placeholder="Origin airport (e.g., JFK)"
            value={searchParams.origin}
            onChange={(e) => {
              setHasUserEditedOrigin(true);
              setSearchParams(prev => ({ ...prev, origin: e.target.value }));
            }}
            required
          />
          {memberLocation?.departureLocation && (
            <p className="text-xs text-gray-500 mt-1">
              Your saved location: {memberLocation.departureLocation}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="destination">To</Label>
          <Input
            id="destination"
            placeholder="Destination airport (e.g., LAX)"
            value={searchParams.destination}
            onChange={(e) => {
              setHasUserEditedDestination(true);
              setSearchParams(prev => ({ ...prev, destination: e.target.value }));
            }}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="departureDate">Departure Date</Label>
          <Input
            id="departureDate"
            type="date"
            value={searchParams.departureDate}
            onChange={(e) => setSearchParams(prev => ({ ...prev, departureDate: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="returnDate">Return Date (Optional)</Label>
          <Input
            id="returnDate"
            type="date"
            value={searchParams.returnDate}
            onChange={(e) => setSearchParams(prev => ({ ...prev, returnDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            min="1"
            value={searchParams.passengers}
            onChange={(e) => setSearchParams(prev => ({ ...prev, passengers: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="class">Class</Label>
          <Select 
            value={searchParams.class} 
            onValueChange={(value) => setSearchParams(prev => ({ ...prev, class: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="premium">Premium Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First Class</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={isSearching} className="w-full">
        {isSearching ? "Searching..." : "Search Flights"}
      </Button>
    </form>
  );
}

// Component for booking platform comparison
function BookingPlatformComparison({ flight }: { flight: any }) {
  const platformData = [
    {
      name: 'Kayak',
      key: 'kayak',
      description: 'Popular comparison site with comprehensive filters',
      pros: ['Price comparison', 'Good filters', 'Price alerts', 'Flexible dates'],
      cons: ['Booking fees', 'Third-party redirects'],
      rating: 4.5,
      specialty: 'Comparison',
      icon: '✈️'
    },
    {
      name: 'Expedia',
      key: 'expedia',
      description: 'Trusted platform with package deals',
      pros: ['Package deals', 'Loyalty rewards', 'Customer support', 'Mobile app'],
      cons: ['Higher fees', 'Limited airlines'],
      rating: 4.3,
      specialty: 'Packages',
      icon: '🌟'
    },
    {
      name: 'Google Flights',
      key: 'googleFlights',
      description: 'Best user interface with price tracking',
      pros: ['Clean interface', 'Price tracking', 'Calendar view', 'Fast search'],
      cons: ['Limited booking options', 'No customer support'],
      rating: 4.7,
      specialty: 'Search',
      icon: '🔍'
    },
    {
      name: 'Skyscanner',
      key: 'skyscanner',
      description: 'Comprehensive flight comparison engine',
      pros: ['Global coverage', 'Flexible search', 'Price alerts', 'Multi-city'],
      cons: ['Booking redirects', 'Variable pricing'],
      rating: 4.4,
      specialty: 'Coverage',
      icon: '🌍'
    },
    {
      name: 'Momondo',
      key: 'momondo',
      description: 'Often finds the best deals and hidden city tickets',
      pros: ['Best deals', 'Hidden city', 'Flexible dates', 'Trip planner'],
      cons: ['Complex interface', 'Limited support'],
      rating: 4.2,
      specialty: 'Deals',
      icon: '💰'
    },
    {
      name: 'Priceline',
      key: 'priceline',
      description: 'Discounts and special offers with name your price',
      pros: ['Discounts', 'Express deals', 'Package savings', 'VIP program'],
      cons: ['Non-refundable', 'Limited airlines'],
      rating: 4.1,
      specialty: 'Discounts',
      icon: '🎯'
    },
    {
      name: 'Booking.com',
      key: 'bookingcom',
      description: 'Book flights and hotels together for savings',
      pros: ['Hotel combos', 'Genius discounts', 'Free cancellation', 'Instant booking'],
      cons: ['New to flights', 'Limited options'],
      rating: 4.0,
      specialty: 'Hotels',
      icon: '🏨'
    },
    {
      name: 'CheapOair',
      key: 'cheapoair',
      description: 'Budget-friendly options with student discounts',
      pros: ['Student discounts', 'Budget focus', 'Military rates', 'Flexible dates'],
      cons: ['Hidden fees', 'Limited support'],
      rating: 3.8,
      specialty: 'Budget',
      icon: '💸'
    }
  ];

  const availablePlatforms = platformData.filter(platform => 
    flight.bookingUrls && flight.bookingUrls[platform.key]
  );

  const handlePlatformClick = (platform: any) => {
    const url = flight.bookingUrls[platform.key];
    if (url) {
      window.open(url, '_blank');
      toast({
        title: `Opening ${platform.name}`,
        description: `Redirecting to ${platform.name} for booking. Round-trip flights included.`,
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Compare prices and features across {availablePlatforms.length} booking platforms for your {flight.departureCode} → {flight.arrivalCode} flight.
      </div>
      
      <div className="grid gap-4">
        {availablePlatforms.map((platform) => (
          <Card key={platform.key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePlatformClick(platform)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{platform.icon}</div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {platform.name}
                      <Badge variant="outline" className="text-xs">
                        {platform.specialty}
                      </Badge>
                    </h3>
                    <p className="text-sm text-gray-600">{platform.description}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm text-gray-600">{platform.rating}/5</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Visit Site
                </Button>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-green-600 mb-1">Pros:</h4>
                  <ul className="space-y-1">
                    {platform.pros.map((pro, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-red-600 mb-1">Cons:</h4>
                  <ul className="space-y-1">
                    {platform.cons.map((con, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <X className="h-3 w-3 text-red-500" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        All platforms will show round-trip flights automatically using your trip dates. Prices may vary between platforms.
      </div>
    </div>
  );
}

// Component for search result cards
function SearchResultCard({ flight, onBook, isBooking }: { flight: any; onBook: (data: InsertFlight) => void; isBooking: boolean }) {
  const { tripId } = useParams<{ tripId: string }>();
  const { toast } = useToast();

  const handleAddToTrip = () => {
    const flightData: InsertFlight = {
      tripId: parseInt(tripId!),
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      departureAirport: flight.departureAirport,
      departureCode: flight.departureCode,
      departureTime: new Date(flight.departureTime),
      arrivalAirport: flight.arrivalAirport,
      arrivalCode: flight.arrivalCode,
      arrivalTime: new Date(flight.arrivalTime),
      flightType: "outbound",
      price: flight.price.toString(),
      currency: "USD",
      flightDuration: flight.duration,
      bookingSource: "app_purchase",
    };
    onBook(flightData);
  };

  const handleDirectBooking = () => {
    const bookingUrl = flight.bookingUrl;
    
    if (bookingUrl) {
      // Determine airline name for toast message
      const airlineName = flight.airline || 'the airline';
      
      // Create more informative toast message
      const flightDetails = `${flight.flightNumber} on ${format(new Date(flight.departureTime), 'MMM d')} at ${format(new Date(flight.departureTime), 'h:mm a')}`;
      
      toast({
        title: `Opening ${airlineName} website`,
        description: `Search for ${flightDetails} on their booking page.`,
        duration: 4000,
      });
      window.open(bookingUrl, '_blank');
    } else {
      toast({
        title: "Booking URL Not Available",
        description: `Search manually for ${flight.airline} ${flight.flightNumber} on ${format(new Date(flight.departureTime), 'MMM d')}.`,
        variant: "default",
      });
    }
  };

  const handleShareWithGroup = async () => {
    try {
      // Add flight to group flights first
      const flightData: InsertFlight = {
        tripId: parseInt(tripId!),
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        airlineCode: flight.airlineCode,
        departureAirport: flight.departureAirport,
        departureCode: flight.departureCode,
        departureTime: new Date(flight.departureTime),
        arrivalAirport: flight.arrivalAirport,
        arrivalCode: flight.arrivalCode,
        arrivalTime: new Date(flight.arrivalTime),
        flightType: "outbound",
        price: flight.price.toString(),
        currency: "USD",
        flightDuration: flight.duration,
        bookingSource: "shared_with_group",
      };
      
      // Add to group flights
      onBook(flightData);
      
      // Also share details for discussion
      const shareText = `I've added this flight option to our trip:\n\n✈️ ${flight.airline} ${flight.flightNumber}\n📅 ${format(new Date(flight.departureTime), 'PPP p')}\n🛫 ${flight.departureCode} → ${flight.arrivalCode}\n💰 $${flight.price}\n⏱️ ${formatDuration(flight.duration)}\n\nCheck it out in our trip flights!`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Flight Added to Trip - ${flight.airline} ${flight.flightNumber}`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Added to group flights!",
          description: "Flight saved to trip and details copied for sharing.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share flight details. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleCompareBookingPlatforms = () => {
    const platformInfo = [
      { name: 'Kayak', key: 'kayak', description: 'Popular comparison site with good filters' },
      { name: 'Expedia', key: 'expedia', description: 'Trusted platform with package deals' },
      { name: 'Google Flights', key: 'googleFlights', description: 'Best interface with price tracking' },
      { name: 'Skyscanner', key: 'skyscanner', description: 'Comprehensive flight comparison' },
      { name: 'Momondo', key: 'momondo', description: 'Often finds the best deals' },
      { name: 'Priceline', key: 'priceline', description: 'Discounts and special offers' },
      { name: 'Booking.com', key: 'bookingcom', description: 'Book flights and hotels together' },
      { name: 'CheapOair', key: 'cheapoair', description: 'Budget-friendly options' }
    ];
    
    const availablePlatforms = platformInfo.filter(platform => 
      flight.bookingUrls && flight.bookingUrls[platform.key]
    );
    
    if (availablePlatforms.length > 0) {
      // Open first few platforms in separate tabs for comparison
      availablePlatforms.slice(0, 3).forEach((platform, index) => {
        setTimeout(() => {
          window.open(flight.bookingUrls[platform.key], '_blank');
        }, index * 500); // Stagger opening to avoid popup blocks
      });
      
      toast({
        title: "Opening comparison platforms",
        description: `Opened ${availablePlatforms.slice(0, 3).map(p => p.name).join(', ')} for price comparison.`,
        duration: 5000,
      });
    } else {
      toast({
        title: "No booking platforms available",
        description: "Try searching for flights again to get booking links.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{flight.airline}</span>
              <Badge variant="secondary">{flight.flightNumber}</Badge>
              {flight.stops === 0 && <Badge variant="outline">Direct</Badge>}
              {flight.stops > 0 && <Badge variant="outline">{flight.stops} stop{flight.stops > 1 ? 's' : ''}</Badge>}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(flight.duration)}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {flight.departureCode} → {flight.arrivalCode}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                To: {flight.arrivalAirport || flight.arrival?.city || flight.arrivalCode}
              </div>
            </div>
            
            <div className="mt-2 text-sm">
              <div>{format(new Date(flight.departureTime), 'PPP p')} - {format(new Date(flight.arrivalTime), 'PPP p')}</div>
            </div>

            {flight.layovers && flight.layovers.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                Layovers: {flight.layovers.map((layover: any) => `${layover.airport} (${layover.duration}min)`).join(", ")}
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">${flight.price}</div>
            <div className="flex flex-col gap-2 mt-2">
              <Button 
                onClick={handleDirectBooking} 
                className="w-full" 
                size="sm"
              >
                <Plane className="h-4 w-4 mr-2" />
                Book with {flight.airline}
              </Button>
              <Button 
                onClick={handleAddToTrip} 
                disabled={isBooking} 
                variant="outline"
                size="sm"
              >
                {isBooking ? "Adding..." : "Add to Trip"}
              </Button>
              <Button 
                onClick={handleShareWithGroup} 
                variant="outline"
                size="sm"
              >
                Share with Group
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                  >
                    Compare Platforms
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Compare Booking Platforms</DialogTitle>
                  </DialogHeader>
                  <BookingPlatformComparison flight={flight} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for flight cards
function FlightCard({ flight, onEdit, onDelete, isDeleting }: { 
  flight: FlightWithDetails; 
  onEdit: (flight: FlightWithDetails) => void; 
  onDelete: (id: number) => void; 
  isDeleting: boolean; 
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={flight.user.profileImageUrl || undefined} />
                <AvatarFallback>
                  {flight.user.firstName?.[0] || flight.user.email?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{flight.airline} {flight.flightNumber}</div>
                <div className="text-sm text-gray-600">{flight.user.firstName} {flight.user.lastName}</div>
              </div>
              <Badge className={getFlightStatusColor(flight.status)}>
                {flight.status}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {flight.departureCode} → {flight.arrivalCode}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {flight.flightDuration && formatDuration(flight.flightDuration)}
                </div>
              </div>
              
              <div>
                <strong>Departure:</strong> {format(new Date(flight.departureTime), 'PPP p')}
              </div>
              <div>
                <strong>Arrival:</strong> {format(new Date(flight.arrivalTime), 'PPP p')}
              </div>
              
              {flight.seatNumber && (
                <div><strong>Seat:</strong> {flight.seatNumber}</div>
              )}
              
              {flight.layovers && (
                <div><strong>Layovers:</strong> {formatLayovers(JSON.parse(flight.layovers))}</div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(flight)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete(flight.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for manual flight form
function ManualFlightForm({ onSubmit, isSubmitting, initialData }: { 
  onSubmit: (data: InsertFlight) => void; 
  isSubmitting: boolean;
  initialData?: FlightWithDetails;
}) {
  const { tripId } = useParams<{ tripId: string }>();
  const [formData, setFormData] = useState({
    flightNumber: initialData?.flightNumber || "",
    airline: initialData?.airline || "",
    airlineCode: initialData?.airlineCode || "",
    departureAirport: initialData?.departureAirport || "",
    departureCode: initialData?.departureCode || "",
    departureTime: initialData?.departureTime ? format(new Date(initialData.departureTime), "yyyy-MM-dd'T'HH:mm") : "",
    arrivalAirport: initialData?.arrivalAirport || "",
    arrivalCode: initialData?.arrivalCode || "",
    arrivalTime: initialData?.arrivalTime ? format(new Date(initialData.arrivalTime), "yyyy-MM-dd'T'HH:mm") : "",
    flightType: initialData?.flightType || "outbound",
    seatNumber: initialData?.seatNumber || "",
    seatClass: initialData?.seatClass || "economy",
    price: initialData?.price || "",
    bookingReference: initialData?.bookingReference || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const flightData: InsertFlight = {
      tripId: parseInt(tripId!),
      flightNumber: formData.flightNumber,
      airline: formData.airline,
      airlineCode: formData.airlineCode,
      departureAirport: formData.departureAirport,
      departureCode: formData.departureCode,
      departureTime: new Date(formData.departureTime),
      arrivalAirport: formData.arrivalAirport,
      arrivalCode: formData.arrivalCode,
      arrivalTime: new Date(formData.arrivalTime),
      flightType: formData.flightType as "outbound" | "return" | "connecting",
      seatNumber: formData.seatNumber || undefined,
      seatClass: formData.seatClass || undefined,
      price: formData.price || undefined,
      bookingReference: formData.bookingReference || undefined,
      bookingSource: "manual",
    };
    
    onSubmit(flightData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="airline">Airline</Label>
          <Input
            id="airline"
            value={formData.airline}
            onChange={(e) => setFormData(prev => ({ ...prev, airline: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="flightNumber">Flight Number</Label>
          <Input
            id="flightNumber"
            value={formData.flightNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="airlineCode">Airline Code</Label>
          <Input
            id="airlineCode"
            value={formData.airlineCode}
            onChange={(e) => setFormData(prev => ({ ...prev, airlineCode: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="departureAirport">Departure Airport</Label>
          <Input
            id="departureAirport"
            value={formData.departureAirport}
            onChange={(e) => setFormData(prev => ({ ...prev, departureAirport: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="departureCode">Departure Code</Label>
          <Input
            id="departureCode"
            value={formData.departureCode}
            onChange={(e) => setFormData(prev => ({ ...prev, departureCode: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="departureTime">Departure Time</Label>
        <Input
          id="departureTime"
          type="datetime-local"
          value={formData.departureTime}
          onChange={(e) => setFormData(prev => ({ ...prev, departureTime: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="arrivalAirport">Arrival Airport</Label>
          <Input
            id="arrivalAirport"
            value={formData.arrivalAirport}
            onChange={(e) => setFormData(prev => ({ ...prev, arrivalAirport: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="arrivalCode">Arrival Code</Label>
          <Input
            id="arrivalCode"
            value={formData.arrivalCode}
            onChange={(e) => setFormData(prev => ({ ...prev, arrivalCode: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="arrivalTime">Arrival Time</Label>
        <Input
          id="arrivalTime"
          type="datetime-local"
          value={formData.arrivalTime}
          onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="flightType">Flight Type</Label>
          <Select 
            value={formData.flightType} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, flightType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="return">Return</SelectItem>
              <SelectItem value="connecting">Connecting</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="seatClass">Seat Class</Label>
          <Select 
            value={formData.seatClass} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, seatClass: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="premium">Premium Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First Class</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="seatNumber">Seat Number</Label>
          <Input
            id="seatNumber"
            placeholder="e.g., 12A"
            value={formData.seatNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, seatNumber: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="bookingReference">Booking Reference</Label>
          <Input
            id="bookingReference"
            placeholder="e.g., ABC123"
            value={formData.bookingReference}
            onChange={(e) => setFormData(prev => ({ ...prev, bookingReference: e.target.value }))}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : (initialData ? "Update Flight" : "Add Flight")}
      </Button>
    </form>
  );
}

// Group Flight Search Component
function GroupFlightSearch({ flights }: { flights: FlightWithDetails[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [flightTypeFilter, setFlightTypeFilter] = useState('');
  
  // Get unique values for filters
  const uniqueMembers = [...new Set(flights.map(f => `${f.user.firstName} ${f.user.lastName}`))];
  const uniqueStatuses = [...new Set(flights.map(f => f.status))];
  const uniqueFlightTypes = [...new Set(flights.map(f => f.flightType))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Group Flights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="flightSearch">Search flights</Label>
            <Input
              id="flightSearch"
              placeholder="Airline, flight number, airport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="statusFilter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Filter */}
          <div className="space-y-2">
            <Label htmlFor="memberFilter">Member</Label>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All members</SelectItem>
                {uniqueMembers.map(member => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flight Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="flightTypeFilter">Flight Type</Label>
            <Select value={flightTypeFilter} onValueChange={setFlightTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {uniqueFlightTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setMemberFilter('');
                setFlightTypeFilter('');
              }}
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {flights.length} flights
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{flights.filter(f => f.status === 'confirmed').length} confirmed</Badge>
            <Badge variant="outline">{flights.filter(f => f.status === 'cancelled').length} cancelled</Badge>
            <Badge variant="outline">{flights.filter(f => f.flightType === 'outbound').length} outbound</Badge>
            <Badge variant="outline">{flights.filter(f => f.flightType === 'return').length} return</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}