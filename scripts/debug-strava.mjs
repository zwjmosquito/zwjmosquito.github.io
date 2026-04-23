#!/usr/bin/env node
// Debug helper: dumps OAuth scope + first 10 recent activities (no filters)
// so we can diagnose why sync-strava.mjs is returning 0 rides.
//
// Usage:
//   STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=... STRAVA_REFRESH_TOKEN=... \
//     node scripts/debug-strava.mjs

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
  console.error("Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN");
  process.exit(1);
}

// Refresh token
const tokRes = await fetch("https://www.strava.com/oauth/token", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: STRAVA_REFRESH_TOKEN,
  }),
});
console.log("[1] Token refresh:", tokRes.status);
const tok = await tokRes.json();
if (!tokRes.ok) {
  console.error("Token body:", tok);
  process.exit(1);
}
console.log("    Granted scope :", tok.scope || "(not returned)");
console.log("    Token expires :", new Date((tok.expires_at || 0) * 1000).toISOString());

// Verify athlete endpoint (requires read scope)
const athRes = await fetch("https://www.strava.com/api/v3/athlete", {
  headers: { Authorization: `Bearer ${tok.access_token}` },
});
console.log("\n[2] /athlete endpoint:", athRes.status);
if (athRes.ok) {
  const ath = await athRes.json();
  console.log("    Athlete:", ath.firstname, ath.lastname, "(id:", ath.id + ")");
} else {
  console.error("    Error body:", await athRes.text());
}

// Fetch first 10 activities (unfiltered — all types, all dates)
const actRes = await fetch(
  "https://www.strava.com/api/v3/athlete/activities?per_page=10",
  { headers: { Authorization: `Bearer ${tok.access_token}` } }
);
console.log("\n[3] /athlete/activities:", actRes.status);
if (!actRes.ok) {
  console.error("    Error body:", await actRes.text());
  console.error("    (401 = bad token. 403 = missing scope 'activity:read_all'.)");
  process.exit(1);
}
const acts = await actRes.json();
console.log("    Got", acts.length, "recent activities (unfiltered):");
if (acts.length === 0) {
  console.log("    (account has no visible activities — check privacy / scope)");
}
for (const a of acts) {
  console.log(
    `    ${a.start_date}  ${String(a.type).padEnd(22)}  ${(a.distance / 1000).toFixed(1).padStart(6)} km  ${a.name}`
  );
}

// Count by type
const byType = {};
for (const a of acts) byType[a.type] = (byType[a.type] || 0) + 1;
if (Object.keys(byType).length) {
  console.log("\n[4] Types seen in last 10 activities:");
  for (const [t, n] of Object.entries(byType)) console.log(`    ${t}: ${n}`);
}
