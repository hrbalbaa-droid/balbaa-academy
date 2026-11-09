import type { AcademyData, Bag, Lecture, QuizQuestion } from "@/lib/types";
import { addContractsBag } from "./contracts-bag";

const lv = (bag: string, names: string[]) => names.map((name, i) => ({ id: `${bag}-l${i + 1}`, name }));

function bags(): Bag[] {
  const now = "2026-09-01T08:00:00.000Z";
  return [
    {
      id: "bag1", number: 1, title: "الممارسة الصيدلية المتكاملة",
      description: "مسار تدريبي متدرج يبني قدرة الصيدلي على تقييم المريض واختيار التوصية المناسبة بأمان، من الأساسيات حتى الحالات المتكاملة.",
      audience: "الصيادلة",
      objectives: ["تقييم المريض وأخذ التاريخ المرضي والدوائي بشكل منظم", "التعامل مع الشكاوى الشائعة بثقة وأمان", "اكتشاف موانع الاستخدام والتداخلات الدوائية", "تحديد الحالات التي تستلزم التحويل للطبيب"],
      levels: lv("bag1", ["التأسيس", "التطبيق", "الإتقان"]),
      cover: "preset:practice", medical: true, suggestedHours: "30 – 36 ساعة", priority: "first", kpis: ["k-noit", "k-rsp"], createdAt: now,
    },
    {
      id: "bag2", number: 2, title: "البيع الصيدلي وتنمية المبيعات والربحية",
      description: "مهارات البيع الاستشاري المسؤول وفهم مؤشرات الأداء وتحويلها إلى خطة بيع يومية.",
      audience: "الصيادلة وفرق البيع ومشرفو الفروع",
      objectives: ["فهم احتياج العميل قبل التوصية", "البيع المتكامل المسؤول دون إلحاح", "قراءة مؤشرات الأداء وربطها بالسلوك اليومي", "رفع مبيعات قائمة الأصناف المستهدفة"],
      levels: lv("bag2", ["الأساسيات", "التطبيق العملي"]),
      cover: "preset:sales", medical: false, suggestedHours: "12 – 16 ساعة", priority: "first", kpis: ["k-not", "k-avt", "k-rsp", "k-noit", "k-disc", "k-push"], createdAt: now,
    },
    {
      id: "bag3", number: 3, title: "Cosmo Medical – معرفة المنتجات والبيع الاستشاري",
      description: "معرفة شاملة بفئات العناية بالبشرة والشعر والجسم في السوق المصري، والمكونات الفعالة، وبناء الروتين المناسب لكل عميل.",
      audience: "فريق Cosmo Medical ومشرفوه",
      objectives: ["فهم أنواع البشرة والشعر ومشكلاتهما الشائعة", "معرفة المكونات الفعالة واستخداماتها العامة", "بناء روتين متكامل واقتراح بدائل مناسبة", "البيع الاستشاري في قسم الكوزمو"],
      levels: lv("bag3", ["المعرفة الأساسية", "الاستشارة والروتين"]),
      cover: "preset:cosmo", medical: false, suggestedHours: "18 – 24 ساعة", priority: "first", kpis: ["k-cosmo", "k-noit"], createdAt: now,
    },
    {
      id: "bag4", number: 4, title: "إدارة نقطة البيع والأداء التجاري",
      description: "وحدات مشتركة لمديري الفروع ومشرفي الكوزمو، ووحدات متخصصة لكل دور، تنتهي بمشروع تحسين عملي.",
      audience: "مديرو الفروع ومشرفو الكوزمو",
      objectives: ["إدارة مؤشرات أداء الفرع", "تدريب الفريق ومتابعته", "ضبط الخصومات والمخزون", "تنفيذ مشروع تحسين عملي"],
      levels: lv("bag4", ["وحدات مشتركة", "وحدات مدير الفرع", "وحدات مشرف الكوزمو"]),
      cover: "preset:pos", medical: false, suggestedHours: "18 – 24 ساعة", priority: "second", kpis: ["k-not", "k-avt", "k-disc", "k-credit", "k-cosmo", "k-s"], createdAt: now,
    },
    {
      id: "bag5", number: 5, title: "قيادة المناطق وإدارة أداء الفروع",
      description: "تحليل أداء عدة فروع ومقارنتها، والزيارات الميدانية، وتدريب مديري الفروع، ومشروعات التحسين على مستوى المنطقة.",
      audience: "مديرو المناطق",
      objectives: ["تحليل الأداء والربحية على مستوى المنطقة", "مقارنة الفروع واكتشاف فرص التحسين", "تنفيذ زيارات ميدانية فعالة", "تدريب مديري الفروع"],
      levels: lv("bag5", ["التحليل والمتابعة", "القيادة والتحسين"]),
      cover: "preset:area", medical: false, suggestedHours: "18 – 24 ساعة", priority: "second", kpis: ["k-not", "k-avt", "k-disc", "k-credit", "k-push"], createdAt: now,
    },
  ];
}

type Draft = Partial<Lecture> & Pick<Lecture, "id" | "bagId" | "levelId" | "title" | "trainer">;

const sec = (id: string, heading: string, body: string) => ({ id, heading, body });

const tfQuiz = (qs: Array<[string, boolean]>, mcq: Array<[string, string[], number]>): { passScore: number; questions: QuizQuestion[] } => ({
  passScore: 70,
  questions: [
    ...mcq.map(([text, options, correct], i) => ({ id: `m${i}`, type: "mcq" as const, text, options, correct })),
    ...qs.map(([text, ans], i) => ({ id: `t${i}`, type: "tf" as const, text, options: ["صح", "خطأ"], correct: ans ? 0 : 1 })),
  ],
});

function lectures(): Lecture[] {
  const drafts: Draft[] = [
    {
      id: "lec-101", bagId: "bag1", levelId: "bag1-l1", title: "تقييم المريض وأخذ التاريخ المرضي والدوائي", trainer: "د. منى عبد الرحمن",
      description: "كيف تبني محادثة منظمة مع المريض تجمع فيها المعلومات اللازمة قبل أي توصية.",
      objectives: ["تطبيق أسلوب أسئلة منظم مع كل مريض", "جمع التاريخ الدوائي بما فيه المكملات", "التعرف على العلامات التي تستلزم التحويل"],
      durationMin: 90, status: "published", review: "approved", reviewer: "د. أحمد بلبع",
      sections: [
        sec("s1", "لماذا نبدأ بالتقييم؟", "التوصية الآمنة تبدأ بفهم من هو المريض، وما الشكوى، ومنذ متى، وما الذي جربه بالفعل. التقييم المنظم يقلل الأخطاء ويرفع ثقة العميل في الصيدلي."),
        sec("s2", "عناصر المحادثة", "• من المريض؟ (العمر، الحمل أو الرضاعة، الحالات المزمنة)\n• ما الأعراض؟ ومدتها وشدتها\n• ما الأدوية الحالية والمكملات؟\n• هل توجد حساسية معروفة؟\n• هل جُرب علاج من قبل؟"),
        sec("s3", "متى نحوّل للطبيب؟", "يُراجع هذا الجزء ويُعتمد من الصيدلي المسؤول عن المحتوى الطبي وفق البروتوكولات المعتمدة في السلسلة."),
      ],
      caseStudy: "سيدة تطلب دواءً للسعال لابنها. ما الأسئلة الخمسة التي تطرحها قبل أي توصية؟ ناقش الإجابة مع زملائك.",
      quiz: tfQuiz([["يجب السؤال عن المكملات الغذائية ضمن التاريخ الدوائي", true], ["عمر المريض غير مهم في الشكاوى البسيطة", false]], [["ما أول خطوة قبل التوصية بأي منتج؟", ["عرض أغلى منتج", "تقييم المريض وجمع المعلومات", "سؤال المريض عن ميزانيته فقط"], 1]]),
    },
    { id: "lec-102", bagId: "bag1", levelId: "bag1-l1", title: "التعامل مع الشكاوى الشائعة: الألم والحرارة", trainer: "د. منى عبد الرحمن", durationMin: 75, status: "published", review: "approved", reviewer: "د. أحمد بلبع", description: "إطار عملي لتقييم شكاوى الألم والحرارة وتحديد ما يمكن التعامل معه في الصيدلية." },
    { id: "lec-103", bagId: "bag1", levelId: "bag1-l1", title: "أساسيات سلامة الدواء وموانع الاستخدام", trainer: "د. كريم النجعاوي", durationMin: 60, status: "draft", review: "pending", description: "مفاهيم أساسية لاكتشاف موانع الاستخدام قبل صرف أي دواء." },
    { id: "lec-201", bagId: "bag1", levelId: "bag1-l2", title: "حالات الجهاز التنفسي الشائعة", trainer: "د. سارة فؤاد", durationMin: 120, status: "published", review: "approved", reviewer: "د. أحمد بلبع", description: "تطبيق خطوات التقييم على شكاوى الجهاز التنفسي من خلال حالات عملية." },
    { id: "lec-202", bagId: "bag1", levelId: "bag1-l2", title: "شكاوى الجهاز الهضمي", trainer: "د. سارة فؤاد", durationMin: 90, status: "draft", review: "pending", description: "التمييز بين الشكاوى البسيطة وتلك التي تحتاج تحويلاً." },
    { id: "lec-301", bagId: "bag1", levelId: "bag1-l3", title: "الحالات المتكاملة والفئات الخاصة", trainer: "د. كريم النجعاوي", durationMin: 150, status: "draft", review: "pending", description: "حالات تجمع بين أمراض مزمنة وأدوية متعددة وفئات خاصة كالحوامل وكبار السن." },
    {
      id: "lec-401", bagId: "bag2", levelId: "bag2-l1", title: "فهم احتياج العميل والبيع الاستشاري", trainer: "أ. محمد سالم",
      description: "كيف تنتقل من «بيع منتج» إلى «حل مشكلة العميل».", durationMin: 90, status: "published", review: "not_required",
      objectives: ["طرح أسئلة مفتوحة لفهم الاحتياج", "ربط المنتج بفائدة واضحة للعميل", "الحفاظ على ثقة العميل على المدى الطويل"],
      sections: [
        sec("s1", "الاستماع قبل التوصية", "العميل الذي يشعر بأنك فهمته يعود مرة أخرى. ابدأ بسؤال مفتوح، ثم لخّص ما فهمته قبل اقتراح أي منتج."),
        sec("s2", "البيع المتكامل المسؤول", "اقترح منتجاً مكمّلاً فقط إذا كان يخدم احتياج العميل فعلاً. هذا ينعكس مباشرة على مؤشر NOI/T (عدد الأصناف في الفاتورة) دون الإضرار بالثقة."),
      ],
      caseStudy: "عميل يطلب كريماً مرطباً لليدين في الشتاء. كيف تفهم احتياجه وتقترح ما يكمل الروتين بشكل مسؤول؟",
      quiz: tfQuiz([["البيع المتكامل يعني إضافة أي منتج للفاتورة", false]], [["أي مؤشر يتأثر مباشرة بالبيع المتكامل المسؤول؟", ["NOI/T", "S", "Credit %"], 0]]),
    },
    { id: "lec-402", bagId: "bag2", levelId: "bag2-l1", title: "التعامل مع اعتراضات العملاء", trainer: "أ. محمد سالم", durationMin: 60, status: "published", review: "not_required", description: "أساليب عملية للرد على اعتراض السعر والبدائل والتردد." },
    { id: "lec-403", bagId: "bag2", levelId: "bag2-l2", title: "قراءة مؤشرات الأداء وخطة البيع اليومية", trainer: "أ. هبة يوسف", durationMin: 90, status: "published", review: "not_required", description: "تحويل أرقام NOT وAVT وRSP وNOI/T إلى خطة يومية واضحة للفريق." },
    { id: "lec-404", bagId: "bag2", levelId: "bag2-l2", title: "رفع مبيعات قائمة الأصناف المستهدفة (Pushing List)", trainer: "أ. هبة يوسف", durationMin: 60, status: "draft", review: "not_required", description: "كيف يتعرف الفريق على أصناف القائمة ويقترحها في الموقف المناسب." },
    { id: "lec-501", bagId: "bag3", levelId: "bag3-l1", title: "أنواع البشرة والمكونات الفعالة", trainer: "د. ريم حسن", durationMin: 90, status: "published", review: "not_required", description: "مدخل لأنواع البشرة وأشهر المكونات الفعالة المتاحة في السوق المصري." },
    { id: "lec-502", bagId: "bag3", levelId: "bag3-l1", title: "المنظفات والمرطبات وواقيات الشمس", trainer: "د. ريم حسن", durationMin: 75, status: "published", review: "not_required", description: "مقارنة الفئات واختيار المناسب لكل نوع بشرة دون التحيز لعلامة تجارية." },
    { id: "lec-503", bagId: "bag3", levelId: "bag3-l2", title: "بناء روتين العناية واقتراح البدائل", trainer: "د. ريم حسن", durationMin: 90, status: "draft", review: "not_required", description: "خطوات بناء روتين بسيط ومتكامل، وكيف تقترح بديلاً عند عدم توفر المنتج." },
    { id: "lec-601", bagId: "bag4", levelId: "bag4-l1", title: "إدارة مؤشرات أداء الفرع", trainer: "أ. طارق منصور", durationMin: 120, status: "published", review: "not_required", description: "متابعة المؤشرات اليومية والأسبوعية وربطها بخطة عمل الفريق." },
    { id: "lec-602", bagId: "bag4", levelId: "bag4-l2", title: "ضبط الخصومات والمخزون في الفرع", trainer: "أ. طارق منصور", durationMin: 90, status: "draft", review: "not_required", description: "كيف تتابع Discount % وCredit % ونسبة الإلغاء S." },
    { id: "lec-701", bagId: "bag5", levelId: "bag5-l1", title: "تحليل أداء الفروع ومقارنتها", trainer: "أ. خالد عبد العزيز", durationMin: 120, status: "published", review: "not_required", description: "منهجية مقارنة الفروع واكتشاف الفجوات وأولويات التحسين." },
    { id: "lec-702", bagId: "bag5", levelId: "bag5-l2", title: "الزيارة الميدانية الفعالة", trainer: "أ. خالد عبد العزيز", durationMin: 90, status: "draft", review: "not_required", description: "التحضير للزيارة، وما تلاحظه، وكيف تنتهي بخطة متابعة واضحة." },
  ];

  const orderCount: Record<string, number> = {};
  return drafts.map((d, i) => {
    const key = `${d.bagId}:${d.levelId}`;
    orderCount[key] = (orderCount[key] ?? 0) + 1;
    const date = new Date(Date.UTC(2026, 8, 1 + i * 3)).toISOString();
    return {
      description: "",
      objectives: [],
      audience: "",
      durationMin: 60,
      sections: [],
      caseStudy: "",
      videoUrl: "",
      attachments: [],
      references: [],
      status: "draft",
      review: "not_required",
      reviewer: "",
      quiz: null,
      createdAt: date,
      updatedAt: date,
      order: orderCount[key],
      ...d,
    } as Lecture;
  });
}

export function createSeedData(): AcademyData {
  const b = bags();
  const lecs = lectures().map((l) => ({ ...l, audience: l.audience || b.find((x) => x.id === l.bagId)?.audience || "" }));
  return addContractsBag({
    version: 1,
    settings: { name: "الأكاديمية التدريبية", tagline: "لسلسلة صيدليات بلبع", motto: "معرفة .. مهارة .. أداء أعلى" },
    bags: b,
    lectures: lecs,
    kpis: [
      { id: "k-not", label: "NOT", definition: "" },
      { id: "k-avt", label: "AVT", definition: "" },
      { id: "k-rsp", label: "RSP", definition: "متوسط قيمة القطعة" },
      { id: "k-noit", label: "NOI/T", definition: "عدد الأصناف في الفاتورة" },
      { id: "k-disc", label: "Discount %", definition: "" },
      { id: "k-cosmo", label: "Cosmo %", definition: "نسبة مبيعات الكوزمو من إجمالي المبيعات" },
      { id: "k-credit", label: "Credit %", definition: "" },
      { id: "k-s", label: "S", definition: "ملغي" },
      { id: "k-push", label: "Pushing List Sales", definition: "" },
    ],
    trainees: [
      { id: "t1", name: "أحمد محمود", employeeId: "BLB-1042", jobRole: "صيدلي", branch: "فرع المعادي", bagIds: ["bag1", "bag2"], completion: 72 },
      { id: "t2", name: "نورهان سمير", employeeId: "BLB-1088", jobRole: "صيدلانية", branch: "فرع مدينة نصر", bagIds: ["bag1", "bag2"], completion: 45 },
      { id: "t3", name: "ياسمين عادل", employeeId: "BLB-2011", jobRole: "Cosmo Medical", branch: "فرع الزمالك", bagIds: ["bag3"], completion: 88 },
      { id: "t4", name: "محمد عصام", employeeId: "BLB-3005", jobRole: "مدير فرع", branch: "فرع الدقي", bagIds: ["bag4"], completion: 30 },
      { id: "t5", name: "إسراء حمدي", employeeId: "BLB-2034", jobRole: "مشرفة كوزمو", branch: "فرع المهندسين", bagIds: ["bag3", "bag4"], completion: 60 },
      { id: "t6", name: "عمرو الشافعي", employeeId: "BLB-4001", jobRole: "مدير منطقة", branch: "منطقة القاهرة الكبرى", bagIds: ["bag5"], completion: 15 },
      { id: "t7", name: "دينا رأفت", employeeId: "BLB-1120", jobRole: "صيدلانية", branch: "فرع حلوان", bagIds: ["bag1"], completion: 95 },
      { id: "t8", name: "مصطفى جمال", employeeId: "BLB-1133", jobRole: "صيدلي", branch: "فرع شبرا", bagIds: ["bag1", "bag2"], completion: 0 },
    ],
    sessions: [
      { id: "ss1", title: "حالات الجهاز التنفسي الشائعة", date: "2026-11-10T10:00:00.000Z", bagId: "bag1", place: "قاعة التدريب – المقر الرئيسي" },
      { id: "ss2", title: "البيع الاستشاري الفعال", date: "2026-11-15T12:00:00.000Z", bagId: "bag2", place: "أونلاين" },
      { id: "ss3", title: "المكونات الفعالة في العناية بالبشرة", date: "2026-11-22T11:00:00.000Z", bagId: "bag3", place: "فرع الزمالك" },
    ],
    activities: [
      { id: "a1", text: "تم نشر محاضرة «فهم احتياج العميل والبيع الاستشاري»", at: "2026-10-28T09:00:00.000Z" },
      { id: "a2", text: "اعتماد طبي لمحاضرة «تقييم المريض وأخذ التاريخ المرضي والدوائي»", at: "2026-10-25T13:30:00.000Z" },
      { id: "a3", text: "انضمام 3 متدربين جدد لحقيبة الممارسة الصيدلية", at: "2026-10-20T10:15:00.000Z" },
    ],
    users: [
      { id: "u-admin", name: "د. كريم النجعاوي", role: "admin", title: "مدير الأكاديمية", bagIds: [] },
      { id: "u-trainer", name: "أ. محمد سالم", role: "trainer", title: "مدرب المبيعات", bagIds: ["bag2", "bag4"] },
      { id: "u-trainee", name: "أحمد محمود", role: "trainee", title: "صيدلي – فرع المعادي", bagIds: ["bag1", "bag2"] },
    ],
  });
}
