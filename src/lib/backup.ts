import type { AcademyData } from "@/lib/types";

const REQUIRED: Array<keyof AcademyData> = ["settings", "bags", "lectures", "kpis", "trainees", "sessions", "activities", "users"];

export function validateBackup(raw: unknown): { ok: true; data: AcademyData } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "الملف غير صالح: ليس نسخة احتياطية للأكاديمية." };
  const obj = raw as Record<string, unknown>;
  if (obj["version"] !== 1) return { ok: false, error: "إصدار النسخة الاحتياطية غير مدعوم." };
  for (const k of REQUIRED) {
    if (!(k in obj)) return { ok: false, error: "الملف ناقص: بعض أقسام البيانات غير موجودة." };
  }
  if (!Array.isArray(obj["bags"]) || !Array.isArray(obj["lectures"])) return { ok: false, error: "الملف تالف: قوائم الحقائب أو المحاضرات غير صحيحة." };
  const bagIds = new Set((obj["bags"] as Array<{ id: string }>).map((b) => b.id));
  const orphan = (obj["lectures"] as Array<{ bagId: string }>).some((l) => !bagIds.has(l.bagId));
  if (orphan) return { ok: false, error: "الملف غير متسق: توجد محاضرات تابعة لحقائب غير موجودة." };
  return { ok: true, data: obj as unknown as AcademyData };
}

export function backupFileName(d = new Date()) {
  return `balbaa-academy-backup-${d.toISOString().slice(0, 10)}.json`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
