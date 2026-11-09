import { redirect } from "@tanstack/react-router";

import { resolveIdentity, type AuthIdentity } from "./identity";

/**
 * Route-level RBAC helper. Use in `beforeLoad` for admin-only pages.
 * The UI checks in permissions.ts stay as a second layer; RLS is the real
 * server-side security boundary.
 */
export async function requireIdentity(redirectTo: string): Promise<AuthIdentity | null> {
  // Session storage is browser-only. The client resolves the real session right
  // after hydration; redirecting during SSR would break deep links.
  if (typeof window === "undefined") return null;

  const identity = await resolveIdentity();
  if (!identity) throw redirect({ to: "/login", search: { redirect: redirectTo } });
  return identity;
}

export async function requireAdminIdentity(redirectTo: string): Promise<AuthIdentity | null> {
  const identity = await requireIdentity(redirectTo);
  if (!identity) return null;
  if (identity.role !== "admin") throw redirect({ to: "/" });
  return identity;
}
