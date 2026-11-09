import { createFileRoute, Link } from "@tanstack/react-router";
import { useData } from "@/lib/store";
import { canEditBag } from "@/lib/permissions";
import { requireAdminIdentity } from "@/lib/auth/guards";
import { PageHeader } from "@/components/common";
import { LectureForm } from "@/components/LectureForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lectures/$lectureId/edit")({
  beforeLoad: async ({ location }) => {
    await requireAdminIdentity(location.href);
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "تعديل محاضرة | أكاديمية صيدليات بلبع" },
      { name: "description", content: "تعديل بيانات ومحتوى المحاضرة." },
      { property: "og:title", content: "تعديل محاضرة – أكاديمية بلبع" },
      { property: "og:description", content: "تعديل بيانات ومحتوى المحاضرة." },
    ],
  }),
  component: EditLecture,
});

function EditLecture() {
  const { lectureId } = Route.useParams();
  const { data, user } = useData();
  const lec = data.lectures.find((l) => l.id === lectureId);
  if (!lec || !canEditBag(user, lec.bagId)) {
    return (
      <div className="surface p-10 text-center">
        <p className="font-bold">{lec ? "ليست لديك صلاحية تعديل هذه المحاضرة." : "المحاضرة غير موجودة."}</p>
        <Button asChild className="mt-4"><Link to="/lectures">العودة للمكتبة</Link></Button>
      </div>
    );
  }
  return (
    <div>
      <PageHeader crumbs={[{ label: "مكتبة المحاضرات", to: "/lectures" }, { label: lec.title, to: "/lectures/$lectureId", params: { lectureId } }, { label: "تعديل" }]} title="تعديل المحاضرة" />
      <LectureForm key={lec.id} initial={lec} isNew={false} />
    </div>
  );
}
