import fetch from "node-fetch";

let accessToken = null;
let tokenExpires = 0;

// Get Spotify access token
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpires) return accessToken;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpires = Date.now() + data.expires_in * 1000;

  return accessToken;
}

// Filter playlists for focus-safe tags (used only in focus mode)
function isFocusApproved(playlist) {
  const text = `${playlist.name} ${playlist.description}`.toLowerCase();
  const good = ["lofi", "ambient", "study", "instrumental", "focus", "beats", "chillhop"];
  const bad = ["love", "sad", "heartbreak", "pop", "rap", "breakup", "party", "emotional"];

  return (
    good.some(g => text.includes(g)) &&
    !bad.some(b => text.includes(b))
  );
}

// Get Spotify playlist based on category + mood
export default async function getSpotifyPlaylist(category, mood = "", options = { focusFilter: false }) {
  const token = await getAccessToken();

  // Combine mood + category for smarter search (e.g., "sad korean")
  const searchQuery = `${mood} ${category}`.trim();
  const query = encodeURIComponent(searchQuery);
  const limit = 50;
  const maxOffset = 950;
  const offset = Math.floor(Math.random() * (maxOffset / limit + 1)) * limit;

  const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=${limit}&offset=${offset}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  const all = data.playlists?.items || [];

  let filtered = all;
  if (options.focusFilter) {
    filtered = all.filter(p => p && isFocusApproved(p));
  }

  console.log(`🎯 Searched: "${searchQuery}" | Total: ${all.length} | Filtered: ${filtered.length}`);

  if (filtered.length === 0) {
    console.warn("⚠️ No filtered playlists found, returning fallback");
    return all[Math.floor(Math.random() * all.length)];
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
}
