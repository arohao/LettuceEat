/**
 * Image utilities for restaurant images
 * Handles fallback images based on restaurant category
 */

import italianRestaurant from "@/assets/italian-restaurant.jpg";
import pizzaRestaurant from "@/assets/pizza-restaurant.jpg";

// Sushi folder assets
import sushi0 from "@/assets/sushi/sushi0.jpg";
import sushi1 from "@/assets/sushi/sushi1.jpg";
import sushi2 from "@/assets/sushi/sushi2.jpg";

// Burgor folder assets (note: folder name is "burgor" not "burger")
import burgor0 from "@/assets/burgor/burgor0.jpg";
import burgor1 from "@/assets/burgor/burgor1.jpg";
import burgor2 from "@/assets/burgor/burgor2.jpg";

/**
 * Sushi and Burgor image arrays for random selection
 */
const sushiImages = [sushi0, sushi1, sushi2];
const burgorImages = [burgor0, burgor1, burgor2];

/**
 * Combined array of all burgor and sushi images for random selection in "All" section
 */
const allFoodImages = [...burgorImages, ...sushiImages];

/**
 * Cache for category fallback images (so they stay consistent)
 */
const categoryImageCache: Record<string, string> = {};

/**
 * Cache for restaurant-specific images (for Burgers/Sushi randomization)
 * Key: restaurantId, Value: image path
 */
const restaurantImageCache: Record<string, string> = {};

/**
 * Cache for category menu images (so they stay consistent)
 */
const categoryMenuImageCache: Record<string, string[]> = {};

/**
 * Get a random image from an array and cache it for a category
 */
function getCachedRandomImage(category: string, images: string[]): string {
  // If already cached, return cached value
  if (categoryImageCache[category]) {
    return categoryImageCache[category];
  }
  
  // Otherwise, randomly select and cache
  const selected = images[Math.floor(Math.random() * images.length)];
  categoryImageCache[category] = selected;
  return selected;
}

/**
 * Get a random image for a specific restaurant (for Burgers/Sushi randomization)
 * Each restaurant gets its own random image that stays consistent
 */
function getRestaurantRandomImage(restaurantId: string, images: string[]): string {
  // If already cached for this restaurant, return cached value
  if (restaurantImageCache[restaurantId]) {
    return restaurantImageCache[restaurantId];
  }
  
  // Otherwise, randomly select and cache for this restaurant
  const selected = images[Math.floor(Math.random() * images.length)];
  restaurantImageCache[restaurantId] = selected;
  return selected;
}

/**
 * Get cached menu images for a category
 */
function getCachedMenuImages(category: string, images: string[]): string[] {
  // If already cached, return cached value
  if (categoryMenuImageCache[category]) {
    return categoryMenuImageCache[category];
  }
  
  // Otherwise, use all images and cache
  const selected = [...images];
  categoryMenuImageCache[category] = selected;
  return selected;
}

/**
 * Normalize category name (case-insensitive, trim whitespace)
 */
function normalizeCategory(category: string): string {
  return category.trim();
}

/**
 * Map cuisine category to image type
 * Returns: "burgor" | "sushi" | "italian" | "pizza" | "other"
 */
function getImageTypeForCategory(category: string): "burgor" | "sushi" | "italian" | "pizza" | "other" {
  const normalized = normalizeCategory(category).toLowerCase();
  
  // Burgor images: Burgers, American, Mexican, BBQ, Fast Food, etc.
  const burgorCategories = [
    "burgers", "burger", "american", "mexican", "bbq", "barbecue", "fast food", 
    "fast-food", "diner", "steakhouse", "steak", "pub", "gastropub", "comfort food"
  ];
  
  // Sushi images: Sushi, Japanese, Chinese, Asian, Seafood, Thai, Vietnamese, Korean, etc.
  const sushiCategories = [
    "sushi", "japanese", "chinese", "asian", "seafood", "thai", "vietnamese", 
    "korean", "ramen", "noodles", "dim sum", "dimsum", "poke", "sashimi", 
    "indian", "curry", "fusion", "pan-asian"
  ];
  
  // Italian image: Italian, Mediterranean, Greek, etc.
  const italianCategories = [
    "italian", "mediterranean", "greek", "turkish", "middle eastern", 
    "middle-eastern", "lebanese", "spanish", "tapas", "european"
  ];
  
  // Pizza image: Pizza
  const pizzaCategories = ["pizza", "pizzeria"];
  
  // Check for matches: exact match first, then substring match
  const checkMatch = (categories: string[], searchTerm: string): boolean => {
    // Exact match
    if (categories.includes(searchTerm)) return true;
    // Substring match (e.g., "American" matches "American Fusion")
    if (categories.some(cat => searchTerm.includes(cat))) return true;
    return false;
  };
  
  if (checkMatch(burgorCategories, normalized)) {
    return "burgor";
  }
  
  if (checkMatch(sushiCategories, normalized)) {
    return "sushi";
  }
  
  if (checkMatch(italianCategories, normalized)) {
    return "italian";
  }
  
  if (checkMatch(pizzaCategories, normalized)) {
    return "pizza";
  }
  
  // Default to other (will use burgor as fallback)
  return "other";
}

/**
 * Category-based fallback images mapping
 * Maps cuisine types to appropriate images from assets
 * @param category - Restaurant category
 * @param restaurantId - Optional restaurant ID for per-restaurant randomization (Burgers/Sushi)
 */
const getCategoryFallbackImageInternal = (category: string, restaurantId?: string): string => {
  const normalizedCategory = normalizeCategory(category);
  const imageType = getImageTypeForCategory(normalizedCategory);
  
  switch (imageType) {
    case "burgor":
      // For Burgers category, use restaurant-specific randomization if ID provided
      // This ensures each restaurant gets a different random image
      if (restaurantId) {
        return getRestaurantRandomImage(restaurantId, burgorImages);
      }
      return getCachedRandomImage(normalizedCategory, burgorImages);
    
    case "sushi":
      // For Sushi category, use restaurant-specific randomization if ID provided
      // This ensures each restaurant gets a different random image
      if (restaurantId) {
        return getRestaurantRandomImage(restaurantId, sushiImages);
      }
      return getCachedRandomImage(normalizedCategory, sushiImages);
    
    case "italian":
      return italianRestaurant;
    
    case "pizza":
      return pizzaRestaurant;
    
    case "other":
    default:
      // Default fallback to burgor
      return getCachedRandomImage("Other", burgorImages);
  }
};

/**
 * Get fallback menu images for a category
 * Uses the same image type mapping as thumbnails
 */
const getCategoryMenuFallbacksInternal = (category: string): string[] => {
  const normalizedCategory = normalizeCategory(category);
  const imageType = getImageTypeForCategory(normalizedCategory);
  
  // Check cache first
  if (categoryMenuImageCache[normalizedCategory]) {
    return categoryMenuImageCache[normalizedCategory];
  }
  
  let menuImages: string[];
  
  switch (imageType) {
    case "burgor":
      // Use all burgor images
      menuImages = getCachedMenuImages(normalizedCategory, burgorImages);
      break;
    
    case "sushi":
      // Use all sushi images
      menuImages = getCachedMenuImages(normalizedCategory, sushiImages);
      break;
    
    case "italian":
      // Italian + pizza + one random burgor
      menuImages = [
        italianRestaurant, 
        pizzaRestaurant, 
        getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages)
      ];
      break;
    
    case "pizza":
      // Pizza + italian + one random burgor
      menuImages = [
        pizzaRestaurant, 
        italianRestaurant, 
        getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages)
      ];
      break;
    
    case "other":
    default:
      // Mix of burgor, italian, pizza
      menuImages = [
        getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages), 
        italianRestaurant, 
        pizzaRestaurant
      ];
      break;
  }
  
  // Cache the result
  categoryMenuImageCache[normalizedCategory] = menuImages;
  return menuImages;
};

/**
 * Get fallback image for a restaurant category
 * @param category - Restaurant category (e.g., "Sushi", "Burgers")
 * @param restaurantId - Optional restaurant ID for per-restaurant randomization (Burgers/Sushi)
 * @returns Fallback image path (randomly selected for Sushi/Burgers)
 */
export function getCategoryFallbackImage(category: string | null | undefined, restaurantId?: string): string {
  if (!category) {
    // For undefined category, default to burgor
    return getCachedRandomImage("Other", burgorImages);
  }
  
  return getCategoryFallbackImageInternal(category, restaurantId);
}

/**
 * Get fallback menu images for a restaurant category
 * @param category - Restaurant category
 * @returns Array of fallback menu image paths (all images from folder for Sushi/Burgers)
 */
export function getCategoryMenuFallbacks(category: string | null | undefined): string[] {
  if (!category) {
    return [getCachedRandomImage("Other_menu", burgorImages), italianRestaurant, pizzaRestaurant];
  }
  
  return getCategoryMenuFallbacksInternal(category);
}

/**
 * Validate if an image URL is valid
 * Checks for common image URL patterns
 * @param url - Image URL to validate
 * @returns true if URL looks valid
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return false;
  }
  
  // Check if it's a data URL (base64 image)
  if (trimmed.startsWith("data:image/")) {
    return true;
  }
  
  // Check if it's a valid HTTP/HTTPS URL
  try {
    const urlObj = new URL(trimmed);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    // If URL parsing fails, it might be a relative path (like imported asset)
    // Check if it looks like a valid path
    return trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../");
  }
}

/**
 * Get restaurant image with fallback logic
 * @param imageUrl - Primary image URL from API
 * @param category - Restaurant category for fallback
 * @param restaurantId - Optional restaurant ID for per-restaurant randomization (Burgers/Sushi)
 * @returns Valid image URL or fallback
 */
export function getRestaurantImage(
  imageUrl: string | null | undefined,
  category: string | null | undefined,
  restaurantId?: string
): string {
  if (isValidImageUrl(imageUrl)) {
    return imageUrl!;
  }
  
  return getCategoryFallbackImage(category, restaurantId);
}

/**
 * Get restaurant menu images with fallback logic
 * @param photos - Array of photo URLs from API
 * @param category - Restaurant category for fallback
 * @returns Array of valid image URLs with fallbacks
 */
export function getRestaurantMenuImages(
  photos: string[] | null | undefined,
  category: string | null | undefined
): string[] {
  if (Array.isArray(photos) && photos.length > 0) {
    // Filter out invalid URLs and keep valid ones
    const validPhotos = photos.filter((photo) => isValidImageUrl(photo));
    if (validPhotos.length > 0) {
      return validPhotos;
    }
  }
  
  // Return category-based fallbacks
  return getCategoryMenuFallbacks(category);
}
