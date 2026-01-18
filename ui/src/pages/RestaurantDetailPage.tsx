import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Star, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { restaurants as mockRestaurants } from "@/data/mockData";
import { getRestaurantById, getRestaurantsByCategory, updateRestaurantInCache } from "@/lib/restaurantCache";
import { ComparisonDialog } from "@/components/ComparisonDialog";
import { RestaurantImage } from "@/components/RestaurantImage";
import { apiEndpoint } from "@/lib/apiConfig";
import type { Restaurant } from "@/data/mockData";

export const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedCompareRestaurant, setSelectedCompareRestaurant] = useState<Restaurant | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  
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
    const mockRestaurant = mockRestaurants.find((r) => r.id === id);
    setRestaurant(mockRestaurant || null);
  }, [id]);

  // Generate overview if restaurant doesn't have one
  useEffect(() => {
    const generateOverview = async () => {
      if (!restaurant || restaurant.overview || overviewLoading) {
        return;
      }

      setOverviewLoading(true);
      try {
        console.log("[Overview] Generating overview for:", restaurant.name);
        const response = await fetch(apiEndpoint("restaurant/overview"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: restaurant.name,
            address: restaurant.address,
            category: restaurant.category,
            rating: restaurant.rating,
            priceRange: restaurant.priceRange,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate overview: ${response.statusText}`);
        }

        const data = await response.json();
        const overview = data.overview || "";

        if (overview) {
          // Update restaurant with overview
          const updatedRestaurant = { ...restaurant, overview };
          setRestaurant(updatedRestaurant);
          
          // Update in cache
          updateRestaurantInCache(updatedRestaurant);
          console.log("[Overview] ✓ Overview generated and cached");
        }
      } catch (error) {
        console.error("[Overview] Error generating overview:", error);
        // Don't show error to user - just continue without overview
      } finally {
        setOverviewLoading(false);
      }
    };

    generateOverview();
  }, [restaurant, overviewLoading]);
  
  // Show loading state while searching
  if (restaurant === null && id) {
    return (
      <div className="mobile-container pb-24">
        <Header title="Detail" showBack />
        <div className="p-4 text-center text-muted-foreground">
          Restaurant not found
        </div>
      </div>
    );
  }
  
  // Get all restaurants in the same category, excluding the current one
  const allCategoryRestaurants = getRestaurantsByCategory(restaurant.category, mockRestaurants);
  const similarRestaurants = allCategoryRestaurants.filter((r) => r.id !== restaurant.id);

  return (
    <div className="mobile-container pb-32">
      <Header title="Detail" showBack />
      
      <div className="px-4">
        <div className="rounded-2xl overflow-hidden mb-4">
          <RestaurantImage
            src={restaurant.image}
            alt={restaurant.name}
            category={restaurant.category}
            className="w-full aspect-[16/10] object-cover"
          />
        </div>
        
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-bold text-xl text-foreground">{restaurant.name}</h1>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
              <MapPin size={14} />
              <span>{restaurant.address}</span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{restaurant.priceRange}</p>
          </div>
          <div className="rating-badge">
            <Star size={14} fill="currentColor" />
            <span>{typeof restaurant.rating === "number" ? restaurant.rating.toFixed(1) : "4.0"}</span>
          </div>
        </div>

        {/* Restaurant Overview */}
        {(restaurant.overview || overviewLoading) && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="font-bold text-foreground mb-3">About</h2>
            {overviewLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Generating overview...</span>
              </div>
            ) : restaurant.overview ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.overview}</p>
            ) : null}
          </div>
        )}
        
        <div className="border-t border-border pt-6 mb-6">
          <h2 className="font-bold text-foreground mb-4">Explore Menu</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {restaurant.menuImages.map((image, index) => (
              <RestaurantImage
                key={index}
                src={image}
                alt={`Menu item ${index + 1}`}
                category={restaurant.category}
                className="w-28 h-28 rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>
        </div>
        
        {similarRestaurants.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="font-bold text-foreground mb-4">Compare with similar restaurants</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {similarRestaurants.map((similar) => (
                <button
                  key={similar.id}
                  onClick={() => {
                    setSelectedCompareRestaurant(similar);
                    setCompareDialogOpen(true);
                  }}
                  className="flex-shrink-0 text-left"
                >
                  <RestaurantImage
                    src={similar.image}
                    alt={similar.name}
                    category={similar.category}
                    className="w-24 h-24 rounded-xl object-cover mb-2"
                  />
                  <span className="text-sm font-medium text-foreground block w-24 truncate">{similar.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate(`/restaurant/${id}/invite`)}
            className="btn-primary"
          >
            Create Event
          </button>
        </div>
      </div>

      {selectedCompareRestaurant && (
        <ComparisonDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
          currentRestaurant={restaurant}
          compareRestaurant={selectedCompareRestaurant}
        />
      )}
    </div>
  );
};