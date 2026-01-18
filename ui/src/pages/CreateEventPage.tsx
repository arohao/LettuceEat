import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { categories, generateAvailability, friendAvailabilities, restaurants, friends } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

export const CreateEventPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const invitedFriends = (location.state as { invitedFriends?: string[] })?.invitedFriends || [];
  const invitedEmails = (location.state as { invitedEmails?: string[] })?.invitedEmails || [];
  const restaurant = restaurants.find((r) => r.id === id);
  
  const [eventName, setEventName] = useState("");
  const [message, setMessage] = useState("");
  const [foodType, setFoodType] = useState("");
  const [comparisonMetric, setComparisonMetric] = useState("overall best experience");
  const [maxWords, setMaxWords] = useState("25");
  const [comparisonOutput, setComparisonOutput] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string | undefined>();
  const [userAvailability] = useState(() => generateAvailability());

  const handleCompare = async () => {
    setIsComparing(true);
    setCompareError(null);
    setComparisonOutput(null);

    const parsedMaxWords = Number.parseInt(maxWords, 10);
    const safeMaxWords = Number.isFinite(parsedMaxWords) && parsedMaxWords > 0 ? parsedMaxWords : 25;
    const resolvedFoodType = foodType.trim() || restaurant?.category || "Local Cuisine";

    try {
      const response = await fetch("http://localhost:3000/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodType: resolvedFoodType,
          comparisonMetric: comparisonMetric.trim(),
          maxWords: safeMaxWords,
        }),
      });

      if (!response.ok) {
        throw new Error("Compare request failed");
      }

      const data = await response.json();
      setComparisonOutput(data?.text || "No review returned.");
    } catch (error) {
      console.error(error);
      setCompareError("Unable to compare restaurants right now.");
    } finally {
      setIsComparing(false);
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

    const selectedEmails = invitedEmails.length
      ? invitedEmails
      : friends
          .filter((friend) => invitedFriends.includes(friend.id))
          .map((friend) => friend.email);

    try {
      console.log("Calling Zapier webhook for invites", {
        emails: selectedEmails,
        eventName: eventName.trim(),
        restaurant: restaurant?.name || null,
        dateTime: selectedDateTime,
        friendMessage: message.trim() || null,
        comparisonOutput,
        foodType: (foodType.trim() || restaurant?.category || "Local Cuisine"),
        comparisonMetric: comparisonMetric.trim(),
        maxWords: Number.parseInt(maxWords, 10) || 25,
      });
      const zapierResponse = await fetch(
        "https://hooks.zapier.com/hooks/catch/21189459/ugpnbit/",
        {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            emails: selectedEmails,
            eventName: eventName.trim(),
            restaurant: restaurant?.name || null,
            dateTime: selectedDateTime,
            friendMessage: message.trim() || null,
            output: comparisonOutput,
            foodType: (foodType.trim() || restaurant?.category || "Local Cuisine"),
            comparisonMetric: comparisonMetric.trim() || null,
            maxWords: Number.parseInt(maxWords, 10) || 25,
          }),
        },
      );
      console.log("Zapier webhook response (opaque)", {
        type: zapierResponse.type,
      });
    } catch (error) {
      console.error("Zapier webhook failed", error);
    }

    toast({
      title: "Invites sent! 🎉",
      description: `Your event "${eventName}" at ${restaurant?.name} has been created!`,
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

        <div className="border-t border-border pt-6">
          <h2 className="font-bold text-foreground mb-4">Compare Restaurants</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Food type
              </label>
              <select
                value={foodType || restaurant?.category || "Local Cuisine"}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full bg-muted rounded-xl py-2.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Local Cuisine">Local Cuisine</option>
                {categories
                  .filter((category) => category !== "All")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Comparison criteria
              </label>
              <input
                type="text"
                value={comparisonMetric}
                onChange={(e) => setComparisonMetric(e.target.value)}
                className="w-full bg-muted rounded-xl py-2.5 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="overall best experience"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Max words
              </label>
              <input
                type="number"
                min={1}
                value={maxWords}
                onChange={(e) => setMaxWords(e.target.value)}
                className="w-full bg-muted rounded-xl py-2.5 px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={handleCompare}
              className="btn-primary"
              disabled={isComparing}
            >
              {isComparing ? "Comparing..." : "Run Comparison"}
            </button>
            {compareError && (
              <p className="text-sm text-destructive">{compareError}</p>
            )}
            {comparisonOutput && !compareError && (
              <p className="text-sm text-muted-foreground">{comparisonOutput}</p>
            )}
          </div>
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
