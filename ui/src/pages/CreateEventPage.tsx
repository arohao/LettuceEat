import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { generateAvailability, friendAvailabilities, restaurants, friends } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantById } from "@/lib/restaurantCache";
import type { Restaurant } from "@/data/mockData";

export const CreateEventPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const invitedFriends = (location.state as { invitedFriends?: string[] })?.invitedFriends || [];
  const invitedEmails = (location.state as { invitedEmails?: string[] })?.invitedEmails || [];
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
  const [comparisonOutput, setComparisonOutput] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string | undefined>();
  const [userAvailability] = useState(() => generateAvailability());
  const [isSending, setIsSending] = useState(false);

  const generateAIComparison = async (): Promise<string | null> => {
    const resolvedFoodType = restaurant?.category || "Local Cuisine";
    const comparisonMetric = "overall best experience";
    const maxWords = 25;
    const invitedNames = friends
      .filter((friend) => invitedFriends.includes(friend.id))
      .map((friend) => friend.name);

    const API =
      import.meta.env.PROD
      ? "https://uottahack8.onrender.com"
      : "http://localhost:3000";

    try {
      const response = await fetch(`${API}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodType: resolvedFoodType,
          comparisonMetric: comparisonMetric,
          maxWords: maxWords,
          eventName: eventName.trim() || null,
          restaurantName: restaurant?.name || null,
          dateTime: selectedDateTime || null,
          friendMessage: message.trim() || null,
          invited: invitedNames,
        }),
      });

      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage = "Compare request failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
        console.error("[AI Comparison] Error response:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data?.text || "No review returned.";
    } catch (error) {
      console.error("[AI Comparison] Request error:", error);
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unable to generate plan right now. Please check your connection and try again.");
    }
  };

  const handleSendInvite = async () => {
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

    setIsSending(true);

    try {
      // Automatically generate AI message
      let aiOutput = comparisonOutput;
      if (!aiOutput) {
        try {
          aiOutput = await generateAIComparison();
          setComparisonOutput(aiOutput);
        } catch (error) {
          setIsSending(false);
          toast({
            title: "Failed to generate plan",
            description: "Please try again",
            variant: "destructive",
          });
          return;
        }
      }

      const selectedEmails = invitedEmails.length
        ? invitedEmails
        : friends
            .filter((friend) => invitedFriends.includes(friend.id))
            .map((friend) => friend.email);

      const resolvedFoodType = restaurant?.category || "Local Cuisine";
      const friendMessageText = message.trim() || "";
      const restaurantName = restaurant?.name || "";
      const restaurantRating = restaurant?.rating 
        ? (typeof restaurant.rating === 'number' ? restaurant.rating.toFixed(1) : String(restaurant.rating))
        : "";
      
      // Structure the payload to match the Python code's expected format
      // The Python code expects: raw_output (JSON string) -> raw_body (JSON string) -> actual fields
      // Ensure all values are strings (not null) to avoid Python NoteType errors
      const innerPayload = {
        output: aiOutput || "",
        foodType: resolvedFoodType || "",
        friend_message: friendMessageText,
      };
      
      const outerPayload = {
        raw_body: JSON.stringify(innerPayload),
      };
      
      const webhookPayload = {
        raw_output: JSON.stringify(outerPayload),
        emails: selectedEmails,
        eventName: eventName.trim() || "",
        restaurant: restaurantName,
        restaurantRating: restaurantRating, // Add restaurant rating
        dateTime: selectedDateTime || "",
        friendMessage: friendMessageText,
        output: aiOutput || "",
        foodType: resolvedFoodType || "",
        comparisonMetric: "overall best experience",
        maxWords: "25", // Convert to string for Python
      };
      
      // Debug logging to verify all fields are present
      console.log("Calling Zapier webhook for invites", {
        ...webhookPayload,
        restaurantValue: restaurantName,
        restaurantLength: restaurantName.length,
        friendMessageValue: friendMessageText,
        friendMessageLength: friendMessageText.length,
      });
      
      // Use backend proxy to avoid CORS issues
      const API = import.meta.env.PROD
        ? "https://uottahack8.onrender.com"
        : "http://localhost:3000";
      
      const zapierResponse = await fetch(`${API}/zapier/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });
      
      const responseData = await zapierResponse.json();
      console.log("Zapier webhook response", responseData);

      toast({
        title: "Invites sent! 🎉",
        description: `Your event "${eventName.trim()}" at ${restaurant?.name} has been created!`,
      });
      
      navigate("/");
    } catch (error) {
      console.error("Zapier webhook failed", error);
      toast({
        title: "Failed to send invites",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
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
          <button 
            onClick={handleSendInvite} 
            className="btn-primary"
            disabled={isSending}
          >
            {isSending 
              ? (comparisonOutput ? "Sending..." : "Generating plan...") 
              : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
};
