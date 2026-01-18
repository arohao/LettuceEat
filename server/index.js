import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const EXTRACT_API_KEY = process.env.YELLOWCAKE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
// Initialize defensively - allow server to start even without API key
let ai = null;
if (GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("[Server] Gemini AI initialized successfully");
  } catch (error) {
    console.warn("[Server] Failed to initialize Gemini AI:", error.message);
  }
} else {
  console.warn("[Server] GEMINI_API_KEY not found - Gemini features will be disabled");
}

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
  if (!ai) {
    console.error("[Review] Gemini AI not initialized");
    return res.status(500).json({ 
      error: "Gemini AI not initialized. Check GEMINI_API_KEY.",
      details: "The server is missing the GEMINI_API_KEY environment variable."
    });
  }

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
  
  console.log("[Review] Request received:", {
    foodType,
    comparisonMetric,
    maxWords,
    hasEventName: !!eventName,
    hasRestaurantName: !!restaurantName,
    hasDateTime: !!dateTime,
    invitedCount: Array.isArray(invited) ? invited.length : 0,
  });
  
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
    console.log("[Review] Calling Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    console.log("[Review] Gemini response received, length:", responseText.length);

    res.json({
      text: responseText,
      prompt,
      friendMessage: friendMessage || null,
    });
  } catch (err) {
    console.error("[Review] Gemini API error:", err);
    console.error("[Review] Error details:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.substring(0, 500),
    });
    
    const errorMessage = err?.message || "Unknown error";
    res.status(500).json({ 
      error: "Gemini request failed",
      details: errorMessage,
      suggestion: "Please check your GEMINI_API_KEY and try again."
    });
  }
});

app.post("/reviews/summarize", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini AI not initialized. Check GEMINI_API_KEY." });
  }

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
      model: "gemini-2.5-flash", // Updated to valid model name
      contents: prompt,
    });

    // Log response structure for debugging
    console.log("[Reviews/Summarize] Response type:", typeof response);
    console.log("[Reviews/Summarize] Response keys:", response ? Object.keys(response) : "null");
    console.log("[Reviews/Summarize] Has text property:", response && "text" in response);
    
    // Try to access text - it might be a getter that throws
    let raw;
    try {
      raw = (response.text || "").trim();
      console.log("[Reviews/Summarize] Got text, length:", raw.length);
    } catch (textError) {
      console.error("[Reviews/Summarize] Error accessing response.text:", textError);
      // Try alternative access methods
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          raw = candidate.content.parts
            .filter(part => part.text)
            .map(part => part.text)
            .join("")
            .trim();
          console.log("[Reviews/Summarize] Got text from candidates, length:", raw.length);
        }
      }
      if (!raw) {
        throw new Error(`Failed to extract text from response: ${textError.message}`);
      }
    }

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
      console.error("[Reviews/Summarize] Model returned invalid JSON:", raw);
      return res.status(500).json({ error: "Model returned invalid JSON", raw });
    }

    return res.json({
      positiveSummary: String(parsed.positiveSummary || "").trim(),
      negativeSummary: String(parsed.negativeSummary || "").trim(),
    });
  } catch (err) {
    console.error("[Reviews/Summarize] Gemini API error:", err);
    console.error("[Reviews/Summarize] Error stack:", err.stack);
    console.error("[Reviews/Summarize] Error name:", err.name);
    console.error("[Reviews/Summarize] Error message:", err.message);
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorDetails = {
      message: errorMessage,
      name: err.name,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    };
    
    return res.status(500).json({ 
      error: "Gemini request failed",
      details: errorDetails
    });
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
  if (!ai) {
    return res.status(500).json({ error: "Gemini AI not initialized. Check GEMINI_API_KEY." });
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
      model: "gemini-2.5-flash",
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

// Fast restaurant discovery using Gemini
app.get("/restaurants/gemini", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini AI not initialized. Check GEMINI_API_KEY." });
  }

  const { foodType, location = "Ottawa" } = req.query || {};

  if (!foodType) {
    return res.status(400).json({ error: "foodType query parameter is required" });
  }

  // Handle generic "restaurants" query - return general popular restaurants
  const isGenericQuery = foodType.toLowerCase() === "restaurants" || foodType.toLowerCase() === "all";
  
  const prompt = isGenericQuery
    ? `List 15-20 popular and diverse restaurants in ${location}, Ontario, Canada. Include a variety of cuisines (Italian, Asian, American, Mediterranean, etc.) to give users a good selection.

For each restaurant, provide:
- Restaurant name (exact name)
- Full street address in ${location}
- Brief one-sentence description (optional)
- Cuisine type (e.g., Italian, Sushi, Burgers, etc.)

Format your response as a JSON array of objects with this exact structure:
[
  {
    "name": "Restaurant Name",
    "address": "Full street address, ${location}, ON",
    "description": "Brief description",
    "cuisine": "Cuisine type"
  },
  ...
]

Return ONLY valid JSON, no markdown, no code blocks, no additional text.`
    : `List 15-20 popular ${foodType} restaurants in ${location}, Ontario, Canada.

For each restaurant, provide:
- Restaurant name (exact name)
- Full street address in ${location}
- Brief one-sentence description (optional)

Format your response as a JSON array of objects with this exact structure:
[
  {
    "name": "Restaurant Name",
    "address": "Full street address, ${location}, ON",
    "description": "Brief description"
  },
  ...
]

Return ONLY valid JSON, no markdown, no code blocks, no additional text.`;

  try {
    console.log(`[Gemini] Requesting restaurants for "${foodType}" in ${location}...`);
    console.log(`[Gemini] GEMINI_API_KEY exists: ${!!GEMINI_API_KEY}`);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    console.log(`[Gemini] API call successful, response type: ${typeof response}`);
    console.log(`[Gemini] Response keys: ${response ? Object.keys(response).join(", ") : "null"}`);

    // Access text exactly like /review and /categorize endpoints do
    let text = (response.text || "").trim();
    
    if (!text) {
      console.error("[Gemini] Empty response from API");
      console.error("[Gemini] Response object:", {
        keys: Object.keys(response || {}),
        hasText: response && "text" in response,
        textType: typeof (response?.text),
        textValue: response?.text
      });
      return res.status(500).json({ 
        error: "Gemini returned empty response",
        debug: {
          responseKeys: Object.keys(response || {}),
          textType: typeof (response?.text)
        }
      });
    }

    console.log(`[Gemini] Raw response length: ${text.length} chars`);
    console.log(`[Gemini] First 200 chars: ${text.substring(0, 200)}`);
    
    // Remove markdown code blocks if present
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    text = text.trim();

    // Try to parse JSON
    let restaurants;
    try {
      restaurants = JSON.parse(text);
    } catch (parseError) {
      console.warn("[Gemini] Initial JSON parse failed, trying to extract JSON array...");
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          restaurants = JSON.parse(jsonMatch[0]);
          console.log("[Gemini] Successfully extracted JSON from response");
        } catch (extractError) {
          console.error("[Gemini] Failed to parse extracted JSON:", extractError.message);
          console.error("[Gemini] Extracted text:", jsonMatch[0].substring(0, 500));
          throw new Error(`Failed to parse Gemini response as JSON: ${extractError.message}`);
        }
      } else {
        console.error("[Gemini] No JSON array found in response");
        console.error("[Gemini] Full response:", text.substring(0, 1000));
        throw new Error("Failed to parse Gemini response as JSON - no array found");
      }
    }

    // Validate and normalize the response
    if (!Array.isArray(restaurants)) {
      console.error("[Gemini] Response is not an array:", typeof restaurants);
      return res.status(500).json({ 
        error: "Gemini returned invalid format",
        received: typeof restaurants 
      });
    }

    console.log(`[Gemini] Parsed ${restaurants.length} restaurants`);

    // Map to our expected format
    const normalized = restaurants
      .filter((r) => {
        const hasName = r && (r.name || r.restaurant_name);
        const hasAddress = r && r.address;
        if (!hasName || !hasAddress) {
          console.warn("[Gemini] Skipping invalid restaurant:", r);
        }
        return hasName && hasAddress;
      })
      .map((r) => ({
        restaurant_name: r.name || r.restaurant_name || "Unknown",
        address: r.address || "Address not available",
        description: r.description || "",
        // For generic queries, use cuisine from Gemini response if available, otherwise use foodType
        cuisine: isGenericQuery && r.cuisine ? r.cuisine : foodType,
        // Default values - will be enriched by YellowCake
        rating: 4.0,
        price: "$$",
        imageUrl: null,
        photos: [],
      }));

    console.log(`[Gemini] ✓ Returning ${normalized.length} normalized restaurants`);
    res.json({ restaurants: normalized });
  } catch (err) {
    console.error("[Gemini] Restaurant discovery error:", err);
    console.error("[Gemini] Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to get restaurants from Gemini",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

// Zapier webhook proxy endpoint (to avoid CORS issues)
app.post("/zapier/webhook", async (req, res) => {
  const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/21189459/ugpnbit/";
  
  try {
    // Log the full request body for debugging
    console.log("[Zapier] Full request body:", JSON.stringify(req.body, null, 2));
    console.log("[Zapier] Proxying webhook request:", {
      bodyKeys: Object.keys(req.body || {}),
      hasEmails: Array.isArray(req.body?.emails),
      restaurant: req.body?.restaurant,
      restaurantType: typeof req.body?.restaurant,
      restaurantLength: req.body?.restaurant?.length,
      friendMessage: req.body?.friendMessage,
      friendMessageType: typeof req.body?.friendMessage,
      friendMessageLength: req.body?.friendMessage?.length,
      eventName: req.body?.eventName,
      dateTime: req.body?.dateTime,
    });
    
    // Create the payload to send to Zapier
    const zapierPayload = JSON.stringify(req.body);
    console.log("[Zapier] Payload being sent to Zapier:", zapierPayload.substring(0, 500) + "...");
    
    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: zapierPayload,
    });
    
    // Zapier webhooks typically return 200 even if there's an issue
    // Just forward the status and any response
    const responseText = await response.text();
    
    console.log("[Zapier] Webhook response:", {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length,
    });
    
    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      message: response.ok ? "Webhook called successfully" : "Webhook call failed",
    });
  } catch (error) {
    console.error("[Zapier] Error proxying webhook:", error);
    res.status(500).json({
      success: false,
      error: "Failed to call Zapier webhook",
      message: error.message,
    });
  }
});

// Error handlers to prevent server crashes
process.on("uncaughtException", (error) => {
  console.error("[Server] Uncaught Exception:", error);
  // Don't exit - keep server running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - keep server running
});
