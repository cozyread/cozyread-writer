import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= ROUTER ================= */
const params = new URLSearchParams(window.location.search);
const page = params.get("page");
const storyId = params.get("story");

const dashboard = document.getElementById("dashboard");
const create = document.getElementById("create");
const writer = document.getElementById("writer");

function hideAll() {
  dashboard.classList.add("hidden");
  create.classList.add("hidden");
  writer.classList.add("hidden");
}

hideAll();

if (storyId) {
  writer.classList.remove("hidden");
  // 🔥 your existing writer code runs here
} else if (page === "create") {
  create.classList.remove("hidden");
} else {
  dashboard.classList.remove("hidden");
}

/* ================= DASHBOARD ================= */
async function loadStories() {
  const { data } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  const list = document.getElementById("storyList");
  list.innerHTML = "";

  data.forEach((s) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${s.title}</h3>
      <button onclick="openWriter('${s.id}')">Continue</button>
    `;
    list.appendChild(div);
  });
}

window.openWriter = (id) => {
  window.location.href = `index.html?story=${id}`;
};

window.goCreate = () => {
  window.location.href = `index.html?page=create`;
};

if (!storyId && page !== "create") {
  loadStories();
}

/* ================= CREATE STORY ================= */
window.createStory = async () => {
  const title = document.getElementById("newTitle").value.trim();
  const description = document.getElementById("newDesc").value.trim();

  if (!title) {
    alert("Title required");
    return;
  }

  const { data: story } = await supabase
    .from("stories")
    .insert({ title, description })
    .select()
    .single();

  await supabase.from("chapters").insert({
    story_id: story.id,
    title: "Chapter 1",
    content: "<p></p>",
    status: "draft",
  });

  window.location.href = `index.html?story=${story.id}`;
};
