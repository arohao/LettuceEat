import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import readline from "node:readline";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

const restaurantDescriptions = {
  "The Golden Fork": {
    description:
      "Cozy bistro with seasonal menus, candlelit tables, and a curated local wine list.",
    reviews: [
      "Warm, intimate atmosphere and attentive staff.",
      "Food is consistently excellent, but reservations are a must.",
      "Great date-night spot with a strong wine pairing program.",
    ],
  },
  "Harbor Grill": {
    description:
      "Seafood-forward spot with a breezy patio, fast service, and generous portions.",
    reviews: [
      "Fresh oysters and quick service, perfect for lunch.",
      "Patio views are great, but it gets busy on weekends.",
      "Big portions and fair prices for seafood lovers.",
    ],
  },
  "Spice Avenue": {
    description:
      "Bold, aromatic curries with customizable heat levels and plenty of vegetarian options.",
    reviews: [
      "Complex flavors and great vegan choices.",
      "Heat level can be intense, but staff will adjust it.",
      "Aromatic dishes and generous spice blends.",
    ],
  },
  "Stone Oven Pizzeria": {
    description:
      "Neapolitan-style pies, blistered crusts, and a casual, family-friendly vibe.",
    reviews: [
      "Crust is perfectly charred and airy.",
      "Kids loved it; service was friendly and fast.",
      "Simple menu, executed well.",
    ],
  },
  "Maple & Smoke": {
    description:
      "Slow-smoked meats, house-made sauces, and a rustic interior with live weekend music.",
    reviews: [
      "Brisket is tender with a deep smoky flavor.",
      "Lively vibe on weekends, sometimes a bit loud.",
      "Sauces are outstanding and sides are hearty.",
    ],
  },
  "Garden Table": {
    description:
      "Farm-to-table plates, bright natural lighting, and a focus on fresh, local produce.",
    reviews: [
      "Fresh ingredients and beautiful plating.",
      "Light, clean flavors with seasonal variety.",
      "Great for brunch; coffee is excellent.",
    ],
  },
  "Noodle Lantern": {
    description:
      "Hand-pulled noodles, rich broths, and quick weekday lunch specials.",
    reviews: [
      "Broths are rich and noodles have great chew.",
      "Fast service and solid value for lunch.",
      "Small seating area but turnover is quick.",
    ],
  },
  "Saffron Lounge": {
    description:
      "Elegant decor, attentive service, and refined tasting menus for special occasions.",
    reviews: [
      "Impeccable service and refined plating.",
      "Tasting menu feels luxurious and well-paced.",
      "Pricey, but excellent for celebrations.",
    ],
  },
};

function formatRestaurantData(data) {
  return Object.entries(data)
    .map(([name, info]) => {
      const reviews = (info.reviews || []).map((r) => `- ${r}`).join("\n");
      return `${name}: ${info.description}\nReviews:\n${reviews}`;
    })
    .join("\n\n");
}

function buildPrompt({ foodType, comparisonMetric, maxWords }) {
  const metricText = comparisonMetric?.trim()
    ? comparisonMetric.trim()
    : "overall best experience";

  return `### ROLE
You are a friendly, enthusiastic regional food reviewer specializing in ${foodType}. Your tone is helpful, inviting, and decisive.

### DATA (Restaurant Descriptions + Reviews)
${formatRestaurantData(restaurantDescriptions)}

### USER REQUEST
The user wants to find the best restaurant among the data provided above based specifically on this criteria: "${metricText}".

### INSTRUCTIONS
1. Analyze the provided restaurant descriptions.
2. Compare them strictly against the user's specific criteria stated above.
3. Select the "winner" that best fits the criteria.
4. Write a short review (maximum ${maxWords} words) announcing the winner and briefly explaining why it fits the specific criteria better than the others.
5. Give the winner a rating out of 10.
6. Do not mention that you are an AI or that you are analyzing data; speak as a human reviewer.

### REVIEW`;
}

async function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const foodTypeInput = await askQuestion(
      rl,
      "Food type (e.g., Sushi, Tacos, BBQ): ",
    );
    const comparisonInput = await askQuestion(
      rl,
      "Comparison criteria (optional, press Enter to skip): ",
    );
    const friendMessageInput = await askQuestion(
      rl,
      "Friend message (optional, press Enter to skip): ",
    );
    const maxWordsInput = await askQuestion(
      rl,
      "Max review words (default 25): ",
    );

    const foodType = foodTypeInput.trim() || "Local Cuisine";
    const maxWords = Number.parseInt(maxWordsInput, 10);
    const safeMaxWords =
      Number.isFinite(maxWords) && maxWords > 0 ? maxWords : 25;

    const prompt = buildPrompt({
      foodType,
      comparisonMetric: comparisonInput,
      maxWords: safeMaxWords,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    console.log("\n--- Prompt ---\n");
    console.log(prompt);
    console.log("\n--- Response ---\n");
    console.log(response.text);

    const zapierResponse = await fetch(
      "https://hooks.zapier.com/hooks/catch/21189459/ugpnbit/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          output: response.text,
          foodType,
          comparisonMetric: comparisonInput?.trim() || null,
          maxWords: safeMaxWords,
          friendMessage: friendMessageInput?.trim() || null,
        }),
      },
    );

    const zapierBody = await zapierResponse.text();
    console.log("\n--- Zapier Webhook ---\n");
    console.log(
      `Status: ${zapierResponse.status} ${zapierResponse.statusText}`,
    );
    if (zapierBody) {
      console.log(`Body: ${zapierBody}`);
    }
    if (!zapierResponse.ok) {
      throw new Error(`Zapier webhook failed: ${zapierResponse.status}`);
    }
  } finally {
    rl.close();
  }
}

main();
