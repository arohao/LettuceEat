import { useState, useEffect } from "react";
import { getCategoryFallbackImage, isValidImageUrl } from "@/lib/imageUtils";

interface RestaurantImageProps {
  src: string;
  alt: string;
  category?: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * Restaurant image component with automatic fallback handling
 * If the image fails to load, it falls back to a category-based placeholder
 */
export const RestaurantImage = ({
  src,
  alt,
  category,
  className = "",
  fallbackClassName = "",
}: RestaurantImageProps) => {
  // Initialize with valid src or fallback
  const getInitialSrc = () => {
    if (src && isValidImageUrl(src)) {
      return src;
    }
    return getCategoryFallbackImage(category);
  };

  const [imageError, setImageError] = useState(!isValidImageUrl(src));
  const [currentSrc, setCurrentSrc] = useState(getInitialSrc());

  // Reset error state and update src when prop changes
  useEffect(() => {
    if (src && isValidImageUrl(src)) {
      setImageError(false);
      setCurrentSrc(src);
    } else {
      // If src is invalid, use fallback immediately
      const fallback = getCategoryFallbackImage(category);
      setCurrentSrc(fallback);
      setImageError(true);
    }
  }, [src, category]);

  const handleError = () => {
    if (!imageError) {
      // First error - try category fallback
      const fallback = getCategoryFallbackImage(category);
      if (fallback !== currentSrc) {
        setCurrentSrc(fallback);
        setImageError(true);
      }
    }
    // If fallback also fails, browser will show broken image icon
    // In production, you might want to show a placeholder div instead
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={imageError ? fallbackClassName || className : className}
      onError={handleError}
      loading="lazy"
    />
  );
};
