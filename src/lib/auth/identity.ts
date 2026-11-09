import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/supabase/types";

export type { ProfileRole } from "@/lib/supabase/types";

export interface AuthIdentity {
  id: string;
  email: string;
  fullName: string;
  role: ProfileRole;
  avatarUrl: string | null;
  source: "supabase" | "demo";
}

const DEMO_AUTH_KEY = "balbaa-academy:demo-auth";
const AUTH_ROUTES = new Set(["/login", "/signup"]);

let cached: AuthIdentity | null | undefined;
let inflight: Promise<AuthIdentity | null> | null = null;

export function isAuthRoute(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return AUTH_ROUTES.has(clean);
}

export function peekIdentity(): AuthIdentity | null | undefined {
  return cached;
}

export function setCachedIdentity(identity: AuthIdentity | null): void {
  cached = identity;
}

export function demoIdentity(role: ProfileRole): AuthIdentity {
  return role === "admin"
    ? {
        id: "demo-admin",
        email: "admin@balbaa.local",
        fullName: "د. كريم النجعاوي",
        role: "admin",
        avatarUrl: null,
        source: "demo",
      }
    : {
        id: "demo-student",
        email: "student@balbaa.local",
        fullName: "أحمد محمود",
        role: "student",
        avatarUrl: null,
        source: "demo",
      };
}

export function readDemoIdentity(): AuthIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthIdentity>;
    if (parsed.role !== "admin" && parsed.role !== "student") return null;
    if (typeof parsed.id !== "string") return null;
    return {
      id: parsed.id,
      email: typeof parsed.email === "string" ? parsed.email : "",
      fullName:
        typeof parsed.fullName === "string" && parsed.fullName ? parsed.fullName : "مستخدم تجريبي",
      role: parsed.role,
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      source: "demo",
    };
  } catch {
    return null;
  }
}

export function persistDemoIdentity(identity: AuthIdentity): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(identity));
}

export function clearDemoIdentity(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_AUTH_KEY);
}

export async function identityFromSession(session: Session): Promise<AuthIdentity> {
  const user = session.user;
  const email = user.email ?? "";
  const metadataName =
    typeof user.user_metadata["full_name"] === "string"
      ? user.user_metadata["full_name"].trim()
      : "";

  let profile: { full_name: string | null; role: ProfileRole; avatar_url: string | null } | null =
    null;
  if (supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(`تعذر تحميل بيانات الملف الشخصي: ${error.message}`);
    profile = data;
  }

  return {
    id: user.id,
    email,
    fullName:
      profile?.full_name?.trim() || metadataName || email.split("@")[0] || "مستخدم الأكاديمية",
    role: profile?.role === "admin" ? "admin" : "student",
    avatarUrl: profile?.avatar_url ?? null,
    source: "supabase",
  };
}

/**
 * Resolves the current identity once and caches it for router guards.
 * In demo mode (no Supabase env vars) it reads the locally selected demo account.
 */
export async function resolveIdentity(force = false): Promise<AuthIdentity | null> {
  if (!force && cached !== undefined) return cached;

  if (!isSupabaseConfigured || !supabase) {
    cached = readDemoIdentity();
    return cached;
  }

  if (typeof window === "undefined") return null;

  if (!inflight) {
    inflight = (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        cached = null;
        return null;
      }
      const identity = await identityFromSession(data.session);
      cached = identity;
      return identity;
    })()
      .catch((error: unknown) => {
        console.error("Could not resolve the authenticated profile", error);
        cached = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
