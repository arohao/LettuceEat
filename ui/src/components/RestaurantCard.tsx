import { Star, MapPin } from "lucide-react";
import { Restaurant } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { RestaurantImage } from "./RestaurantImage";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard = ({ restaurant }: RestaurantCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className="card-restaurant animate-fade-in cursor-pointer"
      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
    >
      <div className="aspect-[16/10] overflow-hidden">
        <RestaurantImage
          src={restaurant.image}
          alt={restaurant.name}
          category={restaurant.category}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">{restaurant.name}</h3>
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
        <span className="text-foreground font-medium text-sm mt-3 block ml-auto hover:text-primary transition-colors">
          See more →
        </span>
      </div>
    </div>
  );
};
