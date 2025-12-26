const themeToggle = document.getElementById("themeIcon");
const themeToggleMobile = document.getElementById("themeIconMobile");
const body = document.getElementById("body");
const moodImage = document.getElementById("moodImage");
const getStartedBtn = document.querySelector(".primary");
const moodInput = document.querySelector("input");
const focusModeBtn = document.getElementById("focusModeBtn");

// Genre selection tracking
let selectedGenre = "";
const genreButtons = document.querySelectorAll("#genreGrid button");
genreButtons.forEach(button => {
  button.addEventListener("click", () => {
    genreButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    selectedGenre = button.getAttribute("data-genre");
  });
});

// Image fade swap
function swapImage(newSrc) {
  moodImage.style.opacity = 0;
  setTimeout(() => {
    moodImage.src = newSrc;
    moodImage.onload = () => {
      moodImage.style.opacity = 1;
    };
  }, 200);
}

// Focus Mode
focusModeBtn.addEventListener("click", async () => {
  const focusGenres = ["ambient", "instrumental beats", "study beats", "chillhop"];
  let success = false;
  let tries = 0;

  while (!success && tries < 5) {
    const genre = focusGenres[Math.floor(Math.random() * focusGenres.length)];

    try {
      const res = await fetch("http://localhost:3000/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: "focus", genre })
      });

      const data = await res.json();
      if (data?.playlist) {
        const playlistId = data.playlist.id;
        const playlistName = encodeURIComponent(data.playlist.name);
        window.location.href = `playlist.html?id=${playlistId}&name=${playlistName}`;
        success = true;
      } else {
        tries++;
      }
    } catch (err) {
      console.error("Focus mode fetch error:", err);
      tries++;
    }
  }

  if (!success) {
    alert("Could not enter focus mode. Try again later.");
  }
});

// Theme load on startup
const storedTheme = localStorage.getItem("theme");
if (storedTheme === "dark") {
  body.classList.add("dark");
  themeToggle.src = "../images/lightmodeicon.png";
  if (themeToggleMobile) themeToggleMobile.src = "../images/lightmodeicon.png";
  swapImage("../images/moon.png");
} else {
  themeToggle.src = "../images/darkmodeicon.png";
  if (themeToggleMobile) themeToggleMobile.src = "../images/darkmodeicon.png";
  swapImage("../images/sun.png");
}

// Theme toggle function
function toggleTheme() {
  body.classList.toggle("dark");
  const isDark = body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  const newIcon = isDark ? "../images/lightmodeicon.png" : "../images/darkmodeicon.png";
  themeToggle.src = newIcon;
  if (themeToggleMobile) themeToggleMobile.src = newIcon;
  swapImage(isDark ? "../images/moon.png" : "../images/sun.png");
}

themeToggle.addEventListener("click", () => toggleTheme());
if (themeToggleMobile) {
  themeToggleMobile.addEventListener("click", () => toggleTheme());
}

// Mood recommendation
getStartedBtn.addEventListener("click", async () => {
  const mood = moodInput.value.trim().toLowerCase();
  if (!mood) return alert("Please enter your mood first!");

  try {
    const res = await fetch("http://localhost:3000/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, genre: selectedGenre })
    });

    const data = await res.json();
    if (!data.playlist) throw new Error("No playlist returned");

    const playlistId = data.playlist.id;
    const playlistName = encodeURIComponent(data.playlist.name);
    window.location.href = `playlist.html?id=${playlistId}&name=${playlistName}`;
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again later.");
  }
});

// 🍔 Mobile Menu Toggle
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    // ✅ Only toggle the "show" class
    mobileMenu.classList.toggle("show");
  });

  // Optional: close menu when clicking links
  mobileMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("show");
    });
  });
}
