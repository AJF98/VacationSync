import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Trip from "@/pages/trip";
import MemberSchedule from "@/pages/member-schedule";
import Join from "@/pages/join";
import Profile from "@/pages/profile";
import Flights from "@/pages/flights";
import Hotels from "@/pages/hotels";
import Activities from "@/pages/activities";
import Restaurants from "@/pages/restaurants";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/join/:shareCode" component={Join} />
          <Route path="/" component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/trip/:id" component={Trip} />
          <Route path="/trip/:tripId/members" component={MemberSchedule} />
          <Route path="/trip/:tripId/flights" component={Flights} />
          <Route path="/trip/:tripId/hotels" component={Hotels} />
          <Route path="/trip/:tripId/activities" component={Activities} />
          <Route path="/trip/:tripId/restaurants" component={Restaurants} />
          <Route path="/join/:shareCode" component={Join} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
