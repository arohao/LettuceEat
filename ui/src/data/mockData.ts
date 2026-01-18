import italianRestaurant from "@/assets/italian-restaurant.jpg";
import pizzaRestaurant from "@/assets/pizza-restaurant.jpg";

// Sushi folder assets
import sushi0 from "@/assets/sushi/sushi0.jpg";
import sushi1 from "@/assets/sushi/sushi1.jpg";
import sushi2 from "@/assets/sushi/sushi2.jpg";

// Burgor folder assets
import burgor0 from "@/assets/burgor/burgor0.jpg";
import burgor1 from "@/assets/burgor/burgor1.jpg";
import burgor2 from "@/assets/burgor/burgor2.jpg";

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  priceRange: string;
  rating: number;
  category: string;
  image: string;
  menuImages: string[];
  reviews?: string[];
  overview?: string; // AI-generated overview of the restaurant
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
    reviews: [
    "Fish tastes very fresh and the rolls are nicely balanced.",
    "Service is quick, but it gets crowded during dinner hours.",
    "Great variety of rolls and the presentation is beautiful."
  ],
    image: sushi0,
    menuImages: [sushi0, sushi1, sushi2],
  },
  {
    id: "2",
    name: "Burger Republic",
    address: "145 Bank Street",
    priceRange: "$$",
    rating: 4.3,
    category: "Burgers",
    image: burgor0,
    menuImages: [burgor0, burgor1, burgor2],
    reviews: [
    "Burgers are juicy and cooked perfectly every time.",
    "Fries are crispy, but the wait can be long on weekends.",
    "Good value for the portion sizes and quality."
    ]
  },
  {
    id: "3",
    name: "Trattoria Italiana",
    address: "88 Preston Street",
    priceRange: "$$$",
    rating: 4.7,
    category: "Italian",
    image: italianRestaurant,
    menuImages: [italianRestaurant, pizzaRestaurant, burgor0],
    reviews: [
    "Burgers are juicy and cooked perfectly every time.",
    "Fries are crispy, but the wait can be long on weekends.",
    "Good value for the portion sizes and quality."
    ]
  },
  {
    id: "4",
    name: "Napoli Pizza",
    address: "320 Rideau Street",
    priceRange: "$$",
    rating: 4.4,
    category: "Pizza",
    image: pizzaRestaurant,
    menuImages: [italianRestaurant, pizzaRestaurant, burgor0],
    reviews: [
    "Burgers are juicy and cooked perfectly every time.",
    "Fries are crispy, but the wait can be long on weekends.",
    "Good value for the portion sizes and quality."
    ]
  },
  {
    id: "5",
    name: "Sushi Garden",
    address: "456 Elgin Street",
    priceRange: "$$$",
    rating: 4.6,
    category: "Sushi",
    image: sushi0,
    menuImages: [sushi0, sushi1, sushi2],
    reviews: [
    "Burgers are juicy and cooked perfectly every time.",
    "Fries are crispy, but the wait can be long on weekends.",
    "Good value for the portion sizes and quality."
    ]
  },
];

export const positiveReviews: string[] = [
  "The food was delicious and full of flavor.",
  "Great atmosphere and really friendly staff.",
  "Everything came out fresh and well prepared.",
  "Service was quick and attentive.",
  "Definitely a place I would come back to.",
  "The menu had lots of good options to choose from.",
  "Portions were generous for the price.",
  "Clean, comfortable, and welcoming environment.",
  "The staff made us feel right at home.",
  "Food presentation was beautiful.",
  "Prices felt fair for the quality.",
  "Really enjoyed my experience here.",
  "The flavors were well balanced and satisfying.",
  "Perfect spot for a casual meal.",
  "Great value and great taste.",
  "The food exceeded my expectations.",
  "Nice place to eat with friends or family.",
  "Everything tasted fresh and well seasoned.",
  "Service was polite and professional.",
  "I would recommend this place to others."
];

export const negativeReviews: string[] = [
  "The food was underwhelming and lacked flavor.",
  "Service was slower than expected.",
  "The place felt crowded and noisy.",
  "Food arrived cold.",
  "Staff seemed rushed and inattentive.",
  "Portions were smaller than expected.",
  "Prices felt high for the quality.",
  "The restaurant wasn’t very clean.",
  "Wait time was longer than we were told.",
  "The dish didn’t match the description on the menu.",
  "Food was overcooked.",
  "Not as good as I hoped it would be.",
  "Drinks took a long time to come out.",
  "The experience felt disorganized.",
  "Food was bland.",
  "Service felt impersonal.",
  "The seating was uncomfortable.",
  "Not worth the price.",
  "I probably wouldn’t return.",
  "Overall, a disappointing experience."
];


export const friends: Friend[] = [
  { id: "1", name: "Aroha Upreti", email: "uaroha@gmail.com" },
  { id: "2", name: "Kelly Huang", email: "kelly.xinhuang20@gmail.com" },
  { id: "3", name: "Ahmad Soboh", email: "sobohahmad777@gmail.com" },
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