import type { Bag, DemoUser, Role } from "@/lib/types";

// Stage 1: checked in the interface only (demonstration). Stage 2 must enforce
// the same rules on the server; hiding UI is not a security boundary.
export type Action = "manage_bags" | "manage_lectures" | "approve_medical" | "manage_settings" | "view_brand_area" | "edit_kpis";

const MATRIX: Record<Role, Action[]> = {
  admin: ["manage_bags", "manage_lectures", "approve_medical", "manage_settings", "view_brand_area", "edit_kpis"],
  trainer: ["manage_lectures"],
  trainee: [],
};

export const can = (user: DemoUser, action: Action) => MATRIX[user.role].includes(action);

export const canEditBag = (user: DemoUser, bagId: string) =>
  user.role === "admin" || (user.role === "trainer" && user.bagIds.includes(bagId));

export const visibleBags = (user: DemoUser, bags: Bag[]) =>
  user.role === "admin" ? bags : bags.filter((b) => user.bagIds.includes(b.id));

export const ROLE_LABEL: Record<Role, string> = { admin: "مدير النظام", trainer: "مدرب", trainee: "متدرب" };

export const ACTION_LABEL: Record<Action, string> = {
  manage_bags: "إدارة الحقائب التدريبية",
  manage_lectures: "إضافة وتعديل المحاضرات",
  approve_medical: "الاعتماد الطبي للمحتوى",
  manage_settings: "إدارة الإعدادات والنسخ الاحتياطي",
  view_brand_area: "منطقة الهوية الخاصة بالإدارة",
  edit_kpis: "تعديل تعريفات المؤشرات",
};
export const ALL_ACTIONS = Object.keys(ACTION_LABEL) as Action[];
