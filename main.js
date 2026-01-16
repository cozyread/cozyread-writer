import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */
const SUPABASE_URL = "https://qgrtlgcpiziewtpxnrrj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFncnRsZ2NwaXppZXd0cHhucnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODQ2NzksImV4cCI6MjA4MzQ2MDY3OX0.4mipYAshTcI4f0-DlpeX83_QY38L5BoRqf12Lhuq1Cc";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ================= PARAMS ================= */
const STORY_ID = new URLSearchParams(window.location.search).get("story");

/* ================= STATE ================= */
let editor;
let currentChapterId = null;
let saveTimer = null;
let dirty = false;

/* ================= WARN ON LEAVE ================= */
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ================= MAIN ================= */
window.addEventListener("DOMContentLoaded", async () => {
  const editorEl = document.getElementById("editor");
  const statusEl = document.getElementById("status");

  /* ---- CREATE EDITOR ONCE ---- */
  editor = new Editor({
    element: editorEl,
    extensions: [StarterKit],
    content: "<p>Start writing…</p>",
    autofocus: true,
    editable: true,
  });

  /* ---- TOOLBAR (FIXED) ---- */
  document.getElementById("toolbar").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.a;
    const chain = editor.chain().focus();

    if (action === "bold") chain.toggleBold().run();
    if (action === "italic") chain.toggleItalic().run();
    if (action === "h1") chain.toggleHeading({ level: 1 }).run();
    if (action === "h2") chain.toggleHeading({ level: 2 }).run();
    if (action === "quote") chain.toggleBlockquote().run();
    if (action === "ul") chain.toggleBulletList().run();
    if (action === "ol") chain.toggleOrderedList().run();
    if (action === "undo") editor.commands.undo();
    if (action === "redo") editor.commands.redo();
  });

  /* ---- LOAD CHAPTERS ---- */
  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", STORY_ID)
    .order("created_at");

  const list = document.getElementById("chapterList");
  list.innerHTML = "";

  chapters?.forEach((ch) => {
    const el = document.createElement("div");
    el.className = "chapter";
    el.textContent = ch.title || "Untitled Chapter";
    el.onclick = () => loadChapter(ch.id);
    list.appendChild(el);
  });

  if (chapters?.length) {
    loadChapter(chapters[0].id);
  }

  /* ---- NEW CHAPTER ---- */
  document.getElementById("newChapter").onclick = async () => {
    await supabase.from("chapters").insert({
      story_id: STORY_ID,
      title: "Untitled Chapter",
      content: "",
      status: "draft",
    });
    location.reload();
  };

  /* ---- PUBLISH ---- */
  document.getElementById("publish").onclick = async () => {
    if (!currentChapterId) return;
    await supabase
      .from("chapters")
      .update({ status: "published" })
      .eq("id", currentChapterId);

    document.getElementById("chapterStatus").textContent = "Published";
  };

  /* ---- DELETE ---- */
  document.getElementById("delete").onclick = async () => {
    if (!confirm("Delete this chapter?")) return;
    await supabase.from("chapters").delete().eq("id", currentChapterId);
    location.reload();
  };

  /* ---- FOCUS MODE ---- */
  document.getElementById("focusToggle").onclick = () => {
    document.body.classList.toggle("focus");
  };

  /* ---- AUTOSAVE + COUNTS (FIXED) ---- */
  editor.on("update", () => {
    dirty = true;
    updateCounts();
    statusEl.textContent = "Saving…";

    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 800);
  });

  document.getElementById("titleInput").oninput = () => {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 800);
  };
});

/* ================= LOAD CHAPTER ================= */
async function loadChapter(id) {
  currentChapterId = id;

  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  document.getElementById("titleInput").value = data.title || "";
  document.getElementById("chapterStatus").textContent =
    data.status === "published" ? "Published" : "Draft";

  editor.commands.setContent(data.content || "<p></p>");
  editor.commands.focus("end");

  dirty = false;
  updateCounts();
}

/* ================= SAVE ================= */
async function save() {
  if (!currentChapterId) return;

  await supabase.from("chapters").update({
    title: document.getElementById("titleInput").value,
    content: editor.getHTML(),
  }).eq("id", currentChapterId);

  dirty = false;
  document.getElementById("status").textContent = "Saved";
  document.getElementById("lastSaved").textContent =
    "Saved " + new Date().toLocaleTimeString();
}

/* ================= COUNTS ================= */
function updateCounts() {
  const text = editor.getText();

  document.getElementById("wordCount").textContent =
    text.trim().split(/\s+/).filter(Boolean).length + " words";

  document.getElementById("charCount").textContent =
    text.length + " characters";
}
