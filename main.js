import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ===== ENV ===== */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ===== PARAMS ===== */
const params = new URLSearchParams(window.location.search);
const STORY_ID = params.get("story");

/* ======================================================
   IF NO STORY → CREATE STORY (NO MODES, NO GUARDS)
====================================================== */
if (!STORY_ID) {
  document.getElementById("app").innerHTML = `
    <div style="background:#1a1526;height:100vh;display:flex;align-items:center;justify-content:center">
      <form id="createStory" style="background:#221c33;padding:28px;border-radius:18px;width:380px">
        <h1 style="color:#c89b3c;text-align:center;margin-top:0">Create Story</h1>
        <input id="title" placeholder="Story title"
          style="width:100%;margin-bottom:12px;padding:12px;border-radius:12px;border:none;background:#1a1526;color:white"
          required />
        <textarea id="description" placeholder="Short description"
          style="width:100%;margin-bottom:12px;padding:12px;border-radius:12px;border:none;background:#1a1526;color:white"></textarea>
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
      return;
    }

    window.location.href = `/?story=${data.id}`;
  };

  // ⛔ STOP HERE — WRITER NEVER RUNS
  throw new Error("Create mode");
}

/* ======================================================
   WRITER (ONLY RUNS WHEN STORY EXISTS)
====================================================== */

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

/* ===== EDITOR ===== */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
});

/* ===== CHAPTERS ===== */
let currentChapterId = null;
let saveTimer = null;

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
    list.appendChild(el);
  });

  if (data.length) loadChapter(data[0].id);
}

async function loadChapter(id) {
  currentChapterId = id;
  const { data } = await supabase.from("chapters").select("*").eq("id", id).single();
  document.getElementById("titleInput").value = data.title || "";
  editor.commands.setContent(data.content || "<p></p>");
}

document.getElementById("newChapter").onclick = async () => {
  await supabase.from("chapters").insert({
    story_id: STORY_ID,
    title: "Untitled Chapter",
    content: "<p></p>",
  });
  loadChapters();
};

/* ===== AUTOSAVE ===== */
editor.on("update", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentChapterId) return;
    await supabase.from("chapters").update({
      title: document.getElementById("titleInput").value,
      content: editor.getHTML(),
    }).eq("id", currentChapterId);
  }, 800);
});

/* ===== INIT ===== */
loadChapters();
