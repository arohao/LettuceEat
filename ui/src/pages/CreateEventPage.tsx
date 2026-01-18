import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { generateAvailability, friendAvailabilities, restaurants } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantById } from "@/lib/restaurantCache";
import type { Restaurant } from "@/data/mockData";

export const CreateEventPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const invitedFriends = (location.state as { invitedFriends?: string[] })?.invitedFriends || [];
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  
  useEffect(() => {
    if (!id) {
      setRestaurant(null);
      return;
    }
    
    // First, try to find in cache (fetched restaurants)
    const cachedRestaurant = getRestaurantById(id);
    if (cachedRestaurant) {
      setRestaurant(cachedRestaurant);
      return;
    }
    
    // Fall back to mock data
    const mockRestaurant = restaurants.find((r) => r.id === id);
    setRestaurant(mockRestaurant || null);
  }, [id]);
  
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDateTime, setSelectedDateTime] = useState<string | undefined>();
  const [userAvailability] = useState(() => generateAvailability());

  const handleSendInvite = () => {
    if (!eventName.trim()) {
      toast({
        title: "Event name required",
        description: "Please enter an event name",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedDateTime) {
      toast({
        title: "Date and time required",
        description: "Please select a date and time for your event",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Invites sent! 🎉",
      description: `Your event "${eventName.trim()}" at ${restaurant?.name} has been created!`,
    });
    
    navigate("/");
  };

  return (
    <div className="mobile-container pb-32">
      <Header title="Event Details" showBack />

      <div className="px-4 space-y-6">
        <div>
          <label className="block font-semibold text-foreground mb-2">
            Event Name
          </label>
          <input
            type="text"
            placeholder="Celebration dinner"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full bg-muted rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block font-semibold text-foreground mb-2">
            Message to include
          </label>
          <input
            type="text"
            placeholder="Celebrating xyz"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-muted rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block font-semibold text-foreground mb-4">
            Check availabilities
          </label>
          <AvailabilityCalendar
            availability={userAvailability}
            friendAvailabilities={friendAvailabilities}
            invitedFriends={invitedFriends}
            selectedDateTime={selectedDateTime}
            onSelectDateTime={setSelectedDateTime}
          />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Darker green = more people available
          </p>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto">
          <button onClick={handleSendInvite} className="btn-primary">
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
};
