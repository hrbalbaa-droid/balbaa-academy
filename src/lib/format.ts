import practice from "@/assets/bag_practice.jpg";
import sales from "@/assets/bag_sales.jpg";
import cosmo from "@/assets/bag_cosmo.jpg";
import pos from "@/assets/bag_pos.jpg";
import area from "@/assets/bag_area.jpg";
import type { LectureStatus, ReviewStatus } from "@/lib/types";

export const COVER_PRESETS: Record<string, { label: string; src: string }> = {
  "preset:practice": { label: "ممارسة صيدلية", src: practice },
  "preset:sales": { label: "مبيعات", src: sales },
  "preset:cosmo": { label: "كوزمو", src: cosmo },
  "preset:pos": { label: "إدارة الفرع", src: pos },
  "preset:area": { label: "قيادة المناطق", src: area },
};

export const coverSrc = (cover: string) => COVER_PRESETS[cover]?.src ?? cover ?? practice;

export const STATUS_LABEL: Record<LectureStatus, string> = { draft: "مسودة", published: "منشورة", archived: "مؤرشفة" };
export const REVIEW_LABEL: Record<ReviewStatus, string> = { not_required: "لا تحتاج مراجعة طبية", pending: "بانتظار المراجعة الطبية", approved: "معتمدة طبياً" };

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fmtDuration = (min: number) => (min >= 60 ? `${+(min / 60).toFixed(1)} ساعة` : `${min} دقيقة`);

export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export const MAX_UPLOAD = 1.5 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function kindFromName(name: string): "pdf" | "ppt" | "image" | "video" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "webm"].includes(ext)) return "video";
  return "other";
}
