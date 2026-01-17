import { useState } from "react";
import { Header } from "@/components/Header";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { generateAvailability } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

export const AvailabilityPage = () => {
  const [availability, setAvailability] = useState(() => generateAvailability());
  const { toast } = useToast();

  const handleToggle = (dateTime: string) => {
    setAvailability((prev) => ({
      ...prev,
      [dateTime]: !prev[dateTime],
    }));
    
    const newValue = !availability[dateTime];
    const [year, month, day, hour] = dateTime.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour));
    const hourNum = parseInt(hour);
    const timeStr = hourNum === 0 ? "12 AM" : hourNum === 12 ? "12 PM" : hourNum < 12 ? `${hourNum} AM` : `${hourNum - 12} PM`;
    
    toast({
      title: newValue ? "Marked as available" : "Marked as unavailable",
      description: `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${timeStr}`,
    });
  };

  return (
    <div className="mobile-container pb-24">
      <Header title="My Availability" />

      <div className="px-4">
        <p className="text-muted-foreground text-sm mb-6 text-center">
          Tap on time slots to toggle your availability. Friends will see when you're free for dinner!
        </p>
        
        <AvailabilityCalendar
          availability={availability}
          onToggle={handleToggle}
          editable
        />
      </div>
    </div>
  );
};
