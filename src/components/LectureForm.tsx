import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileText, Link2, Loader2, Plus, Trash2, Upload, ShieldCheck } from "lucide-react";
import { useData, uid } from "@/lib/store";
import { can, canEditBag } from "@/lib/permissions";
import type { Attachment, Lecture } from "@/lib/types";
import { MAX_UPLOAD, kindFromName, readFileAsDataUrl } from "@/lib/format";
import { isSupabaseConfigured, MAX_VIDEO_BYTES } from "@/lib/supabase/client";
import { removeCourseAsset, uploadCourseVideo } from "@/lib/supabase/storage";
import { Field } from "@/components/common";
import { Button } from "@/components/ui/button";

const MAX_VIDEO_MB = Math.round(MAX_VIDEO_BYTES / (1024 * 1024));

export function newLecture(bagId: string, levelId: string, audience: string): Lecture {
  const now = new Date().toISOString();
  return {
    id: uid("lec"),
    bagId,
    levelId,
    order: 0,
    title: "",
    description: "",
    objectives: [],
    audience,
    durationMin: 60,
    trainer: "",
    sections: [{ id: uid("s"), heading: "", body: "" }],
    caseStudy: "",
    videoUrl: "",
    attachments: [],
    references: [],
    status: "draft",
    review: "not_required",
    reviewer: "",
    quiz: null,
    createdAt: now,
    updatedAt: now,
  };
}

const KIND_LABEL: Record<Attachment["kind"], string> = {
  pdf: "PDF",
  ppt: "عرض تقديمي",
  image: "صورة",
  video: "فيديو",
  link: "رابط",
  other: "ملف",
};

export function LectureForm({ initial, isNew }: { initial: Lecture; isNew: boolean }) {
  const { data, user, saveLecture } = useData();
  const navigate = useNavigate();
  const [f, setF] = useState<Lecture>(initial);
  const [objText, setObjText] = useState(initial.objectives.join("\n"));
  const [refText, setRefText] = useState(initial.references.join("\n"));
  const [link, setLink] = useState({ name: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const pendingVideoPath = useRef<string | null>(null);
  const initialVideoPath = useRef(initial.videoPath);
  const mounted = useRef(true);
  const set = <K extends keyof Lecture>(k: K, v: Lecture[K]) => setF((p) => ({ ...p, [k]: v }));
  const bags = data.bags.filter((b) => canEditBag(user, b.id));
  const bag = data.bags.find((b) => b.id === f.bagId);
  const medical = !!bag?.medical;
  const canApprove = can(user, "approve_medical");

  // A video uploaded from this form but not saved is removed when the editor
  // unmounts, so canceling does not leave orphaned storage objects.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pending = pendingVideoPath.current;
      if (!pending) return;
      pendingVideoPath.current = null;
      void removeCourseAsset(pending).catch((error) => {
        console.error("Could not remove an unsaved lesson video", error);
      });
    };
  }, []);

  const discardPendingVideo = () => {
    const pending = pendingVideoPath.current;
    if (!pending) return;
    pendingVideoPath.current = null;
    void removeCourseAsset(pending).catch((error) => {
      console.error("Could not remove a replaced lesson video", error);
    });
  };

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    if (!f.bagId) {
      toast.error("اختر الحقيبة التدريبية أولاً.");
      return;
    }
    setVideoUploading(true);
    try {
      const asset = await uploadCourseVideo(f.bagId, file);
      if (!mounted.current) {
        void removeCourseAsset(asset.path).catch((error) => {
          console.error("Could not remove a video uploaded after leaving the editor", error);
        });
        return;
      }
      discardPendingVideo();
      pendingVideoPath.current = asset.path;
      setF((current) => ({ ...current, videoPath: asset.path, videoUrl: asset.url }));
      toast.success("تم رفع الفيديو بنجاح");
    } catch (error) {
      if (mounted.current)
        toast.error(error instanceof Error ? error.message : "تعذر رفع الفيديو.");
    } finally {
      if (mounted.current) setVideoUploading(false);
    }
  };

  const clearVideo = () => {
    discardPendingVideo();
    setF((current) => {
      const { videoPath: _videoPath, ...rest } = current;
      return { ...rest, videoUrl: "" };
    });
  };

  const changeVideoUrl = (videoUrl: string) => {
    // One lesson has one video source: replacing a hosted upload with an
    // external link removes the hosted path from the saved record.
    discardPendingVideo();
    setF((current) => {
      const { videoPath: _videoPath, ...rest } = current;
      return { ...rest, videoUrl };
    });
  };

  const onBag = (id: string) => {
    const b = data.bags.find((x) => x.id === id)!;
    setF((p) => ({
      ...p,
      bagId: id,
      levelId: b.levels[0]?.id ?? "",
      audience: p.audience || b.audience,
    }));
  };

  const upload = async (files: FileList | null) => {
    if (!files) return;
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD) {
        toast.error(
          `«${file.name}» أكبر من 1.5 ميجابايت. في النسخة التجريبية أضف الملفات الكبيرة كرابط (مثل Google Drive).`,
        );
        continue;
      }
      added.push({
        id: uid("att"),
        name: file.name,
        kind: kindFromName(file.name),
        url: await readFileAsDataUrl(file),
        size: file.size,
      });
    }
    if (added.length) {
      set("attachments", [...f.attachments, ...added]);
      toast.success(`تمت إضافة ${added.length} ملف`);
    }
  };

  const addLink = () => {
    if (!/^https?:\/\//.test(link.url)) {
      toast.error("اكتب رابطاً كاملاً يبدأ بـ https://");
      return;
    }
    set("attachments", [
      ...f.attachments,
      {
        id: uid("att"),
        name: link.name || link.url,
        kind: kindFromName(link.url) === "other" ? "link" : kindFromName(link.url),
        url: link.url,
      },
    ]);
    setLink({ name: "", url: "" });
  };

  const submit = async (status: Lecture["status"]) => {
    if (videoUploading) {
      toast.error("انتظر انتهاء رفع الفيديو أولاً.");
      return;
    }
    if (!f.title.trim()) {
      toast.error("اكتب عنوان المحاضرة.");
      return;
    }
    if (!f.bagId || !f.levelId) {
      toast.error("اختر الحقيبة والمستوى.");
      return;
    }
    if (!f.trainer.trim()) {
      toast.error("اكتب اسم المدرب.");
      return;
    }
    const review = medical ? (f.review === "not_required" ? "pending" : f.review) : "not_required";
    if (status === "published" && medical && review !== "approved") {
      {
        toast.error(
          "هذه محاضرة طبية: يجب اعتمادها من صيدلي مؤهل قبل النشر. احفظها كمسودة حتى تتم المراجعة.",
        );
        return;
      }
    }
    setSaving(true);
    const ok = await saveLecture({
      ...f,
      status,
      review: review as Lecture["review"],
      objectives: objText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      references: refText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      sections: f.sections.filter((s) => s.heading.trim() || s.body.trim()),
    });
    setSaving(false);
    if (ok) {
      const savedVideoPath = f.videoPath;
      const pending = pendingVideoPath.current;
      pendingVideoPath.current = null;
      if (pending && pending !== savedVideoPath) {
        void removeCourseAsset(pending).catch((error) => {
          console.error("Could not remove a replaced lesson video", error);
        });
      }
      if (initialVideoPath.current && initialVideoPath.current !== savedVideoPath) {
        void removeCourseAsset(initialVideoPath.current).catch((error) => {
          console.error("Could not remove the previous lesson video", error);
        });
      }
      toast.success(status === "published" ? "تم نشر المحاضرة" : "تم حفظ المحاضرة كمسودة");
      navigate({ to: "/lectures/$lectureId", params: { lectureId: f.id } });
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="surface space-y-4 p-6">
      <h2 className="font-bold text-primary">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {Section({
          title: "البيانات الأساسية",
          children: (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="عنوان المحاضرة" required>
                  <input
                    className="field"
                    value={f.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="الحقيبة التدريبية" required>
                <select className="field" value={f.bagId} onChange={(e) => onBag(e.target.value)}>
                  {bags.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number}. {b.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="المستوى" required>
                <select
                  className="field"
                  value={f.levelId}
                  onChange={(e) => set("levelId", e.target.value)}
                >
                  {bag?.levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الفئة المستهدفة">
                <input
                  className="field"
                  value={f.audience}
                  onChange={(e) => set("audience", e.target.value)}
                />
              </Field>
              <Field label="المدرب" required>
                <input
                  className="field"
                  list="trainers"
                  value={f.trainer}
                  onChange={(e) => set("trainer", e.target.value)}
                />
                <datalist id="trainers">
                  {[...new Set(data.lectures.map((l) => l.trainer))].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label="المدة (بالدقائق)">
                <input
                  type="number"
                  min={5}
                  step={5}
                  className="field"
                  value={f.durationMin}
                  onChange={(e) => set("durationMin", Number(e.target.value) || 0)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="وصف مختصر">
                  <textarea
                    className="field min-h-20"
                    value={f.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="أهداف التعلم" hint="كل هدف في سطر منفصل.">
                  <textarea
                    className="field min-h-24"
                    value={objText}
                    onChange={(e) => setObjText(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ),
        })}

        {Section({
          title: "محتوى المحاضرة",
          children: (
            <>
              {f.sections.map((s, i) => (
                <div key={s.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                    <input
                      className="field"
                      placeholder="عنوان الجزء"
                      value={s.heading}
                      onChange={(e) =>
                        set(
                          "sections",
                          f.sections.map((x) =>
                            x.id === s.id ? { ...x, heading: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="حذف الجزء"
                      onClick={() =>
                        set(
                          "sections",
                          f.sections.filter((x) => x.id !== s.id),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <textarea
                    className="field min-h-28"
                    placeholder="نص الشرح…"
                    value={s.body}
                    onChange={(e) =>
                      set(
                        "sections",
                        f.sections.map((x) => (x.id === s.id ? { ...x, body: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  set("sections", [...f.sections, { id: uid("s"), heading: "", body: "" }])
                }
              >
                <Plus className="size-4" /> إضافة جزء
              </Button>
              <Field label="مثال عملي / دراسة حالة">
                <textarea
                  className="field min-h-20"
                  value={f.caseStudy}
                  onChange={(e) => set("caseStudy", e.target.value)}
                />
              </Field>
              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">فيديو المحاضرة</p>
                    <p className="text-xs text-muted-foreground">
                      {isSupabaseConfigured
                        ? `يُرفع إلى التخزين الخاص ويُعرض برابط مؤقت. MP4 أو WebM أو MOV أو M4V حتى ${MAX_VIDEO_MB} ميجابايت.`
                        : "رفع الفيديو إلى التخزين الخاص متاح بعد ربط Supabase. يمكنك الآن استخدام رابط خارجي."}
                    </p>
                  </div>
                  {isSupabaseConfigured && (
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted ${videoUploading || !f.bagId ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {videoUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {f.videoPath ? "استبدال الفيديو" : "رفع فيديو"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                        className="hidden"
                        disabled={videoUploading || !f.bagId}
                        onChange={(e) => {
                          void uploadVideo(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {isSupabaseConfigured &&
                  (f.videoPath ? (
                    <div className="space-y-2">
                      {f.videoUrl ? (
                        <video
                          src={f.videoUrl}
                          controls
                          preload="metadata"
                          playsInline
                          className="aspect-video w-full rounded-lg bg-black"
                        />
                      ) : (
                        <p className="rounded-lg bg-warning-soft p-3 text-sm text-muted-foreground">
                          تم رفع الفيديو، لكن تعذر إنشاء رابط معاينة مؤقت. أعد تحميل الصفحة للمحاولة
                          مرة أخرى.
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 text-brand-green">
                          <ShieldCheck className="size-3.5" /> فيديو خاص — يُعرض برابط مؤقت
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearVideo}
                          disabled={videoUploading}
                        >
                          <Trash2 className="size-4" /> إزالة الفيديو المرفوع
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                      {videoUploading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin" /> جارٍ رفع الفيديو…
                        </span>
                      ) : (
                        "لم يُرفع فيديو بعد. اختر ملف MP4 أو WebM أو MOV أو M4V."
                      )}
                    </div>
                  ))}
              </div>
              <Field
                label="أو رابط فيديو خارجي"
                hint="روابط يوتيوب تظهر داخل الصفحة مباشرة، والروابط الأخرى تظهر كزر فتح. إدخال رابط هنا يستبدل الفيديو المرفوع."
              >
                <input
                  dir="ltr"
                  className="field"
                  placeholder="https://youtube.com/…"
                  disabled={videoUploading}
                  value={f.videoPath ? "" : f.videoUrl}
                  onChange={(e) => changeVideoUrl(e.target.value)}
                />
              </Field>
            </>
          ),
        })}

        {Section({
          title: "المرفقات والمراجع",
          children: (
            <>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted">
                <Upload className="size-6 text-brand-green" />
                اضغط لرفع ملفات PDF أو عروض تقديمية أو صور (حتى 1.5 ميجابايت للملف في النسخة
                التجريبية)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,image/*"
                  className="hidden"
                  onChange={(e) => {
                    upload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  className="field"
                  placeholder="اسم الرابط"
                  value={link.name}
                  onChange={(e) => setLink({ ...link, name: e.target.value })}
                />
                <input
                  dir="ltr"
                  className="field"
                  placeholder="https://drive.google.com/…"
                  value={link.url}
                  onChange={(e) => setLink({ ...link, url: e.target.value })}
                />
                <Button variant="outline" onClick={addLink}>
                  <Link2 className="size-4" /> إضافة رابط
                </Button>
              </div>
              {f.attachments.length > 0 && (
                <ul className="divide-y rounded-xl border">
                  {f.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 p-3 text-sm">
                      <FileText className="size-4 shrink-0 text-brand-red" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{KIND_LABEL[a.kind]}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="إزالة"
                        onClick={() =>
                          set(
                            "attachments",
                            f.attachments.filter((x) => x.id !== a.id),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Field
                label="المراجع والمصادر"
                hint="كل مرجع في سطر. أضف فقط مراجع حقيقية تم التحقق منها."
              >
                <textarea
                  className="field min-h-20"
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                />
              </Field>
            </>
          ),
        })}
      </div>

      <aside className="space-y-6">
        <div className="surface sticky top-24 space-y-4 p-6">
          <h2 className="font-bold text-primary">النشر</h2>
          {medical && (
            <div className="space-y-3 rounded-xl bg-brand-blush p-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-brand-red">
                <ShieldCheck className="size-4" /> محتوى طبي — يحتاج اعتماد صيدلي مؤهل قبل النشر
              </p>
              {canApprove ? (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={f.review === "approved"}
                      onChange={(e) => set("review", e.target.checked ? "approved" : "pending")}
                    />
                    راجعتُ المحتوى وأعتمده
                  </label>
                  {f.review === "approved" && (
                    <input
                      className="field"
                      placeholder="اسم الصيدلي المعتمِد"
                      value={f.reviewer}
                      onChange={(e) => set("reviewer", e.target.value)}
                    />
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">سيراجعها مدير النظام ويعتمدها.</p>
              )}
            </div>
          )}
          <Button
            className="w-full"
            disabled={saving || videoUploading}
            onClick={() => submit("published")}
          >
            نشر المحاضرة
          </Button>
          <Button
            className="w-full"
            variant="outline"
            disabled={saving || videoUploading}
            onClick={() => submit("draft")}
          >
            حفظ كمسودة
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            disabled={videoUploading}
            onClick={() => history.back()}
          >
            إلغاء
          </Button>
          {!isNew && (
            <p className="text-xs text-muted-foreground">
              الحالة الحالية تُستبدل بما تختاره عند الحفظ.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
