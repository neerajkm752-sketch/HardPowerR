import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import cron from "node-cron";
import { randomUUID } from "node:crypto";
import { Comment } from "./models/Comment.js";
import { CRITERIA } from "./data/countries.js";
import { getLastUpdated, getRankings, refreshRankings } from "./rankings.js";
import { askAnalyst } from "./analyst.js";

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(express.json({ limit: "64kb" }));

let mongoReady = false;
const memoryComments = [];

app.get("/api/health", (_req, res) => res.json({ ok: true, mongo: mongoReady }));
app.get("/api/rankings", (_req, res) => res.json({ rankings: getRankings().slice(0, 50), criteria: CRITERIA, updatedAt: getLastUpdated() }));

app.post("/api/ask", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question || question.length > 600) return res.status(400).json({ error: "Ask a question up to 600 characters." });
  const snapshot = getRankings().slice(0, 15).map(c => `${c.rank}. ${c.name}: ${c.score}`).join("; ");
  try {
    const result = await askAnalyst(question, snapshot);
    res.json(result);
  } catch (error) {
    console.warn("Analyst error:", error.message);
    res.status(502).json({ error: "The analyst is temporarily unavailable. Please try again in a moment." });
  }
});

app.get("/api/comments", async (_req, res) => {
  if (mongoReady) {
    try {
      return res.json({ comments: await Comment.find().sort({ createdAt: -1 }).lean(), stored: "mongodb" });
    } catch (error) {
      console.warn("Comment read fell back to memory:", error.message);
    }
  }
  res.json({ comments: memoryComments, stored: "memory" });
});

app.post("/api/comments", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const comment = String(req.body?.comment || "").trim();
  if (!name || !comment || name.length > 60 || comment.length > 800) {
    return res.status(400).json({ error: "Please provide a name and a comment within the allowed length." });
  }
  if (mongoReady) {
    try {
      return res.status(201).json({ comment: await Comment.create({ name, comment }), stored: "mongodb" });
    } catch (error) {
      console.warn("Comment write fell back to memory:", error.message);
    }
  }
  const saved = { _id: randomUUID(), name, comment, createdAt: new Date().toISOString() };
  memoryComments.unshift(saved);
  if (memoryComments.length > 200) memoryComments.pop();
  res.status(201).json({ comment: saved, stored: "memory" });
});

async function boot() {
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => { mongoReady = true; console.log("MongoDB connected"); })
      .catch(e => console.warn("MongoDB unavailable, comments stay in memory:", e.message));
  }
  await refreshRankings();
  cron.schedule("0 0 * * *", () => refreshRankings());
  app.listen(port, () => console.log(`HPI API listening on :${port}`));
}
boot();
