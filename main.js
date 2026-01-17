import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* =====================
   ENV (VITE REQUIRED)
===================== */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.body.innerHTML =
    "<h1 style='color:white;padding:40px'>Missing Supabase env vars</h1>";
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =====================
   ROUTING
===================== */
const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode");
const STORY_ID = params.get("story");

/* =====================
   CREATE STORY MODE
===================== */
if (MODE === "create") {
  document.body.innerHTML = `
    <div style="background:#1a1526;color:white;height:100vh;display:flex;align-items:center;justify-content:center">
      <form id="createStory" style="background:#221c33;padding:28px;border-radius:18px;width:380px">
        <h1 style="color:#c89b3c;text-align:center;margin-top:0">Create Story</h1>
        <input id="title" placeholder="Story title" style="width:100%;margin-bottom:12px;padding:12px;border-radius:12px;border:none;background:#1a1526;color:white" required />
        <textarea id="description" placeholder="Short description" style="width:100%;margin-bottom:12px;padding:12px;border-radius:12px;border:none;background:#1a1526;color:white"></textarea>
        <button style="width:100%;padding:14px;border-radius:12px;background:#c89b3c;border:none;font-weight:800;cursor:pointer">
          Create & Write
        </button>
      </form>
    </div>
  `;

  document.getElementById("createStory").onsubmit = async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    const { data, error } = await supabase
      .from("stories")
      .insert({ title, description })
      .select()
      .single();

    if (error) {
      alert("Failed to create story");
      console.error(error);
      return;
    }

    window.location.href = `/?mode=write&story=${data.id}`;
  };

  return;
}

/* =====================
   WRITE MODE GUARD
===================== */
if (!STORY_ID) {
  document.body.innerHTML =
    "<h1 style='color:white;padding:40px'>No story selected</h1>";
  throw new Error("Missing story ID");
}

/* =====================
   APP LAYOUT
===================== */
document.getElementById("app").innerHTML = `
  <div id="sidebar">
    <h2>Chapters</h2>
    <div id="chapterList"></div>
    <button id="newChapter">+ New Chapter</button>
  </div>

  <div id="main">
    <div id="topbar">
      <input id="titleInput" placeholder="Chapter title…" />
      <button id="publish" class="primary">Publish</button>
      <button id="delete" class="secondary">Delete</button>
      <span id="saveStatus"></span>
    </div>

    <div id="meta">
      <span id="wordCount">0 words</span>
      <span id="charCount">0 chars</span>
      <span id="chapterStatus">Draft</span>
      <span id="lastSaved"></span>
    </div>

    <div id="toolbar">
      <button data-a="bold"><b>B</b></button>
      <button data-a="italic"><i>I</i></button>
      <button data-a="h1">H1</button>
      <button data-a="h2">H2</button>
      <button data-a="quote">❝</button>
      <button data-a="ul">•</button>
      <button data-a="ol">1.</button>
      <button data-a="undo">↺</button>
      <button data-a="redo">↻</button>
    </div>

    <div id="editor"></div>
  </div>
`;

/* =====================
   STATE
===================== */
let currentChapterId = null;
let saveTimer = null;

/* =====================
   EDITOR
===================== */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
});

/* =====================
   TOOLBAR
===================== */
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

/* =====================
   LOAD CHAPTERS
===================== */
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

  document.querySelectorAll(".chapter").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === id)
  );

  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("titleInput").value = data.title || "";
  document.getElementById("chapterStatus").textContent =
    data.status === "published" ? "Published" : "Draft";

  editor.commands.setContent(data.content || "<p></p>");
  updateCounts();
}

/* =====================
   NEW CHAPTER
===================== */
document.getElementById("newChapter").onclick = async () => {
  await supabase.from("chapters").insert({
    story_id: STORY_ID,
    title: "Untitled Chapter",
    content: "<p></p>",
    status: "draft",
  });

  loadChapters();
};

/* =====================
   AUTOSAVE
===================== */
async function save() {
  if (!currentChapterId) return;

  await supabase
    .from("chapters")
    .update({
      title: document.getElementById("titleInput").value,
      content: editor.getHTML(),
    })
    .eq("id", currentChapterId);

  document.getElementById("saveStatus").textContent = "Saved";
  document.getElementById("lastSaved").textContent =
    "Saved " + new Date().toLocaleTimeString();
}

editor.on("update", () => {
  document.getElementById("saveStatus").textContent = "Saving…";
  updateCounts();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 800);
});

document.getElementById("titleInput").oninput = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 800);
};

/* =====================
   PUBLISH / DELETE
===================== */
document.getElementById("publish").onclick = async () => {
  await supabase
    .from("chapters")
    .update({ status: "published" })
    .eq("id", currentChapterId);

  document.getElementById("chapterStatus").textContent = "Published";
};

document.getElementById("delete").onclick = async () => {
  if (!confirm("Delete chapter?")) return;

  await supabase.from("chapters").delete().eq("id", currentChapterId);
  currentChapterId = null;
  editor.commands.setContent("<p></p>");
  loadChapters();
};

/* =====================
   COUNTS
===================== */
function updateCounts() {
  const text = editor.getText();
  document.getElementById("wordCount").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("charCount").textContent = text.length + " chars";
}

/* =====================
   INIT
===================== */
loadChapters();
