import { useState } from "react";
import { MapPin } from "lucide-react";
import lettuceLogo from "@/assets/lettuce-logo.png";
import { SearchBar } from "@/components/SearchBar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { RestaurantCard } from "@/components/RestaurantCard";
import { restaurants } from "@/data/mockData";

export const RestaurantsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || restaurant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mobile-container pb-24">
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        <img src={lettuceLogo} alt="LettuceEat" className="w-16 h-16 mb-2" />
        <div className="flex items-center gap-1 text-foreground">
          <MapPin size={18} />
          <span className="font-medium">Ottawa, Ontario</span>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <SearchBar
          placeholder="Search Restaurant"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <CategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="space-y-4">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
};
