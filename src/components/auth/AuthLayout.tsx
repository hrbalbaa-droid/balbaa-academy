import type { ReactNode } from "react";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";

import hero from "@/assets/hero_pharmacist.jpg";
import { BrandLogo } from "@/components/BrandLogo";

const highlights = [
  { icon: BookOpen, text: "مسارات تدريبية متكاملة للصيادلة وفرق البيع" },
  { icon: ShieldCheck, text: "محتوى طبي مُراجع ومعتمد قبل النشر" },
  { icon: Sparkles, text: "متابعة الإنجاز والمؤشرات في مكان واحد" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src={hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-primary/95 via-primary/80 to-primary/35" />
          <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-14 w-auto object-contain rounded-md" />
              <div>
                <div className="font-display text-xl font-bold">أكاديمية صيدليات بلبع</div>
                <div className="text-xs text-primary-foreground/70">الأكاديمية التدريبية</div>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-medium text-brand-mint">معرفة .. مهارة .. أداء أعلى</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight">
                تعلّم، طبّق، وارتقِ بأدائك الصيدلي.
              </h1>
              <p className="mt-4 max-w-md leading-loose text-primary-foreground/80">
                منصة تدريب داخلية تجمع الحقائب والمحاضرات والاختبارات ومؤشرات الأداء في تجربة واحدة
                واضحة.
              </p>
              <ul className="mt-8 space-y-3">
                {highlights.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 text-sm text-primary-foreground/85"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
                      <Icon className="size-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-primary-foreground/55">
              © {new Date().getFullYear()} صيدليات بلبع — جميع الحقوق محفوظة.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 md:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <BrandLogo className="h-14 w-auto object-contain rounded-md" />
              <div>
                <div className="font-display font-bold text-primary">أكاديمية صيدليات بلبع</div>
                <div className="text-xs text-muted-foreground">معرفة .. مهارة .. أداء أعلى</div>
              </div>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
