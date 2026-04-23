#!/usr/bin/env node
// One-time generator: writes src/data/route.geojson by densifying a
// list of waypoints (straight-line interpolation between each pair).
// Distance is haversine-based.

import fs from "node:fs";
import path from "node:path";

// Ordered waypoints: Seattle → Anchorage → Nome → Anadyr → Magadan
// → Harbin → Beijing → Xi'an → Chengdu → Dali.
// Edit these to refine the route's "shape" — ferry-hops are implied.
const WAYPOINTS = [
  { name: "Seattle",   lat: 47.6062,  lng: -122.3321 },
  { name: "Anchorage", lat: 61.2181,  lng: -149.9003 },
  { name: "Nome",      lat: 64.5011,  lng: -165.4064 },
  { name: "Anadyr",    lat: 64.7337,  lng:  177.5103 },
  { name: "Magadan",   lat: 59.5638,  lng:  150.8035 },
  { name: "Harbin",    lat: 45.8038,  lng:  126.5349 },
  { name: "Beijing",   lat: 39.9042,  lng:  116.4074 },
  { name: "Xian",      lat: 34.3416,  lng:  108.9398 },
  { name: "Chengdu",   lat: 30.5728,  lng:  104.0668 },
  { name: "Dali",      lat: 25.6925,  lng:  100.1619 },
];

const STEP_KM = 25; // densify every 25 km

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function interpolate(a, b, t) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

const densified = [];
let totalKm = 0;
for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
  const segKm = haversineKm(a, b);
  const steps = Math.max(1, Math.ceil(segKm / STEP_KM));
  for (let s = 0; s <= steps; s++) {
    // avoid duplicating the join between segments
    if (i > 0 && s === 0) continue;
    const t = s / steps;
    const p = interpolate(a, b, t);
    densified.push([p.lng, p.lat]);
  }
  totalKm += segKm;
}

const geojson = {
  type: "Feature",
  properties: {
    waypoints: WAYPOINTS,
    total_km: Number(totalKm.toFixed(2)),
    generated_at: new Date().toISOString(),
  },
  geometry: { type: "LineString", coordinates: densified },
};

const outPath = path.resolve("src/data/route.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${densified.length} points, total ${totalKm.toFixed(0)} km to ${outPath}`);
