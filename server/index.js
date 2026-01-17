import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const API_KEY = "yc_live_oNRN2qnbv__Xur00GrtRWJ8tb8g0hiUc9QLrmE0WNgI=";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

async function extractStream(url, prompt) {
  const res = await fetch("https://api.yellowcake.dev/v1/extract-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ url, prompt }),
  });
  return res.body;
}

app.get("/extract", async (req, res) => {
  const url = req.query.url;
  const prompt = req.query.prompt;

  if (!url || !prompt) return res.status(400).send("Missing url or prompt");

  // SSE headers
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  

  try {
    const stream = await extractStream(url, prompt);

    for await (const chunk of stream) {
      res.write(chunk)
    }
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Extraction failed");
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));