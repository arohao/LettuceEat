import { useEffect, useRef, useState } from "react";
import { RestaurantCard } from "@/components/RestaurantCard";
import type { Restaurant } from "@/data/mockData";

import sushiFallback from "@/assets/sushi-restaurant.jpg";

type Props = {
  foodType?: string;
};

// -------------------------------
// Backend → Frontend mapper
// -------------------------------
const mapBackendRestaurant = (r: any): Restaurant => ({
  id: crypto.randomUUID(),
  name: r.name ?? "Unknown Restaurant",
  address: r.address ?? "Address not available",
  priceRange: r.price ?? "$$",
  rating: typeof r.rating === "number" ? r.rating : 4.0,
  category: r.cuisine ?? "Other",
  image: r.imageUrl ?? sushiFallback,
  menuImages: Array.isArray(r.photos) && r.photos.length > 0
    ? r.photos
    : [sushiFallback],
});

export const RestaurantFetcher: React.FC<Props> = ({
  foodType = "restaurants",
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // -------------------------------
  // Start SSE stream
  // -------------------------------
  const startStream = () => {
    // Close any existing stream
    eventSourceRef.current?.close();
    setRestaurants([]);
    setError(null);

    const url = encodeURIComponent(
      `https://www.google.com/maps/search/${foodType}+in+ottawa/`
    );

    const prompt = encodeURIComponent(
      `Extract restaurant details for ${foodType} in Ottawa: name, address, rating, price, cuisine, photos`
    );

    const es = new EventSource(
      `http://localhost:3000/extract?url=${url}&prompt=${prompt}`
    );

    eventSourceRef.current = es;

    // Optional progress updates
    es.addEventListener("progress", (event) => {
      console.log("Progress:", event.data);
    });

    // Each restaurant arrives here 👇
    es.addEventListener("chunk", (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data);
        const mapped = mapBackendRestaurant(raw);

        setRestaurants((prev) => [...prev, mapped]);
      } catch (err) {
        console.error("Invalid chunk:", err);
      }
    });

    es.onerror = (err) => {
      console.error("SSE error:", err);
      es.close();
    };
  };

  // Start on mount
  useEffect(() => {
    startStream();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [foodType]);

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
        />
      ))}

      {restaurants.length === 0 && !error && (
        <div className="text-sm text-muted-foreground">
          Loading restaurants…
        </div>
      )}
    </div>
  );
};
