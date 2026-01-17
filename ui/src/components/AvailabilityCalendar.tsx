import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import lettuceLogo from "@/assets/lettuce-logo.png";

interface AvailabilityCalendarProps {
  availability: Record<string, boolean>;
  friendAvailabilities?: Record<string, Record<string, boolean>>;
  invitedFriends?: string[];
  onToggle?: (dateTime: string) => void;
  selectedDateTime?: string;
  onSelectDateTime?: (dateTime: string) => void;
  editable?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

export const AvailabilityCalendar = ({
  availability,
  friendAvailabilities = {},
  invitedFriends = [],
  onToggle,
  selectedDateTime,
  onSelectDateTime,
  editable = false,
}: AvailabilityCalendarProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));

  const prevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const getDateTimeString = (dayOffset: number, hour: number) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayOffset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(hour).padStart(2, "0")}`;
  };

  const getAvailabilityLevel = (dayOffset: number, hour: number) => {
    const dateTimeStr = getDateTimeString(dayOffset, hour);
    const userAvailable = availability[dateTimeStr];

    if (invitedFriends.length === 0) {
      return userAvailable ? "full" : "empty";
    }

    let availableCount = userAvailable ? 1 : 0;
    invitedFriends.forEach((friendId) => {
      if (friendAvailabilities[friendId]?.[dateTimeStr]) {
        availableCount++;
      }
    });

    const totalPeople = invitedFriends.length + 1;
    const ratio = availableCount / totalPeople;

    if (ratio >= 0.8) return "full";
    if (ratio >= 0.4) return "partial";
    return "empty";
  };

  const getWeekDates = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();
  const monthYear = currentWeekStart.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="border border-border rounded-2xl p-4">
      <div className="flex justify-center mb-4">
        <img src={lettuceLogo} alt="LettuceEat" className="w-10 h-10" />
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={prevWeek} className="p-1 hover:bg-muted rounded-full transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-foreground min-w-[160px] text-center">
          {monthYear}
        </span>
        <button onClick={nextWeek} className="p-1 hover:bg-muted rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="w-14" /> {/* Empty corner */}
            {weekDates.map((date, i) => (
              <div key={i} className="text-center">
                <div className="text-xs font-medium text-muted-foreground">{DAYS[date.getDay()]}</div>
                <div className="text-sm font-bold text-foreground">{date.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="max-h-[400px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
                <div className="w-14 text-xs text-muted-foreground flex items-center justify-end pr-2">
                  {formatHour(hour)}
                </div>
                {weekDates.map((_, dayOffset) => {
                  const dateTimeStr = getDateTimeString(dayOffset, hour);
                  const level = getAvailabilityLevel(dayOffset, hour);
                  const isSelected = selectedDateTime === dateTimeStr;

                  return (
                    <button
                      key={dayOffset}
                      onClick={() => {
                        if (editable && onToggle) {
                          onToggle(dateTimeStr);
                        } else if (onSelectDateTime) {
                          onSelectDateTime(dateTimeStr);
                        }
                      }}
                      className={`h-8 rounded-md transition-all ${
                        level === "full"
                          ? "bg-primary/80 hover:bg-primary"
                          : level === "partial"
                          ? "bg-primary/40 hover:bg-primary/50"
                          : "bg-muted hover:bg-muted/80"
                      } ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-primary/80" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-primary/40" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-muted" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
};
