import { describe, it, expect } from "vitest";
import { positionAlongRoute, haversineKm } from "../src/lib/route-math";

describe("haversineKm", () => {
  it("computes known short distance", () => {
    // Seattle → Vancouver BC ≈ 195 km
    const d = haversineKm({ lat: 47.6062, lng: -122.3321 }, { lat: 49.2827, lng: -123.1207 });
    expect(d).toBeGreaterThan(190);
    expect(d).toBeLessThan(210);
  });
});

describe("positionAlongRoute", () => {
  const route: [number, number][] = [
    [-122.3321, 47.6062], // Seattle
    [-123.1207, 49.2827], // Vancouver (~195 km)
    [-123.9, 49.8],       // somewhere further (~100 km more)
  ];

  it("returns start point for 0 km", () => {
    const p = positionAlongRoute(route, 0);
    expect(p.lat).toBeCloseTo(47.6062, 3);
    expect(p.lng).toBeCloseTo(-122.3321, 3);
    expect(p.arrived).toBe(false);
  });

  it("returns end point when km >= total", () => {
    const p = positionAlongRoute(route, 100000);
    expect(p.lat).toBeCloseTo(49.8, 1);
    expect(p.arrived).toBe(true);
  });

  it("interpolates between waypoints", () => {
    const p = positionAlongRoute(route, 97.5);
    expect(p.lat).toBeGreaterThan(47.6);
    expect(p.lat).toBeLessThan(49.3);
    expect(p.arrived).toBe(false);
  });

  it("lands on a waypoint when km equals a cumulative boundary", () => {
    const total01 = haversineKm({ lat: 47.6062, lng: -122.3321 }, { lat: 49.2827, lng: -123.1207 });
    const p = positionAlongRoute(route, total01);
    expect(p.lat).toBeCloseTo(49.2827, 2);
    expect(p.lng).toBeCloseTo(-123.1207, 2);
  });
});
