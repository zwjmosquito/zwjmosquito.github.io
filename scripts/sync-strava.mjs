#!/usr/bin/env node
// Reads STRAVA_* env vars, fetches new activities since last sync,
// merges into src/data/strava.json, writes back.

import fs from "node:fs";
import path from "node:path";
import { mergeActivities, recompute } from "./lib/strava-merge.mjs";

const START_DATE = "2026-04-10T00:00:00Z";
const DATA_PATH = "src/data/strava.json";

async function refreshAccessToken(id, secret, refresh) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  const body = await res.json();
  return body.access_token;
}

async function fetchActivities(token, afterIso) {
  const after = Math.floor(new Date(afterIso).getTime() / 1000);
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`activities fetch failed: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return all.map((a) => ({
    id: a.id,
    start_date: a.start_date,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    name: a.name,
    type: a.type,
    map_polyline: a.map?.summary_polyline ?? null,
  }));
}

async function main() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    console.error("Missing STRAVA_* env vars");
    process.exit(1);
  }

  let existing = { activities: [], last_synced_ts: START_DATE };
  if (fs.existsSync(DATA_PATH)) {
    existing = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  }

  const token = await refreshAccessToken(STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN);

  // If we have no activities yet, always start from START_DATE — otherwise
  // resume incrementally from the last successful sync timestamp.
  const after = (existing.activities?.length ?? 0) > 0
    ? (existing.last_synced_ts ?? START_DATE)
    : START_DATE;

  let incoming;
  try {
    incoming = await fetchActivities(token, after);
  } catch (e) {
    console.warn("Strava fetch failed; keeping cached data:", e.message);
    process.exit(0);
  }

  const merged = mergeActivities(existing.activities ?? [], incoming);
  const totals = recompute(merged);

  const output = {
    ...totals,
    last_synced_ts: new Date().toISOString(),
    activities: merged.sort((a, b) => b.start_date.localeCompare(a.start_date)),
  };

  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`Synced ${incoming.length} activities. Total: ${totals.total_km} km across ${totals.ride_count} rides.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
