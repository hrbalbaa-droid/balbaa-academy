import type { AcademyData } from "@/lib/types";
import { StorageFullError, type DataProvider } from "./provider";
import { addContractsBag } from "./contracts-bag";

const KEY = "balbaa-academy:data:v1";

export const localProvider: DataProvider = {
  name: "local",
  async load() {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    let data: AcademyData;
    try {
      data = JSON.parse(raw) as AcademyData;
    } catch {
      return null;
    }
    const updated = addContractsBag(data);
    if (updated !== data) await localProvider.save(updated);
    return updated;
  },
  async save(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      throw new StorageFullError();
    }
  },
  async reset() {
    window.localStorage.removeItem(KEY);
  },
};
