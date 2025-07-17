import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import type { ActivityWithDetails, TripWithDetails } from "@shared/schema";

interface CalendarGridProps {
  currentMonth: Date;
  activities: ActivityWithDetails[];
  trip: TripWithDetails;
  selectedDate?: Date | null;
  onDayClick?: (date: Date) => void;
}

const categoryColors = {
  food: "bg-red-100 text-red-800",
  sightseeing: "bg-green-100 text-green-800",
  transport: "bg-blue-100 text-blue-800",
  entertainment: "bg-purple-100 text-purple-800",
  shopping: "bg-pink-100 text-pink-800",
  culture: "bg-yellow-100 text-yellow-800",
  outdoor: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

const categoryIcons = {
  food: "🍜",
  sightseeing: "🏯",
  transport: "🚊",
  entertainment: "🎤",
  shopping: "🛍️",
  culture: "🎭",
  outdoor: "🏔️",
  other: "📍",
};

export function CalendarGrid({ currentMonth, activities, trip, selectedDate, onDayClick }: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity => 
      isSameDay(new Date(activity.startTime), day)
    );
  };

  const isTripDay = (day: Date) => {
    return isWithinInterval(day, {
      start: new Date(trip.startDate),
      end: new Date(trip.endDate)
    });
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      {/* Calendar Header */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {weekdays.map(day => (
          <div key={day} className="bg-white px-4 py-3 text-center">
            <span className="text-sm font-medium text-neutral-900">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {/* Empty cells for days before month start */}
        {Array.from({ length: monthStart.getDay() }, (_, i) => (
          <div key={`empty-${i}`} className="bg-gray-50 h-32 lg:h-40" />
        ))}
        
        {/* Days of the month */}
        {days.map(day => {
          const dayActivities = getActivitiesForDay(day);
          const isTripActive = isTripDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={day.toISOString()}
              onClick={() => isTripActive && onDayClick?.(day)}
              className={`h-32 lg:h-40 p-2 relative ${
                isTripActive 
                  ? `bg-white cursor-pointer hover:bg-blue-50 transition-colors ${
                      isSelected 
                        ? "ring-2 ring-primary ring-inset" 
                        : dayActivities.length > 0 
                          ? "border-2 border-primary" 
                          : "border border-gray-200"
                    }`
                  : "bg-gray-50"
              }`}
            >
              <span className={`text-sm font-medium ${
                isTripActive ? "text-neutral-900" : "text-neutral-400"
              }`}>
                {format(day, 'd')}
              </span>
              
              {isSelected && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full border-2 border-white"></div>
              )}
              
              {isTripActive && dayActivities.length === 0 && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
                  Click to add
                </div>
              )}
              
              {dayActivities.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayActivities.slice(0, 3).map(activity => (
                    <div
                      key={activity.id}
                      className={`text-xs px-2 py-1 rounded truncate ${
                        categoryColors[activity.category as keyof typeof categoryColors] || categoryColors.other
                      }`}
                    >
                      {categoryIcons[activity.category as keyof typeof categoryIcons] || categoryIcons.other}{" "}
                      {activity.name.length > 15 ? `${activity.name.substring(0, 12)}...` : activity.name}
                    </div>
                  ))}
                  {dayActivities.length > 3 && (
                    <div className="text-xs text-neutral-600 px-2">
                      +{dayActivities.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
