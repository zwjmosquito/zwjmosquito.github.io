#!/usr/bin/env node
// One-time generator: writes src/data/route.json as a densified polyline
// along a list of waypoints. Uses great-circle (spherical linear) interpolation
// so the path follows the Earth's shortest surface path, and unwraps longitudes
// so the polyline stays continuous when it crosses the antimeridian (±180°).

import fs from "node:fs";
import path from "node:path";

// Ordered waypoints. Ferry hops are implied — this is "cyclable in spirit."
const WAYPOINTS = [
  { name: "Seattle",       lat: 47.6062,  lng: -122.3321 },
  { name: "Prince Rupert", lat: 54.3150,  lng: -130.3209 },
  { name: "Juneau",        lat: 58.3019,  lng: -134.4197 },
  { name: "Anchorage",     lat: 61.2181,  lng: -149.9003 },
  { name: "Fairbanks",     lat: 64.8378,  lng: -147.7164 },
  { name: "Nome",          lat: 64.5011,  lng: -165.4064 },
  { name: "Anadyr",        lat: 64.7337,  lng:  177.5103 },
  { name: "Magadan",       lat: 59.5638,  lng:  150.8035 },
  { name: "Yakutsk",       lat: 62.0355,  lng:  129.6755 },
  { name: "Harbin",        lat: 45.8038,  lng:  126.5349 },
  { name: "Beijing",       lat: 39.9042,  lng:  116.4074 },
  { name: "Xian",          lat: 34.3416,  lng:  108.9398 },
  { name: "Chengdu",       lat: 30.5728,  lng:  104.0668 },
  { name: "Dali",          lat: 25.6925,  lng:  100.1619 },
];

const STEP_KM = 50; // densify every ~50 km on the great circle
const R = 6371;

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  // Use shortest-way longitude difference so this doesn't explode across the
  // antimeridian.
  let dLng = toRad(b.lng - a.lng);
  if (dLng > Math.PI) dLng -= 2 * Math.PI;
  if (dLng < -Math.PI) dLng += 2 * Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Spherical linear interpolation between two lat/lng points.
// Returns { lat, lng } with lng in (-180, 180]. Caller unwraps for continuity.
function slerp(a, b, t) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const lng1 = toRad(a.lng);
  const lng2 = toRad(b.lng);

  // Angular distance (haversine).
  let dLng = lng2 - lng1;
  if (dLng > Math.PI) dLng -= 2 * Math.PI;
  if (dLng < -Math.PI) dLng += 2 * Math.PI;
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const d = 2 * Math.asin(Math.sqrt(h));

  if (d < 1e-9) return { lat: a.lat, lng: a.lng };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  // Convert to 3D cartesian (unit sphere), interpolate, convert back.
  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng1 + dLng);
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng1 + dLng);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);
  return { lat: toDeg(lat), lng: toDeg(lng) };
}

// Keep longitudes continuous with the previous point by unwrapping across ±180.
function unwrap(prevLng, curLng) {
  while (curLng - prevLng > 180) curLng -= 360;
  while (curLng - prevLng < -180) curLng += 360;
  return curLng;
}

const densified = [];
let totalKm = 0;
let lastLng = null;

for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const segKm = haversineKm(a, b);
  const steps = Math.max(1, Math.ceil(segKm / STEP_KM));

  for (let s = 0; s <= steps; s++) {
    // Avoid duplicating the join between segments.
    if (i > 0 && s === 0) continue;
    const t = s / steps;
    const p = slerp(a, b, t);
    const lng = lastLng === null ? p.lng : unwrap(lastLng, p.lng);
    densified.push([lng, p.lat]);
    lastLng = lng;
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
