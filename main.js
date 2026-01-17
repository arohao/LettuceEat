import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import readline from "node:readline";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});

const restaurantDescriptions = {
  "The Golden Fork":
    "Cozy bistro with seasonal menus, candlelit tables, and a curated local wine list.",
  "Harbor Grill":
    "Seafood-forward spot with a breezy patio, fast service, and generous portions.",
  "Spice Avenue":
    "Bold, aromatic curries with customizable heat levels and plenty of vegetarian options.",
  "Stone Oven Pizzeria":
    "Neapolitan-style pies, blistered crusts, and a casual, family-friendly vibe.",
  "Maple & Smoke":
    "Slow-smoked meats, house-made sauces, and a rustic interior with live weekend music.",
  "Garden Table":
    "Farm-to-table plates, bright natural lighting, and a focus on fresh, local produce.",
  "Noodle Lantern":
    "Hand-pulled noodles, rich broths, and quick weekday lunch specials.",
  "Saffron Lounge":
    "Elegant decor, attentive service, and refined tasting menus for special occasions.",
};

function formatRestaurantData(data) {
  return Object.entries(data)
    .map(([name, desc]) => `${name}: ${desc}`)
    .join("\n");
}

function buildPrompt({ foodType, comparisonMetric, maxWords }) {
  const metricText = comparisonMetric?.trim()
    ? comparisonMetric.trim()
    : "overall best experience";

  return `### ROLE
You are a friendly, enthusiastic regional food reviewer specializing in ${foodType}. Your tone is helpful, inviting, and decisive.

### DATA (Restaurant Descriptions)
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
    const maxWordsInput = await askQuestion(
      rl,
      "Max review words (default 50): ",
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
