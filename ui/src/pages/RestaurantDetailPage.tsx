import { useParams, useNavigate } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { restaurants } from "@/data/mockData";

export const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const restaurant = restaurants.find((r) => r.id === id);
  
  if (!restaurant) {
    return (
      <div className="mobile-container pb-24">
        <Header title="Detail" showBack />
        <div className="p-4 text-center text-muted-foreground">
          Restaurant not found
        </div>
      </div>
    );
  }
  
  return (
    <div className="mobile-container pb-32">
      <Header title="Detail" showBack />
      
      <div className="px-4">
        <div className="rounded-2xl overflow-hidden mb-4">
          <img
            src={restaurant.image}
            alt={restaurant.name}
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
            <span>{restaurant.rating}</span>
          </div>
        </div>
        
        <div className="border-t border-border pt-6 mb-6">
          <h2 className="font-bold text-foreground mb-4">Explore Menu</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {restaurant.menuImages.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Menu item ${index + 1}`}
                className="w-28 h-28 rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>
        </div>
        
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
    </div>
  );
};
