import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= ROUTING ================= */
const params = new URLSearchParams(window.location.search);
const storyId = params.get("story");

const dashboard = document.getElementById("dashboard");
const writer = document.getElementById("writer");

/* ================= DEFAULT STATE ================= */
// Hide both first
dashboard.classList.add("hidden");
writer.classList.add("hidden");

/* ================= SHOW DASHBOARD ================= */
if (!storyId) {
  dashboard.classList.remove("hidden");
  loadDashboardStories();
}

/* ================= SHOW WRITER ================= */
if (storyId) {
  writer.classList.remove("hidden");

  // 🔴 YOUR EXISTING WRITER JS RUNS AS-IS BELOW
  // Nothing here interferes with it
}

/* ================= DASHBOARD LOGIC ================= */
async function loadDashboardStories() {
  const list = document.getElementById("storyList");
  list.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = "Failed to load stories";
    return;
  }

  if (!data.length) {
    list.innerHTML = "<p>No stories yet.</p>";
    return;
  }

  list.innerHTML = "";
  data.forEach((story) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${story.title}</h3>
      <p>${story.description || ""}</p>
      <button onclick="openWriter('${story.id}')">
        Continue Writing
      </button>
    `;
    list.appendChild(div);
  });
}

/* ================= NAV ================= */
window.openWriter = (id) => {
  window.location.href = `index.html?story=${id}`;
};

const newStoryBtn = document.getElementById("newStoryBtn");
if (newStoryBtn) {
  newStoryBtn.onclick = () => {
    window.location.href = "create-story.html";
  };
}
