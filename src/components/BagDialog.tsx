import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/common";
import { useData, uid } from "@/lib/store";
import type { Bag } from "@/lib/types";
import { COVER_PRESETS, MAX_UPLOAD, coverSrc, readFileAsDataUrl } from "@/lib/format";
import { isSupabaseConfigured, MAX_IMAGE_BYTES } from "@/lib/supabase/client";
import { removeCourseAsset, uploadCourseThumbnail } from "@/lib/supabase/storage";

const MAX_IMAGE_MB = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

const empty = (number: number): Bag => ({
  id: uid("bag"),
  number,
  title: "",
  description: "",
  audience: "",
  objectives: [],
  levels: [{ id: uid("lvl"), name: "المستوى الأول" }],
  cover: "preset:practice",
  medical: false,
  suggestedHours: "",
  priority: "first",
  kpis: [],
  createdAt: new Date().toISOString(),
});

export function BagDialog({
  open,
  onOpenChange,
  bag,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bag?: Bag;
}) {
  const { data, saveBag } = useData();
  const [form, setForm] = useState<Bag>(() => bag ?? empty(data.bags.length + 1));
  const [levelsText, setLevelsText] = useState("");
  const [objText, setObjText] = useState("");
  const [uploading, setUploading] = useState(false);
  const pendingThumbnailPath = useRef<string | null>(null);
  const initialThumbnailPath = useRef<string | null>(bag?.thumbnailPath ?? null);
  const mounted = useRef(true);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    // The course row is refreshed after every save. Do not reset the form (or
    // the original thumbnail path) while the dialog is still open.
    if (wasOpen.current) return;
    wasOpen.current = true;
    const b = bag ?? empty(Math.max(0, ...data.bags.map((x) => x.number)) + 1);
    setForm(b);
    setLevelsText(b.levels.map((l) => l.name).join("\n"));
    setObjText(b.objectives.join("\n"));
    initialThumbnailPath.current = b.thumbnailPath ?? null;
  }, [open, bag]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing the dialog discards only thumbnails uploaded during this session.
  // A saved course thumbnail is kept until the form is actually saved.
  useEffect(() => {
    if (open) return;
    const pending = pendingThumbnailPath.current;
    if (!pending) return;
    pendingThumbnailPath.current = null;
    void removeCourseAsset(pending).catch((error) => {
      console.error("Could not remove an unsaved course thumbnail", error);
    });
  }, [open]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const pending = pendingThumbnailPath.current;
      if (!pending) return;
      pendingThumbnailPath.current = null;
      void removeCourseAsset(pending).catch((error) => {
        console.error("Could not remove an unsaved course thumbnail", error);
      });
    };
  }, []);

  const discardPendingThumbnail = () => {
    const pending = pendingThumbnailPath.current;
    if (!pending) return;
    pendingThumbnailPath.current = null;
    void removeCourseAsset(pending).catch((error) => {
      console.error("Could not remove a replaced course thumbnail", error);
    });
  };

  const choosePreset = (key: string) => {
    discardPendingThumbnail();
    setForm((current) => {
      const { thumbnailPath: _thumbnailPath, ...rest } = current;
      return { ...rest, cover: key };
    });
  };

  const set = <K extends keyof Bag>(k: K, v: Bag[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (uploading) {
      toast.error("انتظر انتهاء رفع صورة الغلاف أولاً.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("اكتب اسم الحقيبة أولاً.");
      return;
    }
    const names = levelsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) {
      toast.error("أضف مستوى واحداً على الأقل.");
      return;
    }
    const levels = names.map((name, i) =>
      form.levels[i] ? { ...form.levels[i], name } : { id: uid("lvl"), name },
    );
    const removed = form.levels.slice(names.length);
    if (removed.some((lv) => data.lectures.some((l) => l.levelId === lv.id))) {
      {
        toast.error("لا يمكن حذف مستوى يحتوي على محاضرات. انقل محاضراته أولاً.");
        return;
      }
    }
    const ok = await saveBag({
      ...form,
      levels,
      objectives: objText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (ok) {
      const savedThumbnailPath =
        form.cover.startsWith("preset:") || form.cover.startsWith("data:")
          ? undefined
          : form.thumbnailPath;
      const pending = pendingThumbnailPath.current;
      pendingThumbnailPath.current = null;
      if (pending && pending !== savedThumbnailPath) {
        void removeCourseAsset(pending).catch((error) => {
          console.error("Could not remove a replaced course thumbnail", error);
        });
      }
      if (initialThumbnailPath.current && initialThumbnailPath.current !== savedThumbnailPath) {
        void removeCourseAsset(initialThumbnailPath.current).catch((error) => {
          console.error("Could not remove the previous course thumbnail", error);
        });
      }
      toast.success(bag ? "تم حفظ تعديلات الحقيبة" : "تمت إضافة الحقيبة بنجاح");
      onOpenChange(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file || uploading) return;
    if (isSupabaseConfigured) {
      setUploading(true);
      try {
        const asset = await uploadCourseThumbnail(form.id, file);
        if (!mounted.current) {
          void removeCourseAsset(asset.path).catch((error) => {
            console.error("Could not remove a thumbnail uploaded after leaving the dialog", error);
          });
          return;
        }
        const previous = pendingThumbnailPath.current;
        pendingThumbnailPath.current = asset.path;
        if (previous && previous !== asset.path) {
          void removeCourseAsset(previous).catch((error) => {
            console.error("Could not remove a replaced course thumbnail", error);
          });
        }
        setForm((current) => ({ ...current, cover: asset.url, thumbnailPath: asset.path }));
        toast.success("تم رفع صورة الغلاف");
      } catch (error) {
        if (mounted.current) {
          toast.error(error instanceof Error ? error.message : "تعذر رفع صورة الغلاف.");
        }
      } finally {
        if (mounted.current) setUploading(false);
      }
      return;
    }
    if (file.size > MAX_UPLOAD) {
      toast.error("حجم الصورة كبير. الحد الأقصى في النسخة التجريبية 1.5 ميجابايت.");
      return;
    }
    const cover = await readFileAsDataUrl(file);
    setForm((current) => {
      const { thumbnailPath: _thumbnailPath, ...rest } = current;
      return { ...rest, cover };
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && uploading) {
          toast.error("انتظر انتهاء رفع صورة الغلاف أولاً.");
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto text-right sm:max-w-2xl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{bag ? "تعديل الحقيبة التدريبية" : "إضافة حقيبة تدريبية جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="اسم الحقيبة" required>
              <input
                className="field"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="الوصف">
              <textarea
                className="field min-h-20"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
          <Field label="الفئة المستهدفة">
            <input
              className="field"
              value={form.audience}
              onChange={(e) => set("audience", e.target.value)}
            />
          </Field>
          <Field label="المدة المقترحة">
            <input
              className="field"
              placeholder="مثال: 12 – 16 ساعة"
              value={form.suggestedHours}
              onChange={(e) => set("suggestedHours", e.target.value)}
            />
          </Field>
          <Field label="المستويات" hint="كل مستوى في سطر، بالترتيب من الأسهل للأصعب.">
            <textarea
              className="field min-h-24"
              value={levelsText}
              onChange={(e) => setLevelsText(e.target.value)}
            />
          </Field>
          <Field label="أهداف التعلم" hint="كل هدف في سطر.">
            <textarea
              className="field min-h-24"
              value={objText}
              onChange={(e) => setObjText(e.target.value)}
            />
          </Field>
          <Field label="الأولوية">
            <select
              className="field"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as Bag["priority"])}
            >
              <option value="first">الأولوية الأولى</option>
              <option value="second">الأولوية الثانية</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.medical}
              onChange={(e) => set("medical", e.target.checked)}
              className="size-4 accent-primary"
            />
            محتوى طبي (يحتاج اعتماد صيدلي قبل النشر)
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium">صورة الغلاف</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {Object.entries(COVER_PRESETS).map(([k, p]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => choosePreset(k)}
                  title={p.label}
                  className={`overflow-hidden rounded-lg border-2 ${form.cover === k ? "border-primary" : "border-transparent"}`}
                >
                  <img src={p.src} alt={p.label} className="h-12 w-16 object-cover" />
                </button>
              ))}
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-muted ${uploading ? "pointer-events-none opacity-60" : ""}`}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {uploading ? "جارٍ الرفع…" : "رفع صورة"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {!COVER_PRESETS[form.cover] && (
                <div className="relative">
                  <img
                    src={coverSrc(form.cover)}
                    alt=""
                    className="h-12 w-16 rounded-lg border-2 border-primary object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -end-1 -top-1 size-5 rounded-full"
                    onClick={() => choosePreset("preset:practice")}
                    aria-label="إزالة الصورة المرفوعة"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
              <p className="w-full text-xs text-muted-foreground">
                {isSupabaseConfigured
                  ? `PNG أو JPG أو WebP أو GIF — حتى ${MAX_IMAGE_MB} ميجابايت. تُحفظ الصورة في التخزين الخاص وتظهر برابط مؤقت.`
                  : "في النسخة التجريبية تُحفظ الصورة داخل المتصفح بحد أقصى 1.5 ميجابايت."}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={uploading}>
            حفظ الحقيبة
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
