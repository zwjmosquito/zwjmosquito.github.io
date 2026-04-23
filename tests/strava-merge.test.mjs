import { describe, it, expect } from "vitest";
import { mergeActivities, recompute } from "../scripts/lib/strava-merge.mjs";

describe("mergeActivities", () => {
  it("appends new activities", () => {
    const existing = [
      { id: 1, distance_m: 10000, start_date: "2026-04-10T00:00:00Z", type: "Ride" },
    ];
    const incoming = [
      { id: 2, distance_m: 5000, start_date: "2026-04-11T00:00:00Z", type: "Ride" },
    ];
    const merged = mergeActivities(existing, incoming);
    expect(merged).toHaveLength(2);
  });

  it("deduplicates by id", () => {
    const existing = [
      { id: 1, distance_m: 10000, start_date: "2026-04-10T00:00:00Z", type: "Ride" },
    ];
    const incoming = [
      { id: 1, distance_m: 12000, start_date: "2026-04-10T00:00:00Z", type: "Ride" },
    ];
    const merged = mergeActivities(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].distance_m).toBe(12000); // incoming wins on conflict
  });

  it("filters out non-Ride activity types", () => {
    const incoming = [
      { id: 1, distance_m: 10000, start_date: "2026-04-10T00:00:00Z", type: "Ride" },
      { id: 2, distance_m: 20000, start_date: "2026-04-10T00:00:00Z", type: "VirtualRide" },
      { id: 3, distance_m: 30000, start_date: "2026-04-10T00:00:00Z", type: "Run" },
    ];
    const merged = mergeActivities([], incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(1);
  });
});

describe("recompute", () => {
  it("computes total_km from distance_m", () => {
    const activities = [
      { id: 1, distance_m: 10000, start_date: "2026-04-10T00:00:00Z", type: "Ride" },
      { id: 2, distance_m: 15500, start_date: "2026-04-11T00:00:00Z", type: "Ride" },
    ];
    const result = recompute(activities);
    expect(result.total_km).toBe(25.5);
    expect(result.ride_count).toBe(2);
    expect(result.last_ride_date).toBe("2026-04-11T00:00:00Z");
  });

  it("handles empty activities list", () => {
    const result = recompute([]);
    expect(result.total_km).toBe(0);
    expect(result.ride_count).toBe(0);
    expect(result.last_ride_date).toBeNull();
  });
});
