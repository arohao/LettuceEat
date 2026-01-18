import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const EXTRACT_API_KEY = process.env.YELLOWCAKE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
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

function buildPrompt({
  foodType,
  comparisonMetric,
  maxWords,
  eventName,
  restaurantName,
  dateTime,
  friendMessage,
  invited,
}) {
  const metricText = comparisonMetric?.trim()
    ? comparisonMetric.trim()
    : "overall best experience";
  const safeMaxWords =
    Number.isFinite(maxWords) && maxWords > 0 ? maxWords : 25;
  const invitedText =
    Array.isArray(invited) && invited.length > 0
      ? invited.join(", ")
      : "(no names provided)";

  return `### ROLE
You are a friendly, enthusiastic organizer specializing in ${foodType}. Your tone is helpful, inviting, and decisive.

### DATA (Restaurant Descriptions + Reviews)
${formatRestaurantData(restaurantDescriptions)}

### USER REQUEST
Create a concise meetup plan based on the details below.

Event name: ${eventName || "(not provided)"}
Restaurant: ${restaurantName || "(not provided)"}
Food type: ${foodType}
Time: ${dateTime || "(not provided)"}
Invited: ${invitedText}
Friend message: ${friendMessage || "(not provided)"}
Plan focus: ${metricText}

### INSTRUCTIONS
1. Use the restaurant descriptions to choose the best fit for the plan focus.
2. Write a short plan (maximum ${safeMaxWords} words) that includes a suggested dress code (e.g., business casual), the meetup time, and a friendly summary for the group.
3. Do not mention that you are an AI or that you are analyzing data; speak as a human organizer.

### PLAN`;
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
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      console.log("Sending chunk:", decoder.decode(chunk));
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
  const {
    foodType,
    comparisonMetric,
    maxWords,
    friendMessage,
    eventName,
    restaurantName,
    dateTime,
    invited,
  } = req.body || {};
  const prompt = buildPrompt({
    foodType: foodType?.trim() || "Local Cuisine",
    comparisonMetric,
    maxWords,
    eventName,
    restaurantName,
    dateTime,
    friendMessage,
    invited,
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    res.json({
      text: response.text,
      prompt,
      friendMessage: friendMessage || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

// app.post("/reviews/summarize", async (req, res) => {
//   const { restaurantName, reviews } = req.body || {};

//   // Basic validation
//   if (!Array.isArray(reviews) || reviews.length === 0) {
//     return res.status(400).json({
//       error: "Missing or invalid reviews. Expected an array of strings.",
//     });
//   }

//   // Keep it safe + avoid huge prompts
//   const cleaned = reviews
//     .filter((r) => typeof r === "string")
//     .map((r) => r.trim())
//     .filter(Boolean)
//     .slice(0, 60); // cap count (adjust as you like)

//   if (cleaned.length === 0) {
//     return res.status(400).json({ error: "No valid review strings provided." });
//   }

//   // Optional: cap total characters to prevent very large payloads
//   const MAX_CHARS = 8000;
//   let joined = cleaned.map((r) => `- ${r}`).join("\n");
//   if (joined.length > MAX_CHARS) joined = joined.slice(0, MAX_CHARS);

//   const prompt = `
// You are a concise restaurant review summarizer.

// ${restaurantName ? `Restaurant: ${restaurantName}` : ""}

// Reviews:
// ${joined}

// Instructions:
// - Summarize what the reviews are saying in EXACTLY 3 sentences total.
// - Capture the most common themes (pros/cons), overall sentiment, and any notable caveats.
// - Do not use bullet points, lists, headings, or emojis.
// - Do not mention being an AI.
//   `.trim();

//   try {
//     const response = await ai.models.generateContent({
//       model: "gemini-3-flash-preview",
//       contents: prompt,
//     });

//     const summary = (response.text || "").trim();
//     console.log("Generated summary:", summary);

//     return res.json({
//       summary
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "Gemini request failed" });
//   }
// });

app.post("/reviews/summarize", async (req, res) => {
  const { restaurantName, positiveReviews, negativeReviews } = req.body || {};

  if (!Array.isArray(positiveReviews) || positiveReviews.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid positiveReviews. Expected an array of strings.",
    });
  }

  if (!Array.isArray(negativeReviews) || negativeReviews.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid negativeReviews. Expected an array of strings.",
    });
  }

  const cleanList = (arr) =>
    arr
      .filter((r) => typeof r === "string")
      .map((r) => r.trim())
      .filter(Boolean)
      .slice(0, 10); // safety cap

  const pos = cleanList(positiveReviews);
  const neg = cleanList(negativeReviews);

  if (pos.length === 0 || neg.length === 0) {
    return res.status(400).json({ error: "No valid review strings provided." });
  }

  const prompt = `
You are a concise restaurant review summarizer.

${restaurantName ? `Restaurant: ${restaurantName}` : ""}

Positive reviews:
${pos.map((r) => `- ${r}`).join("\n")}

Negative reviews:
${neg.map((r) => `- ${r}`).join("\n")}

Instructions:
- Write 1 short sentence summarizing the positive reviews.
- Write 1 short sentence summarizing the negative reviews.
- Keep each sentence under 20 words.
- No bullet points, no headings, no emojis.
- Do not mention being an AI.
- Return EXACT JSON with keys: positiveSummary, negativeSummary.
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();

    // Try to parse model output as JSON (robustly)
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If the model wraps JSON with extra text, extract the first {...}
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed || typeof parsed !== "object") {
      return res.status(500).json({ error: "Model returned invalid JSON", raw });
    }

    return res.json({
      positiveSummary: String(parsed.positiveSummary || "").trim(),
      negativeSummary: String(parsed.negativeSummary || "").trim(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gemini request failed" });
  }
});

// Available categories
const AVAILABLE_CATEGORIES = [
  "Burgers",
  "Sushi",
  "Italian",
  "Pizza",
  "Thai",
  "Mexican",
  "Chinese",
  "Indian",
  "American",
  "Seafood",
  "Japanese",
  "Mediterranean",
  "Other"
];

// Categorize restaurant using Gemini
app.post("/categorize", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const { name, cuisine, description } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: "Restaurant name is required" });
  }

  const prompt = `Categorize this restaurant into ONE of these categories: ${AVAILABLE_CATEGORIES.join(", ")}.

Restaurant Name: ${name}
Cuisine Type: ${cuisine || "Not specified"}
Description: ${description || "Not available"}

Respond with ONLY the category name from the list above. If it doesn't fit any category well, respond with "Other".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const category = response.text.trim();
    // Validate the category is in our list
    const validCategory = AVAILABLE_CATEGORIES.includes(category) 
      ? category 
      : "Other";

    res.json({ category: validCategory });
  } catch (err) {
    console.error("Categorization error:", err);
    // Fallback to cuisine or "Other"
    const fallbackCategory = cuisine && AVAILABLE_CATEGORIES.includes(cuisine) 
      ? cuisine 
      : "Other";
    res.json({ category: fallbackCategory });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
