import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import getSpotifyPlaylist from "./spotifyClient.js";
import { history } from "./db.js";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genreAliasMap = {
  hiphop: "hip-hop",
  rnb: "r&b",
  easylistening: "easy listening",
  korean: "k-pop",
  japanese: "j-pop",
  thai: "thai pop"
};

const prioritizedCategories = [
  "pop", "rock", "electronic", "hiphop", "hip-hop", "metal", "folk",
  "classical", "jazz", "rnb", "r&b", "country", "reggae", "thai", "thai pop",
  "easylistening", "easy listening", "korean", "k-pop", "japanese", "j-pop",
  "acoustic", "chill", "lofi", "romance", "romantic", "heartbreak", "heartbroken",
  "high", "drunk", "happy", "motivated", "melancholy", "confident",
  "lonely", "lost", "cozy", "party", "spiritual", "vulnerable", "bored",
  "ambient", "instrumental beats", "study beats", "chillhop"
];

// 🔗 Ask Python server for mood classification
async function classifyMoodViaPython(moodText) {
  const res = await fetch("http://localhost:5000/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood: moodText })
  });

  if (!res.ok) throw new Error("Failed to classify mood via Python");
  const data = await res.json();
  return data.category;
}

// 📡 POST /api/recommend — standard flow
app.post("/api/recommend", async (req, res) => {
  const { mood, genre } = req.body;
  const moodText = mood?.toLowerCase() || "";
  let genreText = genre?.toLowerCase();

  if (genreText && genreAliasMap[genreText]) {
    genreText = genreAliasMap[genreText];
  }

  let category;

  try {
    if (genreText && prioritizedCategories.includes(genreText)) {
      category = genreText;
      console.log(`🎵 Genre selected: ${category}`);
    } else if (moodText === "focus") {
      const focusGenres = ["ambient", "instrumental beats", "study beats", "chillhop"];
      category = focusGenres[Math.floor(Math.random() * focusGenres.length)];
      console.log(`🎧 Focus mode triggered → ${category}`);
    } else {
      category = await classifyMoodViaPython(moodText);
      console.warn(`⚠️ Fallback to AI mood classification: ${category}`);
    }

    // 🔁 Combine mood + genre during playlist selection
    const playlist = await getSpotifyPlaylist(category, moodText, {
      focusFilter: moodText === "focus"
    });

    await history.insertOne({
      mood: moodText,
      category,
      playlist: {
        name: playlist.name,
        url: playlist.external_urls.spotify,
        id: playlist.id
      },
      timestamp: new Date()
    });

    res.json({ playlist });
  } catch (err) {
    console.error("❌ Error during recommendation:", err);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});

// 📡 POST /api/refine — reroll playlist based on previousId/category/feedback
app.post("/api/refine", async (req, res) => {
  const { previousId, category, feedback, mode } = req.body;

  try {
    const used = await history.find({ category }).toArray();
    const usedIds = used.map(entry => entry.playlist?.id);

    const focusGenres = ["ambient", "instrumental beats", "study beats", "chillhop"];
    const categoryPool = mode === "focus" ? focusGenres : [category];

    let retries = 0;
    let playlist = null;
    let tryCategory = null;

    while (!playlist && retries < 5) {
      tryCategory = categoryPool[Math.floor(Math.random() * categoryPool.length)];
      const attempt = await getSpotifyPlaylist(tryCategory, "", {
        focusFilter: mode === "focus"
      });

      if (!usedIds.includes(attempt.id) && attempt.id !== previousId) {
        playlist = attempt;
      } else {
        retries++;
      }
    }

    if (!playlist) {
      return res.status(404).json({ error: "No alternative playlist found" });
    }

    console.log("🎯 Refined using category:", tryCategory);

    await history.insertOne({
      mood: "[refined]",
      category: tryCategory,
      feedback,
      playlist: {
        name: playlist.name,
        url: playlist.external_urls.spotify,
        id: playlist.id
      },
      timestamp: new Date()
    });

    res.json({ playlist });
  } catch (err) {
    console.error("❌ Refine flow failed:", err);
    res.status(500).json({ error: "Failed to refine playlist" });
  }
});

// 🧼 Startup cleanup (DEV only)
await history.deleteMany({});
console.log("🧼 [Startup] Cleared playlist history");

app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});

// 🧹 Cleanup on exit
let shuttingDown = false;
process.on("SIGINT", async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log("\n🧹 Cleaning DB before shutdown...");
  try {
    const result = await history.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} records`);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
  }

  process.exit(0);
});
