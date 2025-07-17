import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Users, MapPin, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { CreateTripModal } from "@/components/create-trip-modal";
import { NotificationIcon } from "@/components/notification-icon";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Link } from "wouter";
import type { TripWithDetails } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding after a short delay for better UX
    const timer = setTimeout(() => {
      if (shouldShowOnboarding()) {
        setShowOnboarding(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldShowOnboarding]);

  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    skipOnboarding();
    setShowOnboarding(false);
  };

  const { data: trips, isLoading } = useQuery<TripWithDetails[]>({
    queryKey: ["/api/trips"],
  });

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const getUpcomingTrips = () => {
    if (!trips) return [];
    const now = new Date();
    return trips.filter(trip => new Date(trip.startDate) >= now);
  };

  const getPastTrips = () => {
    if (!trips) return [];
    const now = new Date();
    return trips.filter(trip => new Date(trip.endDate) < now);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <p className="text-neutral-600">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900">
                Welcome back, {user?.firstName || 'Traveler'}!
              </h1>
              <p className="text-neutral-600 mt-1">
                Ready to plan your next adventure?
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationIcon />
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-red-600 text-white"
                data-onboarding="create-trip"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Trip
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/api/logout'}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Calendar className="text-primary w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {getUpcomingTrips().length}
                  </p>
                  <p className="text-neutral-600 text-sm">Upcoming Trips</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Users className="text-secondary w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {trips?.reduce((total, trip) => total + trip.memberCount, 0) || 0}
                  </p>
                  <p className="text-neutral-600 text-sm">Travel Companions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="text-purple-600 w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {new Set(trips?.map(trip => trip.destination)).size || 0}
                  </p>
                  <p className="text-neutral-600 text-sm">Destinations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Trips */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Upcoming Trips</h2>
          </div>

          {getUpcomingTrips().length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-gray-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No upcoming trips</h3>
                <p className="text-neutral-600 mb-4">Start planning your next adventure!</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-red-600 text-white"
                  data-onboarding="create-trip"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getUpcomingTrips().map((trip) => (
                <Link key={trip.id} href={`/trip/${trip.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-neutral-900 line-clamp-1">
                          {trip.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {trip.memberCount} members
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-neutral-600 text-sm">
                          <MapPin className="w-4 h-4 mr-2" />
                          {trip.destination}
                        </div>
                        <div className="flex items-center text-neutral-600 text-sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {trip.members.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                            >
                              {member.user.profileImageUrl ? (
                                <img
                                  src={member.user.profileImageUrl}
                                  alt={member.user.firstName || 'Member'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                  {(member.user.firstName?.[0] || member.user.email?.[0] || 'U').toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                          {trip.memberCount > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                +{trip.memberCount - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(trip.startDate).getTime() - Date.now() > 0 
                            ? `${Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days to go`
                            : 'In progress'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Past Trips */}
        {getPastTrips().length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Past Trips</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getPastTrips().map((trip) => (
                <Link key={trip.id} href={`/trip/${trip.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-neutral-900 line-clamp-1">
                          {trip.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-neutral-600 text-sm">
                          <MapPin className="w-4 h-4 mr-2" />
                          {trip.destination}
                        </div>
                        <div className="flex items-center text-neutral-600 text-sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </div>
                      </div>

                      <div className="flex -space-x-2">
                        {trip.members.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                          >
                            {member.user.profileImageUrl ? (
                              <img
                                src={member.user.profileImageUrl}
                                alt={member.user.firstName || 'Member'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                {(member.user.firstName?.[0] || member.user.email?.[0] || 'U').toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {trip.memberCount > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              +{trip.memberCount - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateTripModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}
