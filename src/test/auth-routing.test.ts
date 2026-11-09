import { describe, expect, it } from "vitest";

import { demoIdentity, isAuthRoute } from "@/lib/auth/identity";
import { friendlyAuthError, safeRedirectPath } from "@/lib/auth/redirect";

describe("Auth routing helpers", () => {
  it("marks only login and signup as public auth routes", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/signup/")).toBe(true);
    expect(isAuthRoute("/")).toBe(false);
    expect(isAuthRoute("/settings")).toBe(false);
  });

  it("only allows internal redirect paths", () => {
    expect(safeRedirectPath("/bags")).toBe("/bags");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
  });

  it("maps Supabase roles to demo identities", () => {
    expect(demoIdentity("admin").role).toBe("admin");
    expect(demoIdentity("student").role).toBe("student");
  });

  it("translates common Supabase auth errors", () => {
    expect(friendlyAuthError("Invalid login credentials")).toContain("البريد الإلكتروني");
    expect(friendlyAuthError("Email not confirmed")).toContain("تأكيد البريد");
  });
});
