import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ======================
   SUPABASE
====================== */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ======================
   STORY ID
====================== */
const params = new URLSearchParams(window.location.search);
const STORY_ID = params.get("story");

if (!STORY_ID) {
  console.warn("No story id — writer disabled");
  return;
}

/* ======================
   STATE
====================== */
let currentChapterId = null;
let saveTimer = null;

/* ======================
   TIPTAP EDITOR
====================== */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
  content: "<p></p>",
});

/* ======================
   WORD / CHAR COUNT
====================== */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("words").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("chars").textContent =
    text.length + " chars";
}

/* ======================
   AUTOSAVE
====================== */
async function saveChapter() {
  if (!currentChapterId) return;

  await supabase
    .from("chapters")
    .update({
      title: document.getElementById("title").value || "Untitled Chapter",
      content: editor.getHTML(),
    })
    .eq("id", currentChapterId);

  document.getElementById("status").textContent =
    "Saved " + new Date().toLocaleTimeString();
}

editor.on("update", () => {
  updateCounts();
  document.getElementById("status").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveChapter, 800);
});

document.getElementById("title").addEventListener("input", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveChapter, 800);
});

/* ======================
   LOAD CHAPTERS
====================== */
async function loadChapters() {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", STORY_ID)
    .order("created_at");

  const list = document.getElementById("chapterList");
  list.innerHTML = "";

  if (!data.length) {
    createChapter();
    return;
  }

  data.forEach((chapter) => {
    const el = document.createElement("div");
    el.id = "chapter";
    el.textContent = chapter.title;
    el.onclick = () => loadChapter(chapter.id);
    list.appendChild(el);
  });

  if (!currentChapterId) {
    loadChapter(data[0].id);
  }
}

async function loadChapter(id) {
  currentChapterId = id;

  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("title").value = data.title;
  editor.commands.setContent(data.content || "<p></p>");
  document.getElementById("status").textContent =
    data.status === "published" ? "Published" : "Draft";

  updateCounts();
}

/* ======================
   CREATE CHAPTER
====================== */
async function createChapter() {
  const { data } = await supabase
    .from("chapters")
    .insert({
      story_id: STORY_ID,
      title: "Untitled Chapter",
      content: "<p></p>",
      status: "draft",
    })
    .select()
    .single();

  currentChapterId = data.id;
  loadChapters();
}

document.getElementById("newChapter").onclick = createChapter;

/* ======================
   PUBLISH
====================== */
document.getElementById("publish").onclick = async () => {
  if (!currentChapterId) return;

  await supabase
    .from("chapters")
    .update({ status: "published" })
    .eq("id", currentChapterId);

  document.getElementById("status").textContent = "Published";
};

/* ======================
   DELETE
====================== */
document.getElementById("delete").onclick = async () => {
  if (!currentChapterId) return;
  if (!confirm("Delete this chapter?")) return;

  await supabase.from("chapters").delete().eq("id", currentChapterId);
  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* ======================
   INIT
====================== */
loadChapters();
