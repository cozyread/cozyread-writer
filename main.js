import { createClient } from "@supabase/supabase-js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/* ===== SUPABASE ===== */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ===== PARAMS ===== */
const params = new URLSearchParams(window.location.search);
const STORY_ID = params.get("story");

/* =====================================================
   CREATE STORY (DEFAULT)
===================================================== */
if (!STORY_ID) {
  // FULL RESET — no layout, no flex leftovers
  document.documentElement.innerHTML = `
    <head>
      <title>Create Story</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="
      margin:0;
      background:#1a1526;
      color:#f4f1ff;
      font-family:Inter,system-ui,sans-serif;
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
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

        <p id="error" style="color:#ff6b6b;margin-top:12px"></p>
      </form>
    </body>
  `;

  document
    .getElementById("createStory")
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
        console.error("Supabase error:", error);
        document.getElementById("error").textContent = error.message;
        return;
      }

      window.location.href = `/?story=${data.id}`;
    });

  return;
}

/* =====================================================
   WRITER (UNCHANGED, ONLY RUNS WITH STORY_ID)
===================================================== */

// your existing writer code continues here
// (editor, chapters, autosave, etc.)
