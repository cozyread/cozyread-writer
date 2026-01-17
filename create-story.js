import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();

  const { data, error } = await supabase
    .from("stories")
    .insert({
      title,
      description,
    })
    .select()
    .single();

  if (error) {
    alert("Failed to create story");
    console.error(error);
    return;
  }

  // Redirect to writer with the new story ID
  window.location.href = `/?story=${data.id}`;
});
