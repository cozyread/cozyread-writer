const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode");
const STORY_ID = params.get("story");


import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* =========================
   ENV (REQUIRED FOR VITE)
========================= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.body.innerHTML =
    "<h1 style='color:white;padding:40px'>Supabase env vars missing</h1>";
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STORY CONTEXT
========================= */
const STORY_ID = new URLSearchParams(window.location.search).get("story");

if (!STORY_ID) {
  document.body.innerHTML =
    "<h1 style='color:white;padding:40px'>No story selected</h1>";
  throw new Error("Missing story ID");
}

/* =========================
   STATE
========================= */
let currentChapterId = null;
let saveTimer = null;
let dirty = false;

/* =========================
   EDITOR
========================= */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
});

/* =========================
   TOOLBAR
========================= */
document.getElementById("toolbar").onclick = (e) => {
  const a = e.target.closest("button")?.dataset.a;
  if (!a) return;

  editor.chain().focus();
  if (a === "bold") editor.toggleBold().run();
  if (a === "italic") editor.toggleItalic().run();
  if (a === "h1") editor.toggleHeading({ level: 1 }).run();
  if (a === "h2") editor.toggleHeading({ level: 2 }).run();
  if (a === "quote") editor.toggleBlockquote().run();
  if (a === "ul") editor.toggleBulletList().run();
  if (a === "ol") editor.toggleOrderedList().run();
  if (a === "undo") editor.undo();
  if (a === "redo") editor.redo();
};

/* =========================
   LOAD CHAPTERS
========================= */
async function loadChapters() {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", STORY_ID)
    .order("created_at");

  const list = document.getElementById("chapterList");
  list.innerHTML = "";

  data.forEach((c) => {
    const el = document.createElement("div");
    el.className = "chapter";
    el.textContent = c.title || "Untitled Chapter";
    el.onclick = () => loadChapter(c.id);
    el.dataset.id = c.id;
    list.appendChild(el);
  });

  if (!currentChapterId && data.length) {
    loadChapter(data[0].id);
  }
}

async function loadChapter(id) {
  currentChapterId = id;

  document
    .querySelectorAll(".chapter")
    .forEach((c) => c.classList.remove("active"));
  document.querySelector(`[data-id="${id}"]`)?.classList.add("active");

  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("titleInput").value = data.title || "";
  document.getElementById("chapterStatus").textContent =
    data.status === "published" ? "Published" : "Draft";

  editor.commands.setContent(data.content || "<p></p>");
  dirty = false;
  updateCounts();
}

/* =========================
   NEW CHAPTER
========================= */
document.getElementById("newChapter").onclick = async () => {
  await supabase.from("chapters").insert({
    story_id: STORY_ID,
    title: "Untitled Chapter",
    content: "<p></p>",
    status: "draft",
  });

  loadChapters();
};

/* =========================
   SAVE LOGIC
========================= */
async function save() {
  if (!currentChapterId) return;

  await supabase.from("chapters").update({
    title: document.getElementById("titleInput").value,
    content: editor.getHTML(),
  }).eq("id", currentChapterId);

  dirty = false;
  document.getElementById("saveStatus").textContent = "Saved";
  document.getElementById("lastSaved").textContent =
    "Saved " + new Date().toLocaleTimeString();
}

editor.on("update", () => {
  dirty = true;
  updateCounts();
  document.getElementById("saveStatus").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 800);
});

document.getElementById("titleInput").oninput = () => {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 800);
};

/* =========================
   PUBLISH / DELETE
========================= */
document.getElementById("publish").onclick = async () => {
  await supabase.from("chapters").update({ status: "published" }).eq("id", currentChapterId);
  document.getElementById("chapterStatus").textContent = "Published";
};

document.getElementById("delete").onclick = async () => {
  if (!confirm("Delete chapter?")) return;
  await supabase.from("chapters").delete().eq("id", currentChapterId);
  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* =========================
   COUNTS
========================= */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("wordCount").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("charCount").textContent = text.length + " chars";
}

/* =========================
   INIT
========================= */
loadChapters();
