import type { AcademyData } from "@/lib/types";

/**
 * Data provider contract. The UI never talks to storage directly — it goes
 * through the store, which goes through one of these providers.
 * Stage 1 uses the local (browser) provider; Stage 2 swaps in the online one.
 */
export interface DataProvider {
  readonly name: "local" | "online";
  load(): Promise<AcademyData | null>;
  save(data: AcademyData): Promise<void>;
  reset(): Promise<void>;
}

export class StorageFullError extends Error {
  constructor() {
    super("STORAGE_FULL");
  }
}
