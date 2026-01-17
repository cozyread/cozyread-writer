import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* CREATE STORY PAGE */
const form = document.getElementById("form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;

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
}
