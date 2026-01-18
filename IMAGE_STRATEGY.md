# Restaurant Image Strategy

## Overview
This document explains how restaurant images are handled in the application, including where images come from and what happens when images are missing.

## Image Sources (Priority Order)

### 1. **YellowCake API (Primary Source)**
- **What it does**: Scrapes Google Maps to extract restaurant photos
- **How it works**: 
  - The app sends a Google Maps search URL to YellowCake API
  - YellowCake extracts restaurant data including photos from Google Maps listings
  - Photos are returned as URLs in the `imageUrl` and `photos` fields
- **Advantages**: 
  - Real restaurant photos from Google Maps
  - No additional API keys needed (uses existing YellowCake subscription)
  - Includes both exterior and food photos
- **Limitations**:
  - Success rate depends on YellowCake's extraction quality
  - May not always extract images (depends on Google Maps structure)
  - Scraping can be slow (40-60 seconds)

### 2. **Category-Based Fallback Images (Secondary)**
- **What it does**: Provides category-appropriate placeholder images when API images are missing
- **How it works**:
  - Each restaurant category has a designated fallback image
  - Sushi restaurants → sushi image
  - Burgers → burger image
  - Italian → Italian image
  - Pizza → pizza image
  - Other categories → generic restaurant image
- **Location**: `ui/src/lib/imageUtils.ts`
- **Advantages**:
  - Better UX than showing broken images
  - Category-appropriate placeholders
  - Uses existing assets (no external dependencies)

### 3. **Alternative Sources (Future Options)**

#### Google Places API
- **Pros**: 
  - Most reliable source for restaurant photos
  - High-quality images
  - Official API with good documentation
- **Cons**: 
  - Requires Google Cloud API key
  - Costs money per request (~$0.017 per photo)
  - Requires billing setup
- **Implementation**: Would need to add Google Places API integration

#### Unsplash/Pexels API
- **Pros**: 
  - Free stock photos
  - Good quality images
  - Easy to integrate
- **Cons**: 
  - Not restaurant-specific (generic food photos)
  - May not match actual restaurant
  - Requires API key (free tier available)

#### Google Street View API
- **Pros**: 
  - Shows actual restaurant exterior
  - Free tier available
- **Cons**: 
  - Only exterior shots
  - May not always have Street View coverage
  - Not ideal for food/menu images

## Current Implementation

### Image Flow
1. **YellowCake Scraping**: Attempts to extract images from Google Maps
2. **Validation**: Checks if extracted URLs are valid
3. **Category Fallback**: If no valid image, uses category-based fallback
4. **Error Handling**: `RestaurantImage` component handles loading errors gracefully

### Key Files
- `ui/src/lib/imageUtils.ts` - Image utility functions
- `ui/src/components/RestaurantImage.tsx` - Image component with error handling
- `ui/src/backend/FetchRestaurants.tsx` - Image extraction and mapping logic

### Image Validation
The app validates image URLs by:
- Checking if URL is non-empty
- Verifying it's a valid HTTP/HTTPS URL or data URL
- Handling relative paths (imported assets)

## What Happens When There's No Image?

### Scenario 1: YellowCake Returns No Image
1. System checks if `imageUrl` is null or invalid
2. Falls back to category-based image from `imageUtils.ts`
3. User sees appropriate placeholder (e.g., sushi image for sushi restaurant)

### Scenario 2: Image URL is Invalid/Broken
1. `RestaurantImage` component detects load error
2. Automatically switches to category fallback
3. User experience remains smooth (no broken image icons)

### Scenario 3: Category Unknown
1. Falls back to "Other" category image (generic restaurant)
2. Defaults to burger restaurant image as universal fallback

## Improving Image Extraction

### Enhanced YellowCake Prompt
The prompt has been improved to explicitly request:
- Primary restaurant photo (exterior/main dining area)
- Array of 3-5 photos (food dishes, interior, menu items)
- Full image URLs from Google Maps

### Future Enhancements
1. **Image Caching**: Cache downloaded images locally to reduce API calls
2. **Image Optimization**: Compress/resize images for faster loading
3. **Multiple Sources**: Try Google Places API if YellowCake fails
4. **User Uploads**: Allow users to upload restaurant photos
5. **Image CDN**: Use a CDN for faster image delivery

## Best Practices

1. **Always have a fallback**: Never show broken images
2. **Category-appropriate**: Use relevant fallback images
3. **Lazy loading**: Images load lazily to improve performance
4. **Error handling**: Gracefully handle image load failures
5. **Validation**: Always validate image URLs before using them

## Testing Image Handling

To test the fallback system:
1. Set `imageUrl: null` in backend response
2. Verify category fallback appears
3. Test with invalid image URLs
4. Verify error handling works correctly
