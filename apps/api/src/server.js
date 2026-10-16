import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import cron from "node-cron";
import OpenAI from "openai";
import { Comment } from "./models/Comment.js";
import { CRITERIA } from "./data/countries.js";
import { getLastUpdated, getRankings, refreshRankings } from "./rankings.js";

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json({ limit: "64kb" }));

const SYSTEM_PROMPT = `You are Index AI Analyst, a geopolitical analyst for the Hard Power Index. Explain rankings based only on military, GDP, industry, trade, energy, nuclear capability, strategic influence, logistics, and currency power. Do not mention quality of life, health, happiness, or lifestyle. Keep answers logical, realistic, analytical, and concise. Clearly state that the data and index are approximate.`;

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/rankings", (_req, res) => res.json({ rankings: getRankings().slice(0, 50), criteria: CRITERIA, updatedAt: getLastUpdated() }));

app.post("/api/ask", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question || question.length > 600) return res.status(400).json({ error: "Ask a question up to 600 characters." });
  const snapshot = getRankings().slice(0, 15).map(c => `${c.rank}. ${c.name}: ${c.score}`).join("; ");
  if (!process.env.OPENAI_API_KEY) {
    return res.json({ answer: `Index AI Analyst is running in local analysis mode. The current top ranks are ${snapshot}. The score is a weighted estimate: military 25%, GDP 20%, industry/trade/energy 10% each, nuclear 8%, strategic influence 7%, logistics and currency 5% each. Data is approximate. Add OPENAI_API_KEY to enable conversational answers.`, mode: "local" });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", temperature: 0.3, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Current ranking snapshot: ${snapshot}.\n\nQuestion: ${question}` }] });
    res.json({ answer: completion.choices[0]?.message?.content || "No analysis returned.", mode: "ai" });
  } catch (error) { res.status(502).json({ error: "The analyst is temporarily unavailable." }); }
});

app.get("/api/comments", async (_req, res) => {
  try { res.json({ comments: await Comment.find().sort({ createdAt: -1 }).lean() }); }
  catch { res.json({ comments: [] }); }
});
app.post("/api/comments", async (req, res) => {
  const name = String(req.body?.name || "").trim(); const comment = String(req.body?.comment || "").trim();
  if (!name || !comment || name.length > 60 || comment.length > 800) return res.status(400).json({ error: "Please provide a name and a comment within the allowed length." });
  try { res.status(201).json({ comment: await Comment.create({ name, comment }) }); }
  catch { res.status(503).json({ error: "Discussion storage is unavailable. Check MongoDB connection." }); }
});

async function boot() {
  if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB connected")).catch(e => console.warn("MongoDB unavailable:", e.message));
  await refreshRankings();
  cron.schedule("0 0 * * *", () => refreshRankings());
  app.listen(port, () => console.log(`HPI API listening on :${port}`));
}
boot();
