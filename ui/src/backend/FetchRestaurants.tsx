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
import {
  getRestaurantImage,
  getRestaurantMenuImages,
} from "@/lib/imageUtils";
import { apiEndpoint } from "@/lib/apiConfig";

type Props = {
  foodType?: string;
  searchQuery?: string;
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
  const category = r.cuisine ?? "Other";
  
  return {
    id: generateRestaurantId(name, address),
    name,
    address,
    priceRange: r.price ?? "$$",
    rating: typeof r.rating === "number" ? r.rating : 4.0,
    category,
    // Use utility function to get image with category-based fallback
    image: getRestaurantImage(r.imageUrl, category),
    // Use utility function to get menu images with category-based fallback
    menuImages: getRestaurantMenuImages(r.photos, category),
  };
};

export const RestaurantFetcher: React.FC<Props> = ({
  foodType = "restaurants",
  searchQuery = "",
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
  // Start hybrid fetch: Gemini first, then YellowCake enrichment
  // -------------------------------
  const startStream = useCallback(() => {
    // Close any existing stream and clear timeouts
    eventSourceRef.current?.close();
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    if (cacheUpdateTimeoutRef.current) {
      clearTimeout(cacheUpdateTimeoutRef.current);
    }
    setError(null);
    hasReceivedDataRef.current = false;

    // Check cache first - PRIORITY: avoid API calls if cache is fresh
    const cached = getCachedRestaurants(foodType);
    
    // If cache exists and is fresh (less than 1 hour old), skip ALL API calls to save credits
    if (cached && cached.length > 0) {
      const cacheIsFresh = isCacheFresh(foodType, 3600000); // 1 hour (3600000ms)
      if (cacheIsFresh) {
        console.log(`[Cache] ✓ "${foodType}" is fresh (< 1hr), using cache only - SKIPPING Gemini & YellowCake API calls`);
        setRestaurants(cached);
        setIsLoadingFromCache(false);
        hasReceivedDataRef.current = true;
        return; // Exit early - don't call ANY APIs (saves credits)
      }
      
      // Cache exists but is stale - show it immediately, then revalidate in background
      console.log(`[Cache] "${foodType}" exists but is stale (> 1hr), showing cache and revalidating in background`);
      setRestaurants(cached);
      setIsLoadingFromCache(false);
      hasReceivedDataRef.current = true;
      // Continue to fetch new data below to update the cache
    } else {
      console.log(`[Cache] No cache for "${foodType}", fetching from Gemini & YellowCake APIs`);
      setRestaurants([]);
      setIsLoadingFromCache(false);
    }

    // Only reach here if we need to fetch (no cache or stale cache)
    console.log(`[Hybrid Fetch] Starting API calls for "${foodType}"`);
    
    // Step 1: Get fast results from Gemini (2-5 seconds)
    const fetchGeminiResults = async () => {
      try {
        console.log(`[Gemini] Fetching restaurant list for "${foodType}"...`);
        const response = await fetch(
          `${apiEndpoint("restaurants/gemini")}?foodType=${encodeURIComponent(foodType)}&location=Ottawa`
        );
        
        if (!response.ok) {
          throw new Error(`Gemini fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.restaurants && Array.isArray(data.restaurants)) {
          console.log(`[Gemini] ✓ Got ${data.restaurants.length} restaurants quickly`);
          
          // Map Gemini results to our format
          const geminiRestaurants = data.restaurants.map((r: any) => mapBackendRestaurant(r));
          
          // Show Gemini results immediately
          setRestaurants((prev) => {
            // Merge with existing (avoid duplicates by ID, preserve existing data like overview)
            const merged: Restaurant[] = [...prev];
            const existingIds = new Set(prev.map((r) => r.id));
            
            geminiRestaurants.forEach((newRestaurant) => {
              const existingIndex = merged.findIndex((r) => r.id === newRestaurant.id);
              if (existingIndex >= 0) {
                // Merge: preserve existing overview and other fields
                merged[existingIndex] = {
                  ...newRestaurant,
                  overview: merged[existingIndex].overview, // Preserve existing overview
                  image: merged[existingIndex].image || newRestaurant.image,
                  menuImages: merged[existingIndex].menuImages || newRestaurant.menuImages,
                };
              } else {
                // New restaurant
                merged.push(newRestaurant);
              }
            });
            
            // Save to cache immediately
            const currentFoodType = foodTypeRef.current;
            try {
              setCachedRestaurants(currentFoodType, merged);
              console.log(`[Cache] ✓ Saved ${merged.length} restaurants (from Gemini)`);
            } catch (cacheErr) {
              console.error("[Cache] ✗ Error saving cache:", cacheErr);
            }
            
            return merged;
          });
          
          setIsLoadingFromCache(false);
          hasReceivedDataRef.current = true;
        }
      } catch (err) {
        console.error("[Gemini] Error fetching restaurants:", err);
        // Don't set error - we'll still try YellowCake
      }
    };

    // Step 2: Start YellowCake scraping in parallel for enrichment
    // NOTE: This will only run if cache is missing or stale (> 1 hour old)
    const startYellowCakeScraping = () => {
      console.log(`[YellowCake] 💰 API CALL: Starting enrichment scraping for "${foodType}"...`);
      const url = encodeURIComponent(
        `https://www.google.com/maps/search/${foodType}+in+ottawa/`
      );

      const prompt = encodeURIComponent(
        `Extract restaurant details for ${foodType} in Ottawa. For each restaurant, provide:
- name (exact restaurant name)
- address (full street address)
- rating (numeric rating out of 5)
- price (price range: $, $$, $$$, or $$$$)
- cuisine (cuisine type)

Do NOT extract images or photos - skip image extraction to save time.`
      );

      const es = new EventSource(
        `${apiEndpoint("extract")}?url=${url}&prompt=${prompt}`
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
          console.warn("[YellowCake Timeout] No data received after 2 minutes");
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
          console.log("[YellowCake Timeout] Data was received, timeout cleared");
        }
      }, 120000); // 2 minutes (120 seconds) - enough time for scraper to complete
 
      // Handle all SSE events from YellowCake (enrichment data)
      const handleRestaurantData = (event: MessageEvent) => {
        console.log(`[YellowCake] Received data:`, event.type, event.data?.substring(0, 100));
        
        try {
          const raw = JSON.parse(event.data);
          const mapped = mapBackendRestaurant(raw);
          console.log(`[YellowCake] Parsed restaurant:`, mapped.name);

          setRestaurants((prev) => {
            // Check if restaurant already exists (by ID) - merge/enrich data
            const existingIndex = prev.findIndex((r) => r.id === mapped.id);
            
            let updated: Restaurant[];
            if (existingIndex >= 0) {
              // Enrich existing restaurant with YellowCake data (photos, ratings, etc.)
              const existing = prev[existingIndex];
              updated = [...prev];
              updated[existingIndex] = {
                ...existing,
                ...mapped,
                // Keep existing images (we're not extracting images from YellowCake anymore)
                image: existing.image,
                menuImages: existing.menuImages,
                // Preserve existing overview
                overview: existing.overview,
                // Prefer YellowCake data for ratings/prices if available
                rating: mapped.rating || existing.rating,
                priceRange: mapped.priceRange || existing.priceRange,
              };
              console.log(`[Enrich] Enriched restaurant with YellowCake data: ${mapped.name}`);
            } else {
              // Add new restaurant from YellowCake
              updated = [...prev, mapped];
              console.log(`[Add] New restaurant from YellowCake: ${mapped.name} (total: ${updated.length})`);
            }
            
            // Save to cache immediately using the current foodType
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
            const wasFirstData = !hasReceivedDataRef.current;
            hasReceivedDataRef.current = true;
            
            if (wasFirstData && fetchTimeoutRef.current) {
              clearTimeout(fetchTimeoutRef.current);
              fetchTimeoutRef.current = null;
              console.log("[YellowCake] First data received, timeout cleared");
            }
            
            return updated;
          });
        } catch (err) {
          console.error("[YellowCake] Error parsing chunk:", err, "Data:", event.data?.substring(0, 200));
        }
      };

      // Listen for both "chunk" and "message" events (SSE defaults to "message" if no event type)
      es.addEventListener("chunk", handleRestaurantData);
      es.addEventListener("message", handleRestaurantData);
      
      // Optional progress updates
      es.addEventListener("progress", (event) => {
        console.log("[YellowCake Progress]:", event.data);
      });

      es.onerror = (err) => {
        console.error("[YellowCake] Error:", err);
        console.log("[YellowCake] ReadyState:", es.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSED
      
        // SSE connections can close normally (readyState 2 = CLOSED)
        // Only treat as error if we haven't received any data AND connection closed unexpectedly
        if (es.readyState === EventSource.CLOSED && !hasReceivedDataRef.current) {
          console.warn("[YellowCake] Connection closed without receiving data");
          
          // Only show error/fallback if we have no restaurants at all
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
        }
      };
    };

    // Start both in parallel: Gemini for fast results, YellowCake for enrichment
    fetchGeminiResults();
    startYellowCakeScraping();
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
  // Filter restaurants by search query
  // -------------------------------
  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.address.toLowerCase().includes(query) ||
      restaurant.category.toLowerCase().includes(query)
    );
  });

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

      {/* Show message if search returns no results */}
      {!isLoading && filteredRestaurants.length === 0 && searchQuery.trim() && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No restaurants found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Live streamed cards */}
      {filteredRestaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
        />
      ))}
    </div>
  );
};
