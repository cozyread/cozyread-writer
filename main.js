import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ================= SUPABASE ================= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= STORY ================= */
const storyId = new URLSearchParams(window.location.search).get("story");
if (!storyId) {
  alert("Open the writer using ?story=STORY_ID");
  throw new Error("Missing story id");
}

/* ================= STATE ================= */
let currentChapterId = null;
let saveTimer = null;

/* ================= EDITOR ================= */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
  content: "<p></p>",
});

/* ================= TOOLBAR (FIXED) ================= */
document.getElementById("toolbar").addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  if (!action) return;

  editor.commands.focus();

  switch (action) {
    case "bold":
      editor.commands.toggleBold();
      break;

    case "italic":
      editor.commands.toggleItalic();
      break;

    case "h1":
      editor.commands.toggleHeading({ level: 1 });
      break;

    case "h2":
      editor.commands.toggleHeading({ level: 2 });
      break;

    case "ul":
      editor.commands.toggleBulletList();
      break;

    case "ol":
      editor.commands.toggleOrderedList();
      break;

    case "quote":
      editor.commands.toggleBlockquote();
      break;

    case "undo":
      editor.commands.undo();
      break;

    case "redo":
      editor.commands.redo();
      break;
  }
});

/* ================= COUNTERS ================= */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("words").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("chars").textContent =
    text.length + " chars";
}

/* ================= AUTOSAVE ================= */
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

/* ================= CHAPTERS ================= */
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
    el.textContent = ch.title || "Untitled Chapter";
    el.onclick = () => loadChapter(ch.id);
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
  updateCounts();
  loadChapters();
}

async function createChapter() {
  const { data } = await supabase
    .from("chapters")
    .insert({
      story_id: storyId,
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

/* ================= PUBLISH ================= */
document.getElementById("publish").onclick = async () => {
  if (!currentChapterId) return;

  await supabase
    .from("chapters")
    .update({ status: "published" })
    .eq("id", currentChapterId);

  document.getElementById("status").textContent = "Published";
};

/* ================= DELETE ================= */
document.getElementById("delete").onclick = async () => {
  if (!currentChapterId) return;
  if (!confirm("Delete this chapter?")) return;

  await supabase
    .from("chapters")
    .delete()
    .eq("id", currentChapterId);

  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* ================= INIT ================= */
loadChapters();
