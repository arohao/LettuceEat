import sushiRestaurant from "@/assets/sushi-restaurant.jpg";
import burgerRestaurant from "@/assets/burger-restaurant.jpg";
import italianRestaurant from "@/assets/italian-restaurant.jpg";
import pizzaRestaurant from "@/assets/pizza-restaurant.jpg";
import sushiDish1 from "@/assets/sushi-dish-1.jpg";
import sushiDish2 from "@/assets/sushi-dish-2.jpg";
import sushiDish3 from "@/assets/sushi-dish-3.jpg";

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  priceRange: string;
  rating: number;
  category: string;
  image: string;
  menuImages: string[];
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Availability {
  date: string;
  available: boolean;
}

export const categories = ["All", "Burgers", "Sushi", "Italian", "Pizza", "Thai"];

export const restaurants: Restaurant[] = [
  {
    id: "1",
    name: "Nagi Sushi",
    address: "2208 St Joseph Blvd",
    priceRange: "$$",
    rating: 4.5,
    category: "Sushi",
    image: sushiRestaurant,
    menuImages: [sushiDish1, sushiDish2, sushiDish3],
  },
  {
    id: "2",
    name: "Burger Republic",
    address: "145 Bank Street",
    priceRange: "$$",
    rating: 4.3,
    category: "Burgers",
    image: burgerRestaurant,
    menuImages: [sushiDish1, sushiDish2, sushiDish3],
  },
  {
    id: "3",
    name: "Trattoria Italiana",
    address: "88 Preston Street",
    priceRange: "$$$",
    rating: 4.7,
    category: "Italian",
    image: italianRestaurant,
    menuImages: [sushiDish1, sushiDish2, sushiDish3],
  },
  {
    id: "4",
    name: "Napoli Pizza",
    address: "320 Rideau Street",
    priceRange: "$$",
    rating: 4.4,
    category: "Pizza",
    image: pizzaRestaurant,
    menuImages: [sushiDish1, sushiDish2, sushiDish3],
  },
  {
    id: "5",
    name: "Sushi Garden",
    address: "456 Elgin Street",
    priceRange: "$$$",
    rating: 4.6,
    category: "Sushi",
    image: sushiRestaurant,
    menuImages: [sushiDish1, sushiDish2, sushiDish3],
  },
];

export const friends: Friend[] = [
  { id: "1", name: "Aroha Upreti", email: "aroha@email.com" },
  { id: "2", name: "Kelly Huang", email: "kelly@email.com" },
  { id: "3", name: "Ahmad Soboh", email: "ahmad@email.com" },
  { id: "4", name: "Guarav", email: "guarav@email.com" },
  { id: "5", name: "Jane Doe", email: "jane@email.com" },
];

export const getSimilarRestaurants = (restaurantId: string, category: string): Restaurant[] => {
  return restaurants.filter(r => r.category === category && r.id !== restaurantId).slice(0, 3);
};

// Generate availability for the next 4 weeks with hourly time slots
export const generateAvailability = (): Record<string, boolean> => {
  const availability: Record<string, boolean> = {};
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  for (let week = 0; week < 4; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + (week * 7) + day);
      
      for (let hour = 0; hour < 24; hour++) {
        // More likely to be available in evening hours (17-22)
        const isEveningHour = hour >= 17 && hour <= 22;
        const dateTimeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(hour).padStart(2, "0")}`;
        availability[dateTimeStr] = isEveningHour ? Math.random() > 0.4 : Math.random() > 0.8;
      }
    }
  }
  
  return availability;
};

// Mock friend availabilities
export const friendAvailabilities: Record<string, Record<string, boolean>> = {
  "1": generateAvailability(),
  "2": generateAvailability(),
  "3": generateAvailability(),
  "4": generateAvailability(),
  "5": generateAvailability(),
};
