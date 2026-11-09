import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Library, ArrowUp, ArrowDown, CheckCircle2, Loader2 } from "lucide-react";
import { useData } from "@/lib/store";
import { useLearning } from "@/lib/learning/LearningProvider";
import { can, canEditBag, visibleBags } from "@/lib/permissions";
import { fmtDate, fmtDuration } from "@/lib/format";
import { EmptyState, PageHeader, ReviewBadge, StatusBadge } from "@/components/common";
import { LectureRowActions } from "@/components/LectureRowActions";
import { Button } from "@/components/ui/button";

type S = { q?: string; review?: string };

export const Route = createFileRoute("/lectures/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["review"] === "string" ? { review: s["review"] } : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "مكتبة المحاضرات | أكاديمية صيدليات بلبع" },
      { name: "description", content: "ابحث وصفِّ وأدِر محاضرات الأكاديمية." },
      { property: "og:title", content: "مكتبة المحاضرات – أكاديمية بلبع" },
      { property: "og:description", content: "كل محاضرات الحقائب التدريبية في مكان واحد." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, user, reorderLecture } = useData();
  const learning = useLearning();
  const isStudent = user.role === "trainee";
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [bag, setBag] = useState("");
  const [level, setLevel] = useState("");
  const [audience, setAudience] = useState("");
  const [trainer, setTrainer] = useState("");
  const [status, setStatus] = useState(user.role === "trainee" ? "published" : "");
  const [review, setReview] = useState(search.review ?? "");
  const [sort, setSort] = useState<"sequence" | "date" | "title">("sequence");

  const visible = visibleBags(user, data.bags);
  const bags = isStudent ? visible.filter((b) => learning.isEnrolled(b.id)) : visible;
  const base = data.lectures.filter(
    (l) =>
      bags.some((b) => b.id === l.bagId) && (user.role !== "trainee" || l.status === "published"),
  );
  const trainers = [...new Set(base.map((l) => l.trainer))];
  const audiences = [...new Set(base.map((l) => l.audience).filter(Boolean))];
  const selectedBag = data.bags.find((b) => b.id === bag);

  const rows = useMemo(() => {
    const term = q.trim();
    const filtered = base.filter(
      (l) =>
        (!term || l.title.includes(term)) &&
        (!bag || l.bagId === bag) &&
        (!level || l.levelId === level) &&
        (!audience || l.audience === audience) &&
        (!trainer || l.trainer === trainer) &&
        (!status || l.status === status) &&
        (!review || l.review === review),
    );
    const bagNo = (id: string) => data.bags.find((b) => b.id === id)?.number ?? 99;
    const lvlNo = (l: (typeof base)[0]) =>
      data.bags.find((b) => b.id === l.bagId)?.levels.findIndex((x) => x.id === l.levelId) ?? 0;
    return filtered.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "ar")
        : sort === "date"
          ? b.updatedAt.localeCompare(a.updatedAt)
          : bagNo(a.bagId) - bagNo(b.bagId) || lvlNo(a) - lvlNo(b) || a.order - b.order,
    );
  }, [base, q, bag, level, audience, trainer, status, review, sort, data.bags]);

  if (isStudent && learning.loading) {
    return (
      <div>
        <PageHeader title="مكتبة المحاضرات" subtitle="جارٍ تحميل حقائبك المسجلة…" />
        <div className="surface flex items-center justify-center gap-3 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-green" />
          جارٍ تحميل المحاضرات المتاحة لك…
        </div>
      </div>
    );
  }

  const anyFilter =
    q || bag || level || audience || trainer || (user.role !== "trainee" && status) || review;
  const reset = () => {
    setQ("");
    setBag("");
    setLevel("");
    setAudience("");
    setTrainer("");
    setStatus("");
    setReview("");
  };

  return (
    <div>
      <PageHeader
        title="مكتبة المحاضرات"
        subtitle={`${base.length} محاضرة في ${bags.length} حقائب`}
        actions={
          can(user, "manage_lectures") && (
            <Button asChild>
              <Link to="/lectures/new">
                <Plus className="size-4" /> إضافة محاضرة جديدة
              </Link>
            </Button>
          )
        }
      />

      {isStudent && learning.error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft p-4 text-sm">
          <span>{learning.error}</span>
          <Button variant="outline" size="sm" onClick={() => void learning.refresh()}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="surface mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <div className="relative sm:col-span-2">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field pe-9"
            placeholder="ابحث باسم المحاضرة"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="field"
          value={bag}
          onChange={(e) => {
            setBag(e.target.value);
            setLevel("");
          }}
          aria-label="الحقيبة"
        >
          <option value="">كل الحقائب</option>
          {bags.map((b) => (
            <option key={b.id} value={b.id}>
              {b.number}. {b.title}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          disabled={!selectedBag}
          aria-label="المستوى"
        >
          <option value="">{selectedBag ? "كل المستويات" : "اختر حقيبة أولاً"}</option>
          {selectedBag?.levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          aria-label="الفئة المستهدفة"
        >
          <option value="">كل الفئات</option>
          {audiences.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          className="field"
          value={trainer}
          onChange={(e) => setTrainer(e.target.value)}
          aria-label="المدرب"
        >
          <option value="">كل المدربين</option>
          {trainers.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {user.role !== "trainee" && (
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="الحالة"
          >
            <option value="">كل الحالات</option>
            <option value="published">منشورة</option>
            <option value="draft">مسودة</option>
            <option value="archived">مؤرشفة</option>
          </select>
        )}
        <select
          className="field"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="الترتيب"
        >
          <option value="sequence">ترتيب التسلسل</option>
          <option value="date">الأحدث تعديلاً</option>
          <option value="title">أبجدياً</option>
        </select>
      </div>
      {anyFilter && (
        <button onClick={reset} className="-mt-3 mb-4 text-sm text-brand-green underline">
          مسح كل عوامل التصفية
        </button>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Library />}
          title={anyFilter ? "لا توجد نتائج مطابقة" : "المكتبة فارغة"}
          hint={
            anyFilter
              ? "جرّب كلمة بحث أخرى أو امسح عوامل التصفية."
              : isStudent
                ? "سجل في حقيبة من صفحة حقائب التدريب لتظهر محاضراتها هنا."
                : "ابدأ بإضافة أول محاضرة من الزر بالأعلى."
          }
        />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted text-right text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">المحاضرة</th>
                  <th className="p-3">الحقيبة / المستوى</th>
                  <th className="p-3">المدرب</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">آخر تعديل</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((l) => {
                  const b = data.bags.find((x) => x.id === l.bagId);
                  const group = data.lectures.filter(
                    (x) => x.bagId === l.bagId && x.levelId === l.levelId,
                  );
                  const editable = canEditBag(user, l.bagId);
                  return (
                    <tr key={l.id} className="hover:bg-muted/50">
                      <td className="p-3 font-bold text-muted-foreground">{l.order}</td>
                      <td className="p-3">
                        {isStudent ? (
                          <Link
                            to="/learn/$bagId"
                            params={{ bagId: l.bagId }}
                            search={{ lesson: l.id }}
                            className="font-medium hover:text-primary"
                          >
                            {l.title}
                          </Link>
                        ) : (
                          <Link
                            to="/lectures/$lectureId"
                            params={{ lectureId: l.id }}
                            className="font-medium hover:text-primary"
                          >
                            {l.title}
                          </Link>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <ReviewBadge review={l.review} />
                          {isStudent && learning.isLessonCompleted(l.id) && (
                            <span className="flex items-center gap-1 text-xs font-medium text-brand-green">
                              <CheckCircle2 className="size-3.5" /> مكتمل
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {b?.title}
                        <div className="text-xs">
                          {b?.levels.find((x) => x.id === l.levelId)?.name}
                        </div>
                      </td>
                      <td className="p-3">{l.trainer}</td>
                      <td className="p-3 whitespace-nowrap">{fmtDuration(l.durationMin)}</td>
                      <td className="p-3">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {fmtDate(l.updatedAt)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                          {editable && sort === "sequence" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={l.order <= 1}
                                onClick={() => reorderLecture(l.id, -1)}
                                aria-label="تحريك لأعلى"
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={l.order >= group.length}
                                onClick={() => reorderLecture(l.id, 1)}
                                aria-label="تحريك لأسفل"
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                            </>
                          )}
                          <LectureRowActions lecture={l} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
