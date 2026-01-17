import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ================= SUPABASE ================= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= PAGE DETECTION ================= */
const params = new URLSearchParams(window.location.search);
const storyId = params.get("story");
const isCreateStoryPage = !!document.getElementById("createStoryForm");

/* ================= CREATE STORY ================= */
if (isCreateStoryPage) {
  document
    .getElementById("createStoryForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();

      const { data, error } = await supabase
        .from("stories")
        .insert({ title, description })
        .select()
        .single();

      if (error) {
        alert(error.message);
        console.error(error);
        return;
      }

      window.location.href = `index.html?story=${data.id}`;
    });

  // STOP here — do not run writer code
  return;
}

/* ================= WRITER GUARD ================= */
if (!storyId) {
  alert("Open the writer with ?story=STORY_ID");
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

/* ================= TOOLBAR ================= */
document.getElementById("toolbar").addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  editor.commands.focus();

  if (action === "bold") editor.commands.toggleBold();
  if (action === "italic") editor.commands.toggleItalic();
  if (action === "h1") editor.commands.toggleHeading({ level: 1 });
  if (action === "h2") editor.commands.toggleHeading({ level: 2 });
  if (action === "ul") editor.commands.toggleBulletList();
  if (action === "ol") editor.commands.toggleOrderedList();
  if (action === "quote") editor.commands.toggleBlockquote();
  if (action === "undo") editor.commands.undo();
  if (action === "redo") editor.commands.redo();
});

/* ================= COUNTERS ================= */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("words").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("chars").textContent =
    text.length + " chars";
}

/* ================= SAVE ================= */
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

  if (!currentChapterId) loadChapter(data[0].id);
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

/* ================= PUBLISH / DELETE ================= */
document.getElementById("publish").onclick = async () => {
  await supabase
    .from("chapters")
    .update({ status: "published" })
    .eq("id", currentChapterId);
};

document.getElementById("delete").onclick = async () => {
  if (!confirm("Delete chapter?")) return;
  await supabase.from("chapters").delete().eq("id", currentChapterId);
  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* ================= INIT ================= */
loadChapters();
