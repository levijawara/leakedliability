import { supabase } from "@/integrations/supabase/client";

let hasTracked = false;

export async function trackVisit() {
  if (typeof window === "undefined") return;
  if (hasTracked) return;
  
  hasTracked = true;

  try {
    await supabase.functions.invoke("track-visit", {
      body: {},
    });
  } catch (err) {
    console.debug("[analytics] Failed to track visit:", err);
  }
}
