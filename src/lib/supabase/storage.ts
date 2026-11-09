import {
  COURSE_BUCKET,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  requireSupabase,
  safeStorageFileName,
} from "./client";

export interface UploadedAsset {
  path: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
}

/**
 * Signed URLs are short-lived by design. Six hours covers a long training
 * session without creating a permanently public link to the video.
 */
export const DEFAULT_SIGNED_URL_TTL = 60 * 60 * 6;

function assertSize(file: File, max: number, label: string) {
  if (file.size > max) {
    throw new Error(`${label} أكبر من الحد المسموح (${Math.round(max / 1024 / 1024)} ميجابايت).`);
  }
}

function assertType(file: File, mimeTypes: string[], extensions: RegExp, label: string) {
  if (!mimeTypes.includes(file.type) && !extensions.test(file.name)) {
    throw new Error(`${label} غير مدعوم. الأنواع المسموحة: ${mimeTypes.join("، ")}`);
  }
}

const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;

function buildPath(courseId: string, folder: "videos" | "thumbnails", name: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${courseId}/${folder}/${unique}-${safeStorageFileName(name)}`;
}

/**
 * Storage paths are stored in the database (`lessons.video_url`,
 * `courses.thumbnail_url`). External links, data URLs, and preset keys are not
 * storage paths and must not be sent to the signing API.
 */
export function isCourseStoragePath(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/^(https?:|data:|blob:|preset:)/i.test(value.trim());
}

/** Creates a signed URL for one private course asset. */
export async function createCourseSignedUrl(
  path: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL,
): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.storage.from(COURSE_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    console.error("Could not create a signed course asset URL", error);
    throw new Error("تعذر إنشاء رابط مؤقت للملف. تحقق من سياسات التخزين.");
  }
  return data.signedUrl;
}

/** Batch-signs private course assets (videos and thumbnails). */
export async function createCourseSignedUrls(
  paths: string[],
  expiresIn = DEFAULT_SIGNED_URL_TTL,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(isCourseStoragePath))];
  if (unique.length === 0) return {};

  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(COURSE_BUCKET)
    .createSignedUrls(unique, expiresIn);
  if (error) throw new Error(`تعذر إنشاء روابط مؤقتة للملفات: ${error.message}`);

  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

async function upload(
  courseId: string,
  folder: "videos" | "thumbnails",
  file: File,
): Promise<UploadedAsset> {
  const client = requireSupabase();
  const path = buildPath(courseId, folder, file.name);
  const { error } = await client.storage.from(COURSE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(`تعذر رفع الملف: ${error.message}`);

  // The bucket is private; previews use a temporary signed URL. The durable
  // value to save in the database is `path`, not this URL.
  const url = await createCourseSignedUrl(path);
  return {
    path,
    url,
    name: file.name,
    size: file.size,
    contentType: file.type,
  };
}

/** Uploads a hosted lesson video (max 50 MB) to `course-videos/{courseId}/videos`. */
export async function uploadCourseVideo(courseId: string, file: File): Promise<UploadedAsset> {
  assertSize(file, MAX_VIDEO_BYTES, "ملف الفيديو");
  assertType(file, VIDEO_MIME_TYPES, VIDEO_EXTENSIONS, "ملف الفيديو");
  return upload(courseId, "videos", file);
}

/** Uploads a course thumbnail (max 5 MB) to `course-videos/{courseId}/thumbnails`. */
export async function uploadCourseThumbnail(courseId: string, file: File): Promise<UploadedAsset> {
  assertSize(file, MAX_IMAGE_BYTES, "صورة الغلاف");
  assertType(file, IMAGE_MIME_TYPES, IMAGE_EXTENSIONS, "صورة الغلاف");
  return upload(courseId, "thumbnails", file);
}

export async function removeCourseAsset(path: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.storage.from(COURSE_BUCKET).remove([path]);
  if (error) throw new Error(`تعذر حذف الملف: ${error.message}`);
}
