import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin, Bell } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-teal-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Calendar className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-neutral-900">TripSync</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-red-600 text-white"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-neutral-900 mb-6">
            Plan Your Perfect
            <span className="text-primary"> Group Trip</span>
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
            Collaborate with friends to create activities, vote on what you want to do, 
            and keep everyone synchronized with personalized calendars.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-red-600 text-white text-lg px-8 py-4"
          >
            Start Planning Together
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Shared Calendar</h3>
              <p className="text-neutral-600 text-sm">
                Everyone can propose activities and see what's planned for each day
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-secondary w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Accept & Decline</h3>
              <p className="text-neutral-600 text-sm">
                Vote on activities you want to join and see real-time participant counts
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-purple-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Personal Schedule</h3>
              <p className="text-neutral-600 text-sm">
                Your personalized calendar shows only activities you've accepted
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="text-yellow-600 w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Smart Reminders</h3>
              <p className="text-neutral-600 text-sm">
                Get notifications before activities so you never miss what matters
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Preview */}
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="text-white w-4 h-4" />
                </div>
                <span className="text-white font-semibold">Japan Adventure 2025</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-neutral-600 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="aspect-square bg-gray-50 rounded border flex items-center justify-center text-sm">
                    {i < 10 ? '' : i - 9}
                    {i === 20 && (
                      <div className="absolute bg-primary text-white text-xs px-1 py-0.5 rounded mt-4">
                        🍜 Ramen
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-semibold text-neutral-900">TripSync</span>
          </div>
          <p className="text-neutral-600">
            The collaborative way to plan your next adventure
          </p>
        </div>
      </footer>
    </div>
  );
}
