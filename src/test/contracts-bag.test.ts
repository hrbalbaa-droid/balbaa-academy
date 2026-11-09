import { beforeEach, describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/data/seed";
import { addContractsBag } from "@/lib/data/contracts-bag";
import { localProvider } from "@/lib/data/local-provider";

describe("Contracts dispensing bag", () => {
  beforeEach(() => window.localStorage.clear());

  it("includes the requested bag for new pharmacists and assistants in fresh data", () => {
    const data = createSeedData();
    const bag = data.bags.find((item) => item.title === "شروط صرف التعاقدات");
    expect(bag?.audience).toBe("الصيادلة الجدد والمساعدون");
    expect(bag?.levels).toHaveLength(2);
    expect(data.lectures.filter((lecture) => lecture.bagId === bag?.id)).toHaveLength(2);
  });

  it("adds the bag to saved data without replacing existing edits", async () => {
    const data = createSeedData();
    data.bags = data.bags.filter((bag) => bag.id !== "bag6");
    data.lectures = data.lectures.filter((lecture) => lecture.bagId !== "bag6");
    delete data.appliedUpdates;
    data.settings.name = "أكاديمية مخصصة";
    const firstBag = data.bags[0];
    if (!firstBag) throw new Error("Expected an existing bag");
    firstBag.description = "وصف محفوظ";
    await localProvider.save(data);
    const updated = await localProvider.load();
    expect(updated?.bags).toHaveLength(data.bags.length + 1);
    expect(updated?.settings.name).toBe("أكاديمية مخصصة");
    expect(updated?.bags[0]?.description).toBe("وصف محفوظ");
    expect(updated?.lectures.slice(0, data.lectures.length)).toEqual(data.lectures);
    expect(await localProvider.load()).toEqual(updated);
  });

  it("does not recreate a bag deleted after the update", () => {
    const data = createSeedData();
    data.bags = data.bags.filter((bag) => bag.id !== "bag6");
    data.lectures = data.lectures.filter((lecture) => lecture.bagId !== "bag6");
    expect(addContractsBag(data)).toBe(data);
    expect(addContractsBag(data).bags.some((bag) => bag.id === "bag6")).toBe(false);
  });

  it("keeps introductory content unpublished until academy review", () => {
    const lectures = createSeedData().lectures.filter((lecture) => lecture.bagId === "bag6");
    expect(lectures.map((lecture) => lecture.status)).toEqual(["draft", "draft"]);
  });
});