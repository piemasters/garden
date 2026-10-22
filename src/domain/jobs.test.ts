import { describe, expect, it } from "vite-plus/test";
import { buildTimeline, formatJobDate, isColdRegion, scheduleTask } from "./jobs";
import { PLANTS } from "./plants";
import type { PlantTask } from "./types";

const spring: PlantTask = {
  month: 2,
  day: 20,
  shift: "spring",
  title: "Sow",
  detail: "Sow outdoors",
};

describe("job timeline", () => {
  it("treats Scotland, the north and high latitudes as later springs", () => {
    expect(isColdRegion("Scotland", "Scotland", 56)).toBe(true);
    expect(isColdRegion("England", "North West", 53.8)).toBe(true);
    expect(isColdRegion("England", "Yorkshire and The Humber", 53.8)).toBe(true);
    expect(isColdRegion("England", "London", 51.5)).toBe(false);
  });

  it("moves spring jobs later and autumn jobs earlier in a cold region", () => {
    expect(scheduleTask(spring, true)).toEqual({ month: 3, day: 3 });
    expect(scheduleTask({ ...spring, month: 8, day: 10, shift: "autumn" }, true)).toEqual({
      month: 7,
      day: 27,
    });
    expect(scheduleTask(spring, false)).toEqual({ month: 2, day: 20 });
  });

  it("groups placed plants by the shifted month and keeps one entry per plant", () => {
    const tulip = PLANTS.find((plant) => plant.id === "tulipa-olympic-flame");
    expect(tulip).toBeDefined();
    const jobs = buildTimeline(
      PLANTS,
      [{ plantId: "tulipa-olympic-flame" }, { plantId: "tulipa-olympic-flame" }],
      { country: "Scotland", region: "Scotland", latitude: 56 },
    );
    const planting = jobs.find((job) => job.title === "Plant bulbs");
    expect(planting?.month).toBe(9);
    expect(planting?.day).toBe(1);
    expect(jobs.filter((job) => job.plantId === "tulipa-olympic-flame")).toHaveLength(
      tulip?.jobs.length ?? 0,
    );
    expect(formatJobDate(9, 1)).toBe("1 October");
  });
});
