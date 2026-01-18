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
 * Category-based fallback images mapping
 * For Sushi and Burgers, randomly select from their respective folders
 */
const getCategoryFallbackImageInternal = (category: string): string => {
  const normalizedCategory = category.trim();
  
  // Sushi and Japanese categories: randomly pick from sushi folder (cached)
  if (normalizedCategory === "Sushi" || normalizedCategory === "Japanese") {
    return getCachedRandomImage(normalizedCategory, sushiImages);
  }
  
  // Burgers category: randomly pick from burgor folder (cached)
  if (normalizedCategory === "Burgers") {
    return getCachedRandomImage(normalizedCategory, burgorImages);
  }
  
  // Other categories use fixed images or cached random images
  const otherCategoryImages: Record<string, string> = {
    Italian: italianRestaurant,
    Pizza: pizzaRestaurant,
    Thai: italianRestaurant,
    Indian: italianRestaurant,
    Mediterranean: italianRestaurant,
  };
  
  // If it's a fixed category, return it
  if (otherCategoryImages[normalizedCategory]) {
    return otherCategoryImages[normalizedCategory];
  }
  
  // For categories that use random images, cache them
  if (normalizedCategory === "Mexican" || normalizedCategory === "American" || normalizedCategory === "Other") {
    return getCachedRandomImage(normalizedCategory, burgorImages);
  }
  
  if (normalizedCategory === "Chinese" || normalizedCategory === "Seafood") {
    return getCachedRandomImage(normalizedCategory, sushiImages);
  }
  
  // Default fallback
  return getCachedRandomImage("Other", burgorImages);
};

/**
 * Get fallback menu images for a category
 * For Sushi and Burgers, use all images from their respective folders
 */
const getCategoryMenuFallbacksInternal = (category: string): string[] => {
  const normalizedCategory = category.trim();
  
  // Sushi and Japanese categories: use all sushi folder images (cached)
  if (normalizedCategory === "Sushi" || normalizedCategory === "Japanese") {
    return getCachedMenuImages(normalizedCategory, sushiImages);
  }
  
  // Burgers category: use all burgor folder images (cached)
  if (normalizedCategory === "Burgers") {
    return getCachedMenuImages(normalizedCategory, burgorImages);
  }
  
  // Other categories - build menu images with cached random selections
  if (!categoryMenuImageCache[normalizedCategory]) {
    let menuImages: string[];
    
    switch (normalizedCategory) {
      case "Italian":
        menuImages = [italianRestaurant, pizzaRestaurant, getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages)];
        break;
      case "Pizza":
        menuImages = [pizzaRestaurant, italianRestaurant, getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages)];
        break;
      case "Thai":
        menuImages = [italianRestaurant, getCachedRandomImage(`${normalizedCategory}_menu_sushi`, sushiImages), getCachedRandomImage(`${normalizedCategory}_menu_burgor`, burgorImages)];
        break;
      case "Mexican":
        menuImages = [getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages), italianRestaurant, pizzaRestaurant];
        break;
      case "Chinese":
        menuImages = [getCachedRandomImage(`${normalizedCategory}_menu_sushi`, sushiImages), italianRestaurant, getCachedRandomImage(`${normalizedCategory}_menu_burgor`, burgorImages)];
        break;
      case "Indian":
        menuImages = [italianRestaurant, getCachedRandomImage(`${normalizedCategory}_menu_sushi`, sushiImages), getCachedRandomImage(`${normalizedCategory}_menu_burgor`, burgorImages)];
        break;
      case "American":
        menuImages = [getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages), pizzaRestaurant, italianRestaurant];
        break;
      case "Seafood":
        menuImages = [getCachedRandomImage(`${normalizedCategory}_menu_sushi`, sushiImages), italianRestaurant, getCachedRandomImage(`${normalizedCategory}_menu_burgor`, burgorImages)];
        break;
      case "Mediterranean":
        menuImages = [italianRestaurant, pizzaRestaurant, getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages)];
        break;
      default:
        menuImages = [getCachedRandomImage(`${normalizedCategory}_menu`, burgorImages), italianRestaurant, pizzaRestaurant];
    }
    
    categoryMenuImageCache[normalizedCategory] = menuImages;
  }
  
  return categoryMenuImageCache[normalizedCategory];
};

/**
 * Get fallback image for a restaurant category
 * @param category - Restaurant category (e.g., "Sushi", "Burgers")
 * @returns Fallback image path (randomly selected for Sushi/Burgers)
 */
export function getCategoryFallbackImage(category: string | null | undefined): string {
  if (!category) {
    // For "All" section or undefined category, randomly choose between burgor and sushi
    return getCachedRandomImage("Other", allFoodImages);
  }
  
  return getCategoryFallbackImageInternal(category);
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
 * @returns Valid image URL or fallback
 */
export function getRestaurantImage(
  imageUrl: string | null | undefined,
  category: string | null | undefined
): string {
  if (isValidImageUrl(imageUrl)) {
    return imageUrl!;
  }
  
  return getCategoryFallbackImage(category);
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
