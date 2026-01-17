import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const storyId = new URLSearchParams(window.location.search).get("story");
if (!storyId) {
  alert("Open with ?story=STORY_ID");
  throw new Error("Missing story id");
}

let currentChapterId = null;
let saveTimer = null;

/* ===== EDITOR ===== */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
});

/* ===== TOOLBAR ===== */
document.getElementById("toolbar").addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;

  editor.chain().focus();
  if (action === "bold") editor.toggleBold().run();
  if (action === "italic") editor.toggleItalic().run();
  if (action === "h1") editor.toggleHeading({ level: 1 }).run();
  if (action === "h2") editor.toggleHeading({ level: 2 }).run();
  if (action === "ul") editor.toggleBulletList().run();
  if (action === "ol") editor.toggleOrderedList().run();
  if (action === "quote") editor.toggleBlockquote().run();
  if (action === "undo") editor.undo();
  if (action === "redo") editor.redo();
});

/* ===== COUNTS ===== */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("words").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("chars").textContent = text.length + " chars";
}

/* ===== SAVE ===== */
async function saveChapter() {
  if (!currentChapterId) return;
  await supabase.from("chapters").update({
    title: document.getElementById("title").value,
    content: editor.getHTML(),
  }).eq("id", currentChapterId);

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

/* ===== CHAPTERS ===== */
async function loadChapters() {
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at");

  const list = document.getElementById("chapterList");
  list.innerHTML = "";

  if (!data.length) {
    await createChapter();
    return;
  }

  data.forEach((ch) => {
    const el = document.createElement("div");
    el.className = "chapter" + (ch.id === currentChapterId ? " active" : "");
    el.textContent = ch.title;
    el.onclick = () => loadChapter(ch.id);
    list.appendChild(el);
  });

  if (!currentChapterId) loadChapter(data[0].id);
}

async function loadChapter(id) {
  currentChapterId = id;
  const { data } = await supabase.from("chapters").select("*").eq("id", id).single();
  document.getElementById("title").value = data.title;
  editor.commands.setContent(data.content || "<p></p>");
  updateCounts();
}

async function createChapter() {
  const { data } = await supabase.from("chapters").insert({
    story_id: storyId,
    title: "Untitled Chapter",
    content: "<p></p>",
  }).select().single();

  currentChapterId = data.id;
  loadChapters();
}

document.getElementById("newChapter").onclick = createChapter;

/* ===== PUBLISH ===== */
document.getElementById("publish").onclick = async () => {
  await supabase.from("chapters")
    .update({ status: "published" })
    .eq("id", currentChapterId);
  document.getElementById("status").textContent = "Published";
};

/* ===== DELETE ===== */
document.getElementById("delete").onclick = async () => {
  if (!confirm("Delete chapter?")) return;
  await supabase.from("chapters").delete().eq("id", currentChapterId);
  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* ===== INIT ===== */
loadChapters();
