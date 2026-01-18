import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ROUTER */
const params = new URLSearchParams(window.location.search);
const storyId = params.get("story");
const page = params.get("page");

const dashboard = document.getElementById("dashboard");
const create = document.getElementById("create");
const writer = document.getElementById("writer");

function hideAll() {
  dashboard.classList.add("hidden");
  create.classList.add("hidden");
  writer.classList.add("hidden");
}

hideAll();

/* DASHBOARD */
if (!storyId && !page) {
  dashboard.classList.remove("hidden");
  loadStories();
}

/* CREATE */
if (page === "create") {
  create.classList.remove("hidden");
}

/* WRITER */
let currentChapterId = null;

if (storyId) {
  writer.classList.remove("hidden");
  loadChapters();
}

/* DASHBOARD LOGIC */
async function loadStories() {
  const list = document.getElementById("storyList");
  const { data } = await supabase.from("stories").select("*");
  list.innerHTML = "";
  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${s.title}</h3>
      <button onclick="openStory('${s.id}')">Continue</button>
    `;
    list.appendChild(div);
  });
}

window.openStory = (id) => {
  window.location.href = `/?story=${id}`;
};

window.goCreate = () => {
  window.location.href = "/?page=create";
};

/* CREATE STORY */
window.createStory = async () => {
  const title = document.getElementById("newTitle").value.trim();
  const desc = document.getElementById("newDesc").value.trim();
  const { data: story } = await supabase
    .from("stories")
    .insert({ title, description: desc })
    .select()
    .single();

  const { data: chapter } = await supabase
    .from("chapters")
    .insert({
      story_id: story.id,
      title: "Chapter 1",
      content: ""
    })
    .select()
    .single();

  window.location.href = `/?story=${story.id}`;
};

/* WRITER */
async function loadChapters() {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at");

  currentChapterId = data[0].id;
  document.getElementById("chapterTitle").value = data[0].title;
  document.getElementById("editor").value = data[0].content || "";
}

document.getElementById("editor").addEventListener("input", save);

async function save() {
  await supabase.from("chapters").update({
    title: document.getElementById("chapterTitle").value,
    content: document.getElementById("editor").value
  }).eq("id", currentChapterId);
}

window.publish = async () => {
  await supabase.from("chapters").update({
    status: "published"
  }).eq("id", currentChapterId);
};

window.deleteChapter = async () => {
  await supabase.from("chapters").delete().eq("id", currentChapterId);
  window.location.href = "/";
};
