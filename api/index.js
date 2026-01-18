import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));

// app.listen(3000, () => console.log("Server running on http://localhost:3000"));
