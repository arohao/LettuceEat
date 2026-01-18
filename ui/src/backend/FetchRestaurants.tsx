import { useEffect, useRef, useState, useCallback } from "react";
import { RestaurantCard } from "@/components/RestaurantCard";
import type { Restaurant } from "@/data/mockData";
import { restaurants as mockRestaurants } from "@/data/mockData";
import { RestaurantSkeleton} from "@/components/transition/RestaurantSkeleton";
import {
  getCachedRestaurants,
  setCachedRestaurants,
  isCacheFresh,
} from "@/lib/restaurantCache";

import sushiFallback from "@/assets/sushi-restaurant.jpg";

type Props = {
  foodType?: string;
};

// -------------------------------
// Stable ID generation
// -------------------------------
function generateRestaurantId(name: string, address: string): string {
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
  const normalizedAddress = address.toLowerCase().replace(/\s+/g, "-");
  return `${normalizedName}-${normalizedAddress}`;
}

// -------------------------------
// Backend → Frontend mapper
// -------------------------------
const mapBackendRestaurant = (r: any): Restaurant => {
  const name = r.restaurant_name ?? "Unknown Restaurant";
  const address = r.address ?? "Address not available";
  
  return {
    id: generateRestaurantId(name, address),
    name,
    address,
    priceRange: r.price ?? "$$",
    rating: typeof r.rating === "number" ? r.rating : 4.0,
    category: r.cuisine ?? "Other",
    image: r.imageUrl ?? sushiFallback,
    menuImages: Array.isArray(r.photos) && r.photos.length > 0
      ? r.photos
      : [sushiFallback],
  };
};

export const RestaurantFetcher: React.FC<Props> = ({
  foodType = "restaurants",
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const cacheUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedDataRef = useRef<boolean>(false);
  const foodTypeRef = useRef<string>(foodType);
  
  // Keep foodType ref in sync
  useEffect(() => {
    foodTypeRef.current = foodType;
  }, [foodType]);

  // -------------------------------
  // Get filtered mock restaurants based on foodType
  // -------------------------------
  const getFilteredMockRestaurants = useCallback((): Restaurant[] => {
    const normalizedFoodType = foodType.toLowerCase().trim();
    
    // Map common food types to categories
    const categoryMap: Record<string, string> = {
      "sushi": "Sushi",
      "burgers": "Burgers",
      "burger": "Burgers",
      "italian": "Italian",
      "pizza": "Pizza",
      "thai": "Thai",
    };

    const category = categoryMap[normalizedFoodType];
    
    if (category) {
      return mockRestaurants.filter((r) => r.category === category);
    }
    
    // If no specific category match, return all mock restaurants
    return mockRestaurants;
  }, [foodType]);

  // -------------------------------
  // Debounced cache update
  // -------------------------------
  const updateCache = useCallback((restaurants: Restaurant[]) => {
    // Clear existing timeout
    if (cacheUpdateTimeoutRef.current) {
      clearTimeout(cacheUpdateTimeoutRef.current);
    }

    // Debounce cache updates (wait 500ms after last update)
    cacheUpdateTimeoutRef.current = setTimeout(() => {
      setCachedRestaurants(foodType, restaurants);
    }, 500);
  }, [foodType]);

  // -------------------------------
  // Start SSE stream
  // -------------------------------
  const startStream = useCallback(() => {
    // Close any existing stream and clear timeouts
    eventSourceRef.current?.close();
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    setError(null);
    hasReceivedDataRef.current = false;

    // Check cache first
    const cached = getCachedRestaurants(foodType);
    if (cached && cached.length > 0) {
      setRestaurants(cached);
      setIsLoadingFromCache(false);
      hasReceivedDataRef.current = true; // Cache counts as received data
      
      // If cache is fresh (less than 5 minutes old), skip fetching entirely
      const cacheIsFresh = isCacheFresh(foodType, 300000);
      if (cacheIsFresh) {
        console.log(`[Cache] "${foodType}" is fresh (< 5min), skipping fetch`);
        return; // Don't start SSE stream - exit early
      }
      console.log(`[Cache] "${foodType}" exists but is stale, revalidating in background`);
      // For stale cache, keep showing it but allow new data to replace it
      // Don't clear restaurants - let new data append/replace as it arrives
    } else {
      console.log(`[Cache] No cache for "${foodType}", fetching from API`);
      setRestaurants([]);
      setIsLoadingFromCache(false);
    }

    // Only reach here if we need to fetch (no cache or stale cache)
    console.log(`[Fetch] Starting SSE stream for "${foodType}"`);
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

    // Log connection status
    es.onopen = () => {
      console.log(`[SSE] Connection opened for "${foodType}"`);
    };

    // Set a timeout to detect if no data arrives (2 minutes - scraper can take 40-60 seconds)
    // Only timeout if we haven't received ANY data at all
    fetchTimeoutRef.current = setTimeout(() => {
      // Check current state using refs
      if (!hasReceivedDataRef.current) {
        console.warn("[Timeout] No data received after 2 minutes, using mock restaurants");
        es.close();
        setRestaurants((current) => {
          if (current.length === 0) {
            const mockData = getFilteredMockRestaurants();
            if (mockData.length > 0) {
              setIsLoadingFromCache(false);
              setError("Unable to fetch restaurants. Showing sample data.");
              return mockData;
            }
          }
          return current;
        });
      } else {
        console.log("[Timeout] Data was received, timeout cleared");
      }
    }, 120000); // 2 minutes (120 seconds) - enough time for scraper to complete
 
    // Handle all SSE events
    const handleRestaurantData = (event: MessageEvent) => {
      console.log(`[SSE] Received data:`, event.type, event.data?.substring(0, 100));
      
      try {
        const raw = JSON.parse(event.data);
        const mapped = mapBackendRestaurant(raw);
        console.log(`[SSE] Parsed restaurant:`, mapped.name);

        setRestaurants((prev) => {
          // Check if restaurant already exists (by ID)
          const existingIndex = prev.findIndex((r) => r.id === mapped.id);
          
          let updated: Restaurant[];
          if (existingIndex >= 0) {
            // Replace existing restaurant with updated data
            updated = [...prev];
            updated[existingIndex] = mapped;
            console.log(`[Update] Replacing existing restaurant: ${mapped.name}`);
          } else {
            // Add new restaurant
            updated = [...prev, mapped];
            console.log(`[Add] New restaurant: ${mapped.name} (total: ${updated.length})`);
          }
          
          // Save to cache immediately using the current foodType
          // Use ref to ensure we have the latest foodType value
          const currentFoodType = foodTypeRef.current;
          try {
            setCachedRestaurants(currentFoodType, updated);
            console.log(`[Cache] ✓ Saved ${updated.length} restaurants for "${currentFoodType}"`);
          } catch (cacheErr) {
            console.error("[Cache] ✗ Error saving cache:", cacheErr);
          }
          
          // Also update debounced cache for efficiency
          updateCache(updated);
          setIsLoadingFromCache(false);
          
          // Clear timeout on first data - we know connection works now
          // Stream will stay open to receive more restaurants until server closes it
          const wasFirstData = !hasReceivedDataRef.current;
          hasReceivedDataRef.current = true;
          
          if (wasFirstData && fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
            console.log("[SSE] First data received, timeout cleared - stream will stay open for more data");
          }
          
          return updated;
        });
      } catch (err) {
        console.error("[SSE] Error parsing chunk:", err, "Data:", event.data?.substring(0, 200));
      }
    };

    // Listen for both "chunk" and "message" events (SSE defaults to "message" if no event type)
    es.addEventListener("chunk", handleRestaurantData);
    es.addEventListener("message", handleRestaurantData);
    
    // Optional progress updates
    es.addEventListener("progress", (event) => {
      console.log("[Progress]:", event.data);
    });

    es.onerror = (err) => {
      console.error("[SSE] Error:", err);
      console.log("[SSE] ReadyState:", es.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSED
      
      // If stream is closed, it might have completed successfully
      if (es.readyState === EventSource.CLOSED) {
        console.log("[SSE] Stream closed - fetch completed");
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        setIsLoadingFromCache(false);
        return;
      }
      
      // Otherwise, it's an actual error
      es.close();
      
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      setIsLoadingFromCache(false);
      
      // If no restaurants were loaded (no cache and no data), use mock data
      // Check state after a brief delay to ensure state has settled
      setTimeout(() => {
        setRestaurants((current) => {
          if (current.length === 0 && !hasReceivedDataRef.current) {
            console.log("[Fallback] Using mock restaurants");
            const mockData = getFilteredMockRestaurants();
            if (mockData.length > 0) {
              setIsLoadingFromCache(false);
              setError("Unable to fetch restaurants. Showing sample data.");
              return mockData;
            }
          }
          return current;
        });
      }, 100);
    };
  }, [foodType, updateCache, getFilteredMockRestaurants]);

  // Start on mount
  useEffect(() => {
    startStream();

    return () => {
      eventSourceRef.current?.close();
      if (cacheUpdateTimeoutRef.current) {
        clearTimeout(cacheUpdateTimeoutRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [startStream]);

  // -------------------------------
  // Render
  // -------------------------------
  // Show loading skeleton only if we have no restaurants and no cache was loaded
  const isLoading = restaurants.length === 0 && !error && !isLoadingFromCache;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {/* Skeleton loader - only show when truly loading (no cache) */}
      <RestaurantSkeleton visible={isLoading} />
      <RestaurantSkeleton visible={isLoading} />
      <RestaurantSkeleton visible={isLoading} />

      {/* Live streamed cards */}
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
        />
      ))}
    </div>
  );
};
