import { peekIdentity } from "@/lib/auth/identity";
import type {
  AcademyData,
  Attachment,
  Bag,
  ContentSection,
  Lecture,
  LectureStatus,
  Level,
  QuizQuestion,
  ReviewStatus,
} from "@/lib/types";
import { isUuid } from "@/lib/uuid";
import { requireSupabase } from "@/lib/supabase/client";
import { createCourseSignedUrls, isCourseStoragePath } from "@/lib/supabase/storage";
import type { Course, Json, Lesson as LessonRow, TablesInsert } from "@/lib/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";
import { localProvider } from "./local-provider";
import type { DataProvider } from "./provider";
import { createSeedData } from "./seed";

type JsonRecord = { [key: string]: Json | undefined };
type PublicLessonRow = Pick<
  LessonRow,
  "id" | "course_id" | "title" | "duration" | "order_index" | "created_at"
>;
type CatalogCourseRow = Pick<
  Course,
  "id" | "title" | "description" | "thumbnail_url" | "created_at" | "metadata"
>;

function asRecord(value: Json | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readText(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readNumber(value: Json | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: Json | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readStringArray(value: Json | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readLevels(value: Json | undefined, courseId: string): Level[] {
  if (Array.isArray(value)) {
    const levels = value.flatMap((item, index) => {
      const record = asRecord(item);
      const name = readText(record["name"]);
      if (!name) return [];
      const id = readText(record["id"], `${courseId}-l${index + 1}`);
      return [{ id, name }];
    });
    if (levels.length > 0) return levels;
  }
  return [{ id: `${courseId}-l1`, name: "المستوى الأول" }];
}

function readSections(value: Json | undefined): ContentSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const heading = readText(record["heading"]);
    const body = readText(record["body"]);
    if (!heading && !body) return [];
    return [{ id: readText(record["id"], `section-${index + 1}`), heading, body }];
  });
}

const ATTACHMENT_KINDS = new Set<Attachment["kind"]>([
  "pdf",
  "ppt",
  "image",
  "video",
  "link",
  "other",
]);

function readAttachments(value: Json | undefined): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    const url = readText(record["url"]);
    if (!url) return [];
    const rawKind = readText(record["kind"], "other");
    const kind = ATTACHMENT_KINDS.has(rawKind as Attachment["kind"])
      ? (rawKind as Attachment["kind"])
      : "other";
    const size = typeof record["size"] === "number" ? record["size"] : undefined;
    return [
      {
        id: readText(record["id"], `attachment-${index + 1}`),
        name: readText(record["name"], url),
        kind,
        url,
        ...(size !== undefined ? { size } : {}),
      },
    ];
  });
}

function readQuiz(value: Json | undefined): Lecture["quiz"] {
  const record = asRecord(value);
  const rawQuestions = record["questions"];
  if (!Array.isArray(rawQuestions)) return null;

  const questions: QuizQuestion[] = rawQuestions.flatMap((item, index) => {
    const question = asRecord(item);
    const text = readText(question["text"]);
    const options = readStringArray(question["options"]);
    if (!text || options.length === 0) return [];
    return [
      {
        id: readText(question["id"], `question-${index + 1}`),
        type: question["type"] === "tf" ? "tf" : "mcq",
        text,
        options,
        correct: Math.max(0, Math.round(readNumber(question["correct"], 0))),
      },
    ];
  });

  if (questions.length === 0) return null;
  return { passScore: Math.max(0, Math.round(readNumber(record["passScore"], 70))), questions };
}

function readStatus(value: Json | undefined): LectureStatus {
  return value === "draft" || value === "archived" ? value : "published";
}

function readReview(value: Json | undefined): ReviewStatus {
  return value === "pending" || value === "approved" ? value : "not_required";
}

function mapCourse(
  row: CatalogCourseRow,
  index: number,
  signedUrls: Record<string, string>,
): Bag {
  const meta = asRecord(row.metadata);
  const thumbnail = row.thumbnail_url;
  const cover = thumbnail
    ? isCourseStoragePath(thumbnail)
      ? (signedUrls[thumbnail] ?? "preset:practice")
      : thumbnail
    : readText(meta["cover"], "preset:practice");

  return {
    id: row.id,
    number: Math.max(1, Math.round(readNumber(meta["number"], index + 1))),
    title: row.title,
    description: row.description,
    audience: readText(meta["audience"]),
    objectives: readStringArray(meta["objectives"]),
    levels: readLevels(meta["levels"], row.id),
    cover,
    ...(thumbnail && isCourseStoragePath(thumbnail) ? { thumbnailPath: thumbnail } : {}),
    medical: readBoolean(meta["medical"]),
    suggestedHours: readText(meta["suggestedHours"]),
    priority: meta["priority"] === "second" ? "second" : "first",
    kpis: readStringArray(meta["kpis"]),
    createdAt: row.created_at,
  };
}

function mapLesson(
  row: LessonRow,
  course: Bag | undefined,
  signedUrls: Record<string, string>,
): Lecture {
  const meta = asRecord(row.metadata);
  const requestedLevel = readText(meta["levelId"]);
  const levelId =
    requestedLevel && course?.levels.some((level) => level.id === requestedLevel)
      ? requestedLevel
      : (course?.levels[0]?.id ?? `${row.course_id}-l1`);

  const storagePath =
    row.video_url && isCourseStoragePath(row.video_url) ? row.video_url : undefined;
  const videoUrl = row.video_url
    ? storagePath
      ? (signedUrls[storagePath] ?? "")
      : row.video_url
    : "";

  return {
    id: row.id,
    bagId: row.course_id,
    levelId,
    order: row.order_index,
    title: row.title,
    description: readText(meta["description"]),
    objectives: readStringArray(meta["objectives"]),
    audience: readText(meta["audience"], course?.audience ?? ""),
    durationMin: row.duration,
    trainer: readText(meta["trainer"]),
    sections: readSections(meta["sections"]),
    caseStudy: readText(meta["caseStudy"]),
    videoUrl,
    ...(storagePath ? { videoPath: storagePath } : {}),
    attachments: readAttachments(meta["attachments"]),
    references: readStringArray(meta["references"]),
    status: readStatus(meta["status"]),
    review: readReview(meta["review"]),
    reviewer: readText(meta["reviewer"]),
    quiz: readQuiz(meta["quiz"]),
    createdAt: row.created_at,
    updatedAt: readText(meta["updatedAt"], row.created_at),
  };
}

function mapPublicLesson(row: PublicLessonRow, course: Bag | undefined): Lecture {
  return {
    id: row.id,
    bagId: row.course_id,
    levelId: course?.levels[0]?.id ?? `${row.course_id}-l1`,
    order: row.order_index,
    title: row.title,
    description: "",
    objectives: [],
    audience: course?.audience ?? "",
    durationMin: row.duration,
    trainer: "",
    sections: [],
    caseStudy: "",
    videoUrl: "",
    attachments: [],
    references: [],
    status: "published",
    review: "not_required",
    reviewer: "",
    quiz: null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

function courseMetadata(bag: Bag): Json {
  const {
    id: _id,
    title: _title,
    description: _description,
    thumbnailPath: _thumbnailPath,
    createdAt: _createdAt,
    cover,
    ...rest
  } = bag;
  const storedCover = cover.startsWith("preset:") || cover.startsWith("data:") ? cover : null;
  return { ...rest, cover: storedCover } as unknown as Json;
}

function lessonMetadata(lecture: Lecture): Json {
  const {
    id: _id,
    bagId: _bagId,
    order: _order,
    title: _title,
    durationMin: _durationMin,
    videoUrl: _videoUrl,
    videoPath: _videoPath,
    createdAt: _createdAt,
    ...rest
  } = lecture;
  return rest as unknown as Json;
}

function hostedError(error: PostgrestError, action: string): Error {
  if (error.code === "42703") {
    return new Error("قاعدة البيانات تحتاج تشغيل الترحيل 0003_private_course_assets.sql أولاً.");
  }
  return new Error(`${action}: ${error.message}`);
}

function assertHostedIds(data: AcademyData) {
  if (data.bags.some((bag) => !isUuid(bag.id))) {
    throw new Error("تعذر الحفظ: توجد حقائب بمعرّفات محلية قديمة غير متوافقة مع Supabase.");
  }
  const bagIds = new Set(data.bags.map((bag) => bag.id));
  if (data.lectures.some((lecture) => !isUuid(lecture.id) || !bagIds.has(lecture.bagId))) {
    throw new Error("تعذر الحفظ: توجد محاضرات بمعرّفات محلية قديمة أو مرتبطة بحقيبة غير موجودة.");
  }
}

async function syncCatalog(data: AcademyData): Promise<void> {
  const client = requireSupabase();
  const identity = peekIdentity();
  if (!identity) throw new Error("يلزم تسجيل الدخول لحفظ التغييرات.");
  assertHostedIds(data);

  const [coursesResult, lessonsResult] = await Promise.all([
    client.from("courses").select("id, created_by"),
    client.from("lessons").select("id"),
  ]);
  if (coursesResult.error) throw hostedError(coursesResult.error, "تعذر قراءة الحقائب");
  if (lessonsResult.error) throw hostedError(lessonsResult.error, "تعذر قراءة المحاضرات");

  const existingCourses = coursesResult.data ?? [];
  const existingLessons = lessonsResult.data ?? [];
  const ownerById = new Map(existingCourses.map((course) => [course.id, course.created_by]));

  const courseRows: TablesInsert<"courses">[] = data.bags.map((bag) => ({
    id: bag.id,
    title: bag.title.trim() || "دورة بدون عنوان",
    description: bag.description,
    thumbnail_url: bag.thumbnailPath ?? null,
    created_by: ownerById.get(bag.id) ?? identity.id,
    created_at: bag.createdAt,
    metadata: courseMetadata(bag),
  }));

  // Updating an existing course must not go through the INSERT policy with
  // another admin's created_by value. Use a real update for known rows and an
  // insert for new rows so ownership is preserved without tripping RLS.
  const courseUpdates = courseRows.filter((course) => ownerById.has(course.id as string));
  const courseInserts = courseRows.filter((course) => !ownerById.has(course.id as string));

  for (const course of courseUpdates) {
    const id = course.id as string;
    const { error } = await client.from("courses").update(course).eq("id", id);
    if (error) throw hostedError(error, "تعذر حفظ الحقائب");
  }
  if (courseInserts.length > 0) {
    const { error } = await client.from("courses").insert(courseInserts);
    if (error) throw hostedError(error, "تعذر حفظ الحقائب");
  }

  const desiredCourseIds = new Set(courseRows.map((course) => course.id));
  const courseIdsToDelete = existingCourses
    .map((course) => course.id)
    .filter((id) => !desiredCourseIds.has(id));
  if (courseIdsToDelete.length > 0) {
    const { error } = await client.from("courses").delete().in("id", courseIdsToDelete);
    if (error) throw hostedError(error, "تعذر حذف الحقائب");
  }

  const lessonRows: TablesInsert<"lessons">[] = data.lectures
    .filter((lecture) => desiredCourseIds.has(lecture.bagId))
    .map((lecture) => ({
      id: lecture.id,
      course_id: lecture.bagId,
      title: lecture.title.trim() || "درس بدون عنوان",
      video_url:
        lecture.videoPath ??
        (lecture.videoUrl && !lecture.videoUrl.startsWith("data:") ? lecture.videoUrl : null),
      duration: Math.max(0, Math.round(lecture.durationMin)),
      order_index: Math.max(0, lecture.order),
      created_at: lecture.createdAt,
      metadata: lessonMetadata(lecture),
    }));

  if (lessonRows.length > 0) {
    const { error } = await client.from("lessons").upsert(lessonRows);
    if (error) throw hostedError(error, "تعذر حفظ المحاضرات");
  }

  const desiredLessonIds = new Set(lessonRows.map((lesson) => lesson.id));
  const lessonIdsToDelete = existingLessons
    .map((lesson) => lesson.id)
    .filter((id) => !desiredLessonIds.has(id));
  if (lessonIdsToDelete.length > 0) {
    const { error } = await client.from("lessons").delete().in("id", lessonIdsToDelete);
    if (error) throw hostedError(error, "تعذر حذف المحاضرات");
  }
}

export const onlineProvider: DataProvider = {
  name: "online",
  async load() {
    const client = requireSupabase();
    const identity = peekIdentity();

    const [coursesResult, localBase] = await Promise.all([
      client
        .from("courses")
        .select("id,title,description,thumbnail_url,created_at,metadata")
        .order("created_at", { ascending: true }),
      localProvider.load().catch(() => null),
    ]);

    if (coursesResult.error) throw hostedError(coursesResult.error, "تعذر تحميل الحقائب");
    const courseRows = coursesResult.data ?? [];

    let lectures: Lecture[];
    if (identity) {
      const { data: lessonRows, error } = await client
        .from("lessons")
        .select("id,course_id,title,video_url,duration,order_index,created_at,metadata")
        .order("order_index", { ascending: true });
      if (error) throw hostedError(error, "تعذر تحميل المحاضرات");
      const lessonAssetPaths =
        lessonRows?.map((lesson) => lesson.video_url).filter(isCourseStoragePath) ?? [];
      const signedUrls = await signCatalogAssets(courseRows, lessonAssetPaths);
      const bags = courseRows.map((row, index) => mapCourse(row, index, signedUrls));
      const bagById = new Map(bags.map((bag) => [bag.id, bag]));
      lectures = (lessonRows ?? []).map((row) =>
        mapLesson(row, bagById.get(row.course_id), signedUrls),
      );
      return buildCatalogData(localBase, bags, lectures);
    }

    const bags = courseRows.map((row, index) => mapCourse(row, index, {}));
    const bagById = new Map(bags.map((bag) => [bag.id, bag]));
    const { data: publicLessonRows, error } = await client
      .from("lessons")
      .select("id,course_id,title,duration,order_index,created_at")
      .order("order_index", { ascending: true });
    if (error) throw hostedError(error, "تعذر تحميل المحاضرات");
    lectures = (publicLessonRows ?? []).map((row) =>
      mapPublicLesson(row, bagById.get(row.course_id)),
    );
    return buildCatalogData(localBase, bags, lectures);
  },
  async save(data) {
    await syncCatalog(data);
    try {
      await localProvider.save(data);
    } catch (error) {
      // The hosted copy is the source of truth; a full localStorage quota must
      // not turn a successful database save into a failed UI action.
      console.warn("Could not cache academy data locally", error);
    }
  },
  async reset() {
    // Remote catalog rows are intentionally never deleted by "reset demo".
    await localProvider.reset();
  },
};

async function signCatalogAssets(
  courses: CatalogCourseRow[],
  lessonAssetPaths: string[],
): Promise<Record<string, string>> {
  const assetPaths = [
    ...new Set([
      ...courses.map((course) => course.thumbnail_url).filter(isCourseStoragePath),
      ...lessonAssetPaths,
    ]),
  ];
  if (assetPaths.length === 0) return {};
  try {
    return await createCourseSignedUrls(assetPaths);
  } catch (error) {
    // A missing storage policy should not hide the catalog. Playback links
    // stay empty until the signed URL can be generated.
    console.warn("Could not sign course assets", error);
    return {};
  }
}

function buildCatalogData(
  localBase: Awaited<ReturnType<typeof localProvider.load>>,
  bags: Bag[],
  lectures: Lecture[],
): AcademyData {
  const base = localBase ?? createSeedData();
  return {
    ...base,
    bags,
    lectures,
    // Trainee/session tables are not part of the hosted schema yet. Do not
    // show prototype rows that point at local-only course ids.
    trainees: [],
    sessions: [],
    activities: localBase ? base.activities : [],
  };
}
