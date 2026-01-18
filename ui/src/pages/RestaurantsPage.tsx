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
  const [foodType, setFoodType] = useState("Sushi");
  const [comparisonMetric, setComparisonMetric] = useState("best interior design");
  const [maxWords, setMaxWords] = useState(25);
  const [reviewText, setReviewText] = useState("");
  const [reviewStatus, setReviewStatus] = useState("idle");
  const [reviewError, setReviewError] = useState("");

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || restaurant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleGenerateReview = async () => {
    setReviewStatus("loading");
    setReviewError("");
    setReviewText("");

    try {
      const response = await fetch("/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodType,
          comparisonMetric,
          maxWords,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Request failed");
      }
      setReviewText(data.text || "");
      setReviewStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setReviewError(message);
      setReviewStatus("error");
    }
  };

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
        {/*
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">AI Restaurant Review</div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span>Food type</span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                placeholder="Sushi"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Comparison criteria</span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={comparisonMetric}
                onChange={(e) => setComparisonMetric(e.target.value)}
                placeholder="best interior design"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Max words</span>
              <input
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                type="number"
                min={5}
                max={100}
                value={maxWords}
                onChange={(e) => setMaxWords(Number(e.target.value) || 25)}
              />
            </label>
          </div>
          <button
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={handleGenerateReview}
            disabled={reviewStatus === "loading"}
          >
            {reviewStatus === "loading" ? "Generating..." : "Generate review"}
          </button>
          {reviewError && (
            <div className="text-sm text-destructive">{reviewError}</div>
          )}
          {reviewText && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
              {reviewText}
            </div>
          )}
        </div>
        */}

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
