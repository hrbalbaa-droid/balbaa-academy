import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

type SignupSearch = { redirect?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    ...(typeof search["redirect"] === "string" && search["redirect"]
      ? { redirect: search["redirect"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "إنشاء حساب | أكاديمية صيدليات بلبع" },
      {
        name: "description",
        content: "إنشاء حساب جديد في منصة الأكاديمية التدريبية لصيدليات بلبع.",
      },
      { property: "og:title", content: "إنشاء حساب – أكاديمية بلبع" },
      { property: "og:description", content: "انضم إلى مسارات التدريب الصيدلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  return (
    <AuthLayout>
      <SignupForm redirectTo={redirect} />
    </AuthLayout>
  );
}
