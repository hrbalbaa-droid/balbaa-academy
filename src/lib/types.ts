// Domain model for the academy. Shared by every data provider (local now, online later).

export type Role = "admin" | "trainer" | "trainee";
export type LectureStatus = "draft" | "published" | "archived";
export type ReviewStatus = "not_required" | "pending" | "approved";

export interface Level {
  id: string;
  name: string;
}

export interface Bag {
  id: string;
  number: number;
  title: string;
  description: string;
  audience: string;
  objectives: string[];
  levels: Level[];
  cover: string; // preset key ("preset:practice"), an uploaded image (data URL), or a signed storage URL
  /** Storage object path in the course bucket (when the cover is hosted). */
  thumbnailPath?: string;
  medical: boolean; // lectures need pharmacist approval before publishing
  suggestedHours: string;
  priority: "first" | "second";
  kpis: string[]; // ids of related KPIs
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  kind: "pdf" | "ppt" | "image" | "video" | "link" | "other";
  url: string; // external link or stored file (data URL)
  size?: number;
}

export interface ContentSection {
  id: string;
  heading: string;
  body: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "tf";
  text: string;
  options: string[];
  correct: number;
}

export interface Lecture {
  id: string;
  bagId: string;
  levelId: string;
  order: number;
  title: string;
  description: string;
  objectives: string[];
  audience: string;
  durationMin: number;
  trainer: string;
  sections: ContentSection[];
  caseStudy: string;
  videoUrl: string; // external URL, or a short-lived signed URL for a storage object
  /** Storage object path in the course bucket (when the video is hosted). */
  videoPath?: string;
  attachments: Attachment[];
  references: string[];
  status: LectureStatus;
  review: ReviewStatus;
  reviewer: string;
  quiz: { passScore: number; questions: QuizQuestion[] } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Kpi {
  id: string;
  label: string;
  definition: string; // empty = not yet defined officially
}

export interface Trainee {
  id: string;
  name: string;
  employeeId: string;
  jobRole: string;
  branch: string;
  bagIds: string[];
  completion: number; // 0-100
}

export interface Session {
  id: string;
  title: string;
  date: string;
  bagId: string;
  place: string;
}

export interface Activity {
  id: string;
  text: string;
  at: string;
}

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  title: string;
  bagIds: string[]; // assigned bags (trainer / trainee)
}

export interface AcademySettings {
  name: string;
  tagline: string;
  motto: string;
}

export interface AcademyData {
  version: 1;
  appliedUpdates?: string[];
  settings: AcademySettings;
  bags: Bag[];
  lectures: Lecture[];
  kpis: Kpi[];
  trainees: Trainee[];
  sessions: Session[];
  activities: Activity[];
  users: DemoUser[];
}
