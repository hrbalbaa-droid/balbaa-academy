import type { AcademyData, Bag, Lecture } from "@/lib/types";

const UPDATE = "contracts-bag-v1";
const createdAt = "2026-11-05T07:57:00.000Z";

export function createContractsBag(number: number): Bag {
  return {
    id: "bag6", number, title: "شروط صرف التعاقدات",
    description: "مسار تمهيدي للصيادلة الجدد والمساعدين لفهم مستندات التعاقدات ومراجعة طلبات الصرف والتعامل مع الحالات العملية وفق الشروط المعتمدة لكل جهة تعاقد.",
    audience: "الصيادلة الجدد والمساعدون",
    objectives: ["التعرف على مستندات وبيانات طلب الصرف", "الرجوع إلى شروط الجهة المتعاقدة قبل تنفيذ الطلب", "تمييز الطلبات الناقصة والحالات التي تحتاج مراجعة المسؤول", "توثيق عملية الصرف ومراجعة المستندات"],
    levels: [{ id: "bag6-l1", name: "أساسيات التعاقدات" }, { id: "bag6-l2", name: "التطبيق على حالات الصرف" }],
    cover: "preset:pos", medical: false, suggestedHours: "", priority: "first", kpis: [], createdAt,
  };
}

export function createContractsLectures(): Lecture[] {
  const base = {
    bagId: "bag6", order: 1, audience: "الصيادلة الجدد والمساعدون", durationMin: 0, trainer: "",
    videoUrl: "", attachments: [], references: [], status: "draft" as const, review: "not_required" as const,
    reviewer: "", quiz: null, createdAt, updatedAt: createdAt,
  };
  return [
    {
      ...base, id: "lec-801", levelId: "bag6-l1", title: "مقدمة في التعاقدات ومراجعة مستندات الصرف",
      description: "محتوى تمهيدي مقترح؛ تُضاف إليه شروط الجهات المتعاقدة المعتمدة قبل النشر.",
      objectives: ["تحديد الجهة المتعاقدة ومصدر شروطها المعتمدة", "مراجعة اكتمال بيانات الطلب قبل تحويله للمسؤول"],
      sections: [
        { id: "contracts-s1", heading: "الرجوع إلى شروط الجهة المتعاقدة", body: "تختلف شروط الصرف بين الجهات المتعاقدة. يُضاف هنا المرجع المعتمد لكل جهة والمستندات المطلوبة وطريقة التحقق منها، ولا تُفترض شروط موحدة لجميع التعاقدات." },
        { id: "contracts-s2", heading: "مراجعة الطلب", body: "راجع بيانات الطلب والمستندات وفق المرجع المعتمد. عند وجود بيانات ناقصة أو شرط غير واضح، اعرض الحالة على المسؤول المختص قبل استكمال الطلب." },
      ],
      caseStudy: "طلب صرف يحتوي على بيانات ناقصة: ما المعلومات التي تحتاج استكمالها وفق شروط الجهة؟ ومن المسؤول الذي ترجع إليه؟",
    },
    {
      ...base, id: "lec-802", levelId: "bag6-l2", title: "حالات عملية: الطلبات الناقصة والموافقات والتوثيق",
      description: "حالات تدريبية مقترحة تُستكمل بأمثلة من التعاقدات الفعلية وشروطها المعتمدة.",
      objectives: ["تمييز ما يحتاج استكمال مستندات أو مراجعة المسؤول", "توثيق الطلب وفق إجراءات الجهة المتعاقدة"],
      sections: [
        { id: "contracts-s3", heading: "حالة تحتاج موافقة", body: "إذا نصت شروط الجهة المعتمدة على موافقة مسبقة، تُراجع الموافقة وفق تلك الشروط. عند عدم وضوح الموافقة أو نطاقها، تُحال الحالة إلى المسؤول المختص دون افتراض السماح بالصرف." },
        { id: "contracts-s4", heading: "التوثيق والمراجعة", body: "يُضاف هنا إجراء التوثيق المعتمد في السلسلة لكل جهة، بما يشمل حفظ المستندات المطلوبة ومراجعة بيانات العملية. لا تُحدد نسب تحمل أو حدود صرف أو مدد صلاحية إلا من المرجع المعتمد." },
      ],
      caseStudy: "طلب لا تتضح فيه الموافقة المطلوبة: راجع شروط الجهة، وحدد ما يحتاج تحققاً، وسجّل الأسئلة التي ستعرضها على المسؤول.",
    },
  ];
}

/** Apply once to existing local data without replacing edits or restoring later deletions. */
export function addContractsBag(data: AcademyData): AcademyData {
  if (data.appliedUpdates?.includes(UPDATE)) return data;
  const existing = data.bags.some((bag) => bag.id === "bag6" || bag.title.trim() === "شروط صرف التعاقدات");
  return {
    ...data,
    bags: existing ? data.bags : [...data.bags, createContractsBag(Math.max(0, ...data.bags.map((bag) => bag.number)) + 1)],
    lectures: existing ? data.lectures : [...data.lectures, ...createContractsLectures().filter((lecture) => !data.lectures.some((item) => item.id === lecture.id))],
    appliedUpdates: [...(data.appliedUpdates ?? []), UPDATE],
  };
}