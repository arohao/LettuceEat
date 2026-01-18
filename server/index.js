import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const EXTRACT_API_KEY = process.env.YELLOWCAKE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
  const safeMaxWords =
    Number.isFinite(maxWords) && maxWords > 0 ? maxWords : 25;

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
4. Write a short review (maximum ${safeMaxWords} words) announcing the winner and briefly explaining why it fits the specific criteria better than the others.
5. Give the winner a rating out of 10.
6. Do not mention that you are an AI or that you are analyzing data; speak as a human reviewer.

### REVIEW`;
}

const app = express();
app.use(cors());
app.use(express.json());

async function extractStream(url, prompt) {
  if (!EXTRACT_API_KEY) {
    const error = new Error("Missing YELLOWCAKE_API_KEY in environment");
    error.status = 500;
    throw error;
  }

  const res = await fetch("https://api.yellowcake.dev/v1/extract-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-API-Key": EXTRACT_API_KEY,
    },
    body: JSON.stringify({ url, prompt }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    const error = new Error(`Upstream extraction failed: ${res.status}`);
    error.status = res.status;
    error.body = errorBody;
    throw error;
  }

  return res.body;
}

app.get("/extract", async (req, res) => {
  const url = req.query.url;
  const prompt = req.query.prompt;

  if (!url || !prompt) return res.status(400).send("Missing url or prompt");

  // SSE headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await extractStream(url, prompt);

    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500);
    }
    if (res.getHeader("Content-Type") === "text/event-stream") {
      const errorPayload = {
        code: "UPSTREAM_ERROR",
        message: err?.message || "Extraction failed",
        status: err?.status || 500,
        body: err?.body || null,
        timestamp: Date.now(),
      };
      res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
      res.end();
    } else {
      res.send("Extraction failed");
    }
  }
});

app.post("/review", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const { foodType, comparisonMetric, maxWords } = req.body || {};
  const prompt = buildPrompt({
    foodType: foodType?.trim() || "Local Cuisine",
    comparisonMetric,
    maxWords,
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    res.json({ text: response.text, prompt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

app.post("/reviews/summarize", async (req, res) => {
  console.log("Received summarize request:", req.body);
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const { restaurantName, reviews } = req.body || {};

  // Basic validation
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid reviews. Expected an array of strings.",
    });
  }

  // Keep it safe + avoid huge prompts
  const cleaned = reviews
    .filter((r) => typeof r === "string")
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 60); // cap count (adjust as you like)

  if (cleaned.length === 0) {
    return res.status(400).json({ error: "No valid review strings provided." });
  }

  // Optional: cap total characters to prevent very large payloads
  const MAX_CHARS = 8000;
  let joined = cleaned.map((r) => `- ${r}`).join("\n");
  if (joined.length > MAX_CHARS) joined = joined.slice(0, MAX_CHARS);

  const prompt = `
You are a concise restaurant review summarizer.

${restaurantName ? `Restaurant: ${restaurantName}` : ""}

Reviews:
${joined}

Instructions:
- Summarize what the reviews are saying in EXACTLY 3 sentences total.
- Capture the most common themes (pros/cons), overall sentiment, and any notable caveats.
- Do not use bullet points, lists, headings, or emojis.
- Do not mention being an AI.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const summary = (response.text || "").trim();
    console.log("Generated summary:", summary);

    return res.json({
      summary
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gemini request failed" });
  }
});

// Testing connection 
app.get("/health", (req, res) => {
  console.log("Health check received");
  res.json({ ok: true, time: Date.now() });
});


app.listen(3001, () => console.log("Server running on http://localhost:3001"));
