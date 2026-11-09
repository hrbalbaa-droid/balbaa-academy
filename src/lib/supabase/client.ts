import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Supabase browser client.
 *
 * The app is fully usable as a local prototype when these variables are absent.
 * Add both values to `.env` (see `.env.example`) to switch authentication and
 * data access to Supabase. Vite only exposes variables prefixed with `VITE_`.
 */
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
// Supabase now exposes either a legacy "anon" key or a newer "publishable" key.
// Both are safe for the browser client; accept either variable name.
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Sessions stay in the browser. The router guard is client-side; server
        // functions/RLS remain the real security boundary.
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
        storageKey: "balbaa-academy-auth",
      },
    })
  : null;

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase غير مُهيأ. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY إلى ملف .env ثم أعد تشغيل الخادم.",
    );
  }
  return supabase;
}

export const COURSE_BUCKET = (
  import.meta.env.VITE_SUPABASE_COURSE_BUCKET ?? "course-videos"
).trim();

/** 50 MB — the limit requested for hosted course videos. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** 5 MB — thumbnails only. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function safeStorageFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(-120) || "file"
  );
}
