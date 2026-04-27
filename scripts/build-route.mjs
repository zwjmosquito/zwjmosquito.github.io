#!/usr/bin/env node
// One-time generator: writes src/data/route.json as a densified polyline
// along a list of waypoints. Uses great-circle (spherical linear) interpolation
// so the path follows the Earth's shortest surface path, and unwraps longitudes
// so the polyline stays continuous when it crosses the antimeridian (±180°).

import fs from "node:fs";
import path from "node:path";

// Ordered waypoints along a real overland corridor, north route:
//   Hwy 99 → Cariboo → Yellowhead → Cassiar Hwy → Alaska Hwy → Glenn/Parks Hwy
//   → Elliott Hwy → Yukon River / Iditarod trail → Bering ferry → Kolyma Hwy
//   → Lena Hwy → Amur Hwy → Heihe river crossing → China G1/G5/G108.
//
// `kind` describes the leg INTO this waypoint:
//   road  — paved or graded road, plausibly bikable
//   trail — winter trail / river route, no road (Iditarod corridor)
//   ferry — water crossing or impassable winter-only zimnik
//   start — the first waypoint (no inbound leg)
const WAYPOINTS = [
  { name: "Seattle, WA",         lat: 47.6062,  lng: -122.3321, kind: "start" },
  { name: "Bellingham, WA",      lat: 48.7519,  lng: -122.4787, kind: "road"  },
  { name: "Vancouver, BC",       lat: 49.2827,  lng: -123.1207, kind: "road"  },
  { name: "Squamish, BC",        lat: 49.7016,  lng: -123.1558, kind: "road"  },
  { name: "Whistler, BC",        lat: 50.1163,  lng: -122.9574, kind: "road"  },
  { name: "Lillooet, BC",        lat: 50.6863,  lng: -121.9356, kind: "road"  },
  { name: "Cache Creek, BC",     lat: 50.8131,  lng: -121.3322, kind: "road"  },
  { name: "100 Mile House, BC",  lat: 51.6450,  lng: -121.2950, kind: "road"  },
  { name: "Williams Lake, BC",   lat: 52.1417,  lng: -122.1417, kind: "road"  },
  { name: "Quesnel, BC",         lat: 52.9784,  lng: -122.4927, kind: "road"  },
  { name: "Prince George, BC",   lat: 53.9171,  lng: -122.7497, kind: "road"  },
  { name: "Vanderhoof, BC",      lat: 54.0144,  lng: -124.0119, kind: "road"  },
  { name: "Smithers, BC",        lat: 54.7804,  lng: -127.1742, kind: "road"  },
  { name: "Kitwanga, BC",        lat: 55.1058,  lng: -128.0500, kind: "road"  },
  { name: "Dease Lake, BC",      lat: 58.4378,  lng: -130.0094, kind: "road"  },
  { name: "Watson Lake, YT",     lat: 60.0631,  lng: -128.7094, kind: "road"  },
  { name: "Whitehorse, YT",      lat: 60.7212,  lng: -135.0568, kind: "road"  },
  { name: "Haines Junction, YT", lat: 60.7522,  lng: -137.5108, kind: "road"  },
  { name: "Beaver Creek, YT",    lat: 62.3833,  lng: -140.8667, kind: "road"  },
  { name: "Tok, AK",             lat: 63.3367,  lng: -142.9856, kind: "road"  },
  { name: "Glennallen, AK",      lat: 62.1108,  lng: -145.5331, kind: "road"  },
  { name: "Palmer, AK",          lat: 61.5994,  lng: -149.1128, kind: "road"  },
  { name: "Anchorage, AK",       lat: 61.2181,  lng: -149.9003, kind: "road"  },
  { name: "Wasilla, AK",         lat: 61.5814,  lng: -149.4394, kind: "road"  },
  { name: "Talkeetna, AK",       lat: 62.3208,  lng: -150.1100, kind: "road"  },
  { name: "Cantwell, AK",        lat: 63.3925,  lng: -148.9461, kind: "road"  },
  { name: "Nenana, AK",          lat: 64.5611,  lng: -149.0928, kind: "road"  },
  { name: "Fairbanks, AK",       lat: 64.8378,  lng: -147.7164, kind: "road"  },
  { name: "Manley Hot Springs",  lat: 65.0000,  lng: -150.6333, kind: "road"  },
  { name: "Tanana, AK",          lat: 65.1711,  lng: -152.0772, kind: "trail" },
  { name: "Galena, AK",          lat: 64.7333,  lng: -156.9333, kind: "trail" },
  { name: "Kaltag, AK",          lat: 64.3231,  lng: -158.7158, kind: "trail" },
  { name: "Unalakleet, AK",      lat: 63.8731,  lng: -160.7922, kind: "trail" },
  { name: "Nome, AK",            lat: 64.5011,  lng: -165.4064, kind: "trail" },
  { name: "Wales, AK",           lat: 65.6094,  lng: -168.0875, kind: "trail" },
  { name: "Lavrentiya, RU",      lat: 65.5833,  lng: -171.0000, kind: "ferry" },
  { name: "Provideniya, RU",     lat: 64.4167,  lng: -173.2333, kind: "ferry" },
  { name: "Anadyr, RU",          lat: 64.7337,  lng:  177.5103, kind: "ferry" },
  { name: "Magadan, RU",         lat: 59.5638,  lng:  150.8035, kind: "ferry" },
  { name: "Susuman, RU",         lat: 62.7847,  lng:  148.1542, kind: "road"  },
  { name: "Ust-Nera, RU",        lat: 64.5667,  lng:  143.2333, kind: "road"  },
  { name: "Khandyga, RU",        lat: 62.6597,  lng:  135.5928, kind: "road"  },
  { name: "Yakutsk, RU",         lat: 62.0355,  lng:  129.6755, kind: "road"  },
  { name: "Aldan, RU",           lat: 58.6047,  lng:  125.3756, kind: "road"  },
  { name: "Tynda, RU",           lat: 55.1547,  lng:  124.7281, kind: "road"  },
  { name: "Skovorodino, RU",     lat: 53.9817,  lng:  123.9425, kind: "road"  },
  { name: "Blagoveshchensk, RU", lat: 50.2906,  lng:  127.5272, kind: "road"  },
  { name: "Heihe, CN",           lat: 50.2422,  lng:  127.5286, kind: "road"  },
  { name: "Qiqihar, CN",         lat: 47.3543,  lng:  123.9180, kind: "road"  },
  { name: "Harbin, CN",          lat: 45.8038,  lng:  126.5349, kind: "road"  },
  { name: "Changchun, CN",       lat: 43.8868,  lng:  125.3245, kind: "road"  },
  { name: "Shenyang, CN",        lat: 41.8057,  lng:  123.4315, kind: "road"  },
  { name: "Beijing, CN",         lat: 39.9042,  lng:  116.4074, kind: "road"  },
  { name: "Shijiazhuang, CN",    lat: 38.0428,  lng:  114.5149, kind: "road"  },
  { name: "Taiyuan, CN",         lat: 37.8706,  lng:  112.5489, kind: "road"  },
  { name: "Xi'an, CN",           lat: 34.3416,  lng:  108.9398, kind: "road"  },
  { name: "Hanzhong, CN",        lat: 33.0678,  lng:  107.0237, kind: "road"  },
  { name: "Guangyuan, CN",       lat: 32.4356,  lng:  105.8439, kind: "road"  },
  { name: "Chengdu, CN",         lat: 30.5728,  lng:  104.0668, kind: "road"  },
  { name: "Ya'an, CN",           lat: 29.9794,  lng:  103.0011, kind: "road"  },
  { name: "Xichang, CN",         lat: 27.8964,  lng:  102.2647, kind: "road"  },
  { name: "Panzhihua, CN",       lat: 26.5847,  lng:  101.7186, kind: "road"  },
  { name: "Dali, CN",            lat: 25.6925,  lng:  100.1619, kind: "road"  },
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
const segments = [];
let totalKm = 0;
let lastLng = null;

for (let i = 0; i < WAYPOINTS.length - 1; i++) {
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[i + 1];
  const segKm = haversineKm(a, b);
  const steps = Math.max(1, Math.ceil(segKm / STEP_KM));
  // Inclusive index of the join point at start of this segment so the dashed
  // overlay visually butts up against the previous segment.
  const segStart = i === 0 ? 0 : densified.length - 1;

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
  segments.push({
    kind: b.kind,
    from: a.name,
    to: b.name,
    start: segStart,
    end: densified.length - 1,
    km: Number(segKm.toFixed(2)),
  });
}

const geojson = {
  type: "Feature",
  properties: {
    waypoints: WAYPOINTS,
    segments,
    total_km: Number(totalKm.toFixed(2)),
    generated_at: new Date().toISOString(),
  },
  geometry: { type: "LineString", coordinates: densified },
};

const outPath = path.resolve("src/data/route.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${densified.length} points, total ${totalKm.toFixed(0)} km to ${outPath}`);
