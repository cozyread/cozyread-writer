const params = new URLSearchParams(window.location.search);
const storyId = params.get("story");

const dashboard = document.getElementById("dashboard");

if (!storyId && dashboard) {
  dashboard.style.display = "block";
}

import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= ELEMENTS ================= */
const dashboard = document.getElementById("dashboard");
const create = document.getElementById("create");
const writer = document.getElementById("writer");
const storyList = document.getElementById("storyList");

/* ================= ROUTER ================= */
const params = new URLSearchParams(window.location.search);
const storyId = params.get("story");
const page = params.get("page");

function hideAll() {
  dashboard.classList.add("hidden");
  create.classList.add("hidden");
  writer.classList.add("hidden");
}

hideAll();

/* 🔥 DEFAULT = DASHBOARD */
if (!storyId && !page) {
  dashboard.classList.remove("hidden");
  loadStories();
}
else if (page === "create") {
  create.classList.remove("hidden");
}
else if (storyId) {
  writer.classList.remove("hidden");
}

/* ================= DASHBOARD ================= */
async function loadStories() {
  storyList.innerHTML = "Loading…";

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    storyList.innerHTML = "Error loading stories";
    return;
  }

  if (!data.length) {
    storyList.innerHTML = "<p>No stories yet.</p>";
    return;
  }

  storyList.innerHTML = "";

  data.forEach((story) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${story.title}</h3>
      <p>${story.description || ""}</p>
      <button onclick="openWriter('${story.id}')">Continue Writing</button>
    `;
    storyList.appendChild(div);
  });
}

/* ================= NAV ================= */
window.goCreate = () => {
  window.location.href = "index.html?page=create";
};

window.openWriter = (id) => {
  window.location.href = `index.html?story=${id}`;
};

/* ================= CREATE STORY ================= */
window.createStory = async () => {
  const title = document.getElementById("newTitle").value.trim();
  const description = document.getElementById("newDesc").value.trim();

  if (!title) {
    alert("Title required");
    return;
  }

  const { data: story, error } = await supabase
    .from("stories")
    .insert({ title, description })
    .select()
    .single();

  if (error) {
    alert(error.message);
    console.error(error);
    return;
  }

  await supabase.from("chapters").insert({
    story_id: story.id,
    title: "Chapter 1",
    content: "<p></p>",
    status: "draft",
  });

  window.location.href = `index.html?story=${story.id}`;
};
