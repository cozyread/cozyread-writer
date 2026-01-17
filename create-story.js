import { createClient } from "@supabase/supabase-js";

/* ================= SUPABASE ================= */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ================= FORM ================= */
const form = document.getElementById("createStoryForm");

if (!form) {
  console.error("Create Story form not found");
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("title");
    const descInput = document.getElementById("description");

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title) {
      alert("Story title is required");
      return;
    }

    const { data, error } = await supabase
      .from("stories")
      .insert({
        title,
        description,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    // ✅ HARD REDIRECT TO WRITER
    window.location.href = `index.html?story=${data.id}`;
  });
}
