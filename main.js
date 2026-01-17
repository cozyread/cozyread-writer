import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ========= SUPABASE ========= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========= PARAMS ========= */
const params = new URLSearchParams(window.location.search);
const STORY_ID = params.get("story");

const app = document.getElementById("app");

/* =====================================================
   CREATE STORY (DEFAULT WHEN NO STORY ID)
===================================================== */
if (!STORY_ID) {
  // FULL SCREEN RESET
  document.body.innerHTML = `
    <div style="
      background:#1a1526;
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:Inter,system-ui,sans-serif;
      color:#f4f1ff;
    ">
      <form id="createStory" style="
        background:#221c33;
        padding:32px;
        border-radius:20px;
        width:380px;
      ">
        <h1 style="color:#c89b3c;text-align:center;margin-top:0">
          Create Story
        </h1>

        <input id="title"
          placeholder="Story title"
          required
          style="
            width:100%;
            margin-bottom:12px;
            padding:12px;
            border-radius:12px;
            border:none;
            background:#1a1526;
            color:white;
          "
        />

        <textarea id="description"
          placeholder="Short description"
          style="
            width:100%;
            margin-bottom:16px;
            padding:12px;
            border-radius:12px;
            border:none;
            background:#1a1526;
            color:white;
            resize:vertical;
          "
        ></textarea>

        <button type="submit"
          style="
            width:100%;
            padding:14px;
            border-radius:12px;
            background:#c89b3c;
            border:none;
            font-weight:800;
            cursor:pointer;
            color:#1a1526;
          "
        >
          Create & Write
        </button>
      </form>
    </div>
  `;

  document.getElementById("createStory").addEventListener("submit", async (e) => {
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

    // 🔥 HARD REDIRECT (NO SPA SHENANIGANS)
    window.location.href = `/?story=${data.id}`;
  });

  // STOP EXECUTION COMPLETELY
  return;
}

/* =====================================================
   WRITER (ONLY RUNS WHEN STORY_ID EXISTS)
===================================================== */

app.innerHTML = `
  <div id="sidebar" style="
    width:280px;
    border-right:1px solid #2a2340;
    padding:16px;
    display:flex;
    flex-direction:column;
    gap:10px;
  ">
    <h2 style="color:#c89b3c;margin:0 0 8px">Chapters</h2>
    <div id="chapterList"></div>
    <button id="newChapter"
      style="
        margin-top:auto;
        padding:12px;
        border-radius:12px;
        background:#c89b3c;
        color:#1a1526;
        border:none;
        font-weight:800;
        cursor:pointer;
      "
    >
      + New Chapter
    </button>
  </div>

  <div id="main" style="
    flex:1;
    padding:16px;
    display:flex;
    flex-direction:column;
    gap:8px;
  ">
    <div id="topbar" style="display:flex;gap:8px;align-items:center">
      <input id="titleInput"
        placeholder="Chapter title…"
        style="
          flex:1;
          padding:10px;
          border-radius:12px;
          border:1px solid #2a2340;
          background:#221c33;
          color:white;
          font-size:18px;
        "
      />
      <button id="publish" style="
        background:#c89b3c;
        color:#1a1526;
        border:none;
        border-radius:12px;
        padding:10px 14px;
        font-weight:800;
        cursor:pointer;
      ">Publish</button>
    </div>

    <div id="meta" style="display:flex;gap:14px;font-size:13px;opacity:.85">
      <span id="wordCount">0 words</span>
      <span id="charCount">0 chars</span>
      <span id="lastSaved"></span>
    </div>

    <div id="editor"
      style="
        flex:1;
        border:1px solid #2a2340;
        border-radius:16px;
        background:#221c33;
        padding:18px;
        overflow-y:auto;
        line-height:1.8;
      "
    ></div>
  </div>
`;

/* ========= EDITOR ========= */
const editor = new Editor({
  element: document.getElementById("editor"),
  extensions: [StarterKit],
  autofocus: true,
});

/* ========= CHAPTERS ========= */
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
    el.textContent = c.title || "Untitled Chapter";
    el.style.padding = "10px";
    el.style.borderRadius = "10px";
    el.style.background = "#221c33";
    el.style.cursor = "pointer";
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

/* ========= AUTOSAVE ========= */
editor.on("update", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentChapterId) return;
    await supabase.from("chapters").update({
      title: document.getElementById("titleInput").value,
      content: editor.getHTML(),
    }).eq("id", currentChapterId);

    document.getElementById("lastSaved").textContent =
      "Saved " + new Date().toLocaleTimeString();
  }, 800);

  const text = editor.getText();
  document.getElementById("wordCount").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";
  document.getElementById("charCount").textContent =
    text.length + " chars";
});

/* ========= INIT ========= */
loadChapters();
