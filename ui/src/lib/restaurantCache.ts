import type { Restaurant } from "@/data/mockData";

const CACHE_PREFIX = "restaurant_cache:";
const CACHE_EXPIRY_MS = 3600000; // 1 hour

interface CacheEntry {
  restaurants: Restaurant[];
  timestamp: number;
}

/**
 * Normalizes foodType to ensure consistent cache keys
 */
function normalizeFoodType(foodType: string): string {
  return foodType.toLowerCase().trim();
}

/**
 * Gets the cache key for a given foodType
 */
function getCacheKey(foodType: string): string {
  return `${CACHE_PREFIX}${normalizeFoodType(foodType)}`;
}

/**
 * Checks if a cache timestamp is still valid
 */
export function isCacheValid(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < CACHE_EXPIRY_MS;
}

/**
 * Gets cache entry with timestamp for a given foodType
 * Returns null if cache is missing or expired
 */
export function getCacheEntry(foodType: string): CacheEntry | null {
  try {
    const key = getCacheKey(foodType);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);
    
    if (!isCacheValid(entry.timestamp)) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch (error) {
    // Invalid JSON or other error - clear corrupted cache
    console.warn("Failed to read cache:", error);
    try {
      const key = getCacheKey(foodType);
      localStorage.removeItem(key);
    } catch {
      // Ignore errors during cleanup
    }
    return null;
  }
}

/**
 * Retrieves cached restaurants for a given foodType
 * Returns null if cache is missing or expired
 */
export function getCachedRestaurants(foodType: string): Restaurant[] | null {
  const entry = getCacheEntry(foodType);
  return entry ? entry.restaurants : null;
}

/**
 * Checks if cache is fresh (recently fetched, e.g., within last 5 minutes)
 * Used to determine if we should skip fetching
 */
export function isCacheFresh(foodType: string, maxAgeMs: number = 300000): boolean {
  try {
    const key = getCacheKey(foodType);
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return false;
    }

    const entry: CacheEntry = JSON.parse(cached);
    
    // Check if cache is still valid (within 1 hour expiry)
    if (!isCacheValid(entry.timestamp)) {
      return false;
    }
    
    // Check if cache is fresh (within the specified maxAgeMs, default 5 minutes)
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < maxAgeMs;
  } catch (error) {
    console.warn("Failed to check cache freshness:", error);
    return false;
  }
}

/**
 * Stores restaurants in cache for a given foodType
 * Handles localStorage quota errors gracefully
 */
export function setCachedRestaurants(foodType: string, restaurants: Restaurant[]): void {
  try {
    const key = getCacheKey(foodType);
    const entry: CacheEntry = {
      restaurants,
      timestamp: Date.now(),
    };
    
    const serialized = JSON.stringify(entry);
    localStorage.setItem(key, serialized);
    
    // Verify it was saved
    const verify = localStorage.getItem(key);
    if (verify) {
      console.log(`[Cache] ✓ Saved ${restaurants.length} restaurants for "${foodType}" (key: ${key})`);
    } else {
      console.error(`[Cache] ✗ Failed to verify cache save for "${foodType}"`);
    }
  } catch (error) {
    // localStorage quota exceeded or other error
    console.error("[Cache] Failed to write cache:", error);
    // Gracefully degrade - continue without caching
  }
}

/**
 * Clears the cache for a specific foodType
 */
export function clearCache(foodType: string): void {
  try {
    const key = getCacheKey(foodType);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}

/**
 * Gets a restaurant by ID from all cache entries
 * Searches through all cached foodTypes to find the restaurant
 */
export function getRestaurantById(id: string): Restaurant | null {
  try {
    const keys: string[] = [];
    
    // Collect all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    // Search through all cache entries
    for (const key of keys) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (isCacheValid(entry.timestamp)) {
            const restaurant = entry.restaurants.find((r) => r.id === id);
            if (restaurant) {
              return restaurant;
            }
          }
        }
      } catch {
        // Skip invalid entries
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.warn("Failed to search cache for restaurant:", error);
    return null;
  }
}

/**
 * Gets all cached restaurants from all cache entries
 * Returns an array of all unique restaurants across all caches
 */
export function getAllCachedRestaurants(): Restaurant[] {
  try {
    const allRestaurants: Restaurant[] = [];
    const seenIds = new Set<string>();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (isCacheValid(entry.timestamp)) {
              entry.restaurants.forEach((restaurant) => {
                if (!seenIds.has(restaurant.id)) {
                  seenIds.add(restaurant.id);
                  allRestaurants.push(restaurant);
                }
              });
            }
          }
        } catch {
          continue;
        }
      }
    }
    return allRestaurants;
  } catch (error) {
    console.warn("Failed to get all cached restaurants:", error);
    return [];
  }
}

/**
 * Gets all restaurants by category from cache and mock data
 * Combines cached restaurants with mock restaurants, filtering by category
 */
export function getRestaurantsByCategory(category: string, mockRestaurants: Restaurant[]): Restaurant[] {
  const cached = getAllCachedRestaurants();
  const cachedByCategory = cached.filter((r) => r.category === category);
  const mockByCategory = mockRestaurants.filter((r) => r.category === category);
  
  // Combine and deduplicate by ID
  const seenIds = new Set<string>();
  const combined: Restaurant[] = [];
  
  [...cachedByCategory, ...mockByCategory].forEach((restaurant) => {
    if (!seenIds.has(restaurant.id)) {
      seenIds.add(restaurant.id);
      combined.push(restaurant);
    }
  });
  
  return combined;
}

/**
 * Clears all expired caches
 * Useful for periodic cleanup
 */
export function clearExpiredCaches(): void {
  try {
    const keys: string[] = [];
    
    // Collect all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    // Check and remove expired entries
    keys.forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (!isCacheValid(entry.timestamp)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Invalid entry, remove it
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Failed to clear expired caches:", error);
  }
}
