import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(typeof search["redirect"] === "string" && search["redirect"]
      ? { redirect: search["redirect"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | أكاديمية صيدليات بلبع" },
      { name: "description", content: "تسجيل الدخول إلى منصة الأكاديمية التدريبية لصيدليات بلبع." },
      { property: "og:title", content: "تسجيل الدخول – أكاديمية بلبع" },
      { property: "og:description", content: "ادخل إلى حقائبك التدريبية ومحاضراتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return (
    <AuthLayout>
      <LoginForm redirectTo={redirect} />
    </AuthLayout>
  );
}
