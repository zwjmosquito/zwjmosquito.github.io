#!/usr/bin/env node
// One-time helper: walks through Strava's OAuth flow locally.
// Usage:
//   STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=... node scripts/auth-strava.mjs
// Prints a refresh_token you can store in GitHub Actions secrets.

import http from "node:http";
import { exec } from "node:child_process";

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in env");
  process.exit(1);
}

const REDIRECT = "http://localhost:8787/callback";
const SCOPE = "read,activity:read_all";

const authUrl =
  `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
  `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&approval_prompt=force&scope=${encodeURIComponent(SCOPE)}`;

console.log("Opening browser for Strava authorization...");
console.log("If the browser does not open, visit manually:", authUrl);
exec(`open "${authUrl}"`); // macOS

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end("not found");
    return;
  }
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("missing code");
    return;
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  console.log("\n✅ Strava tokens:");
  console.log(JSON.stringify({ refresh_token: tokens.refresh_token, athlete_id: tokens.athlete?.id }, null, 2));
  console.log("\nStore refresh_token in GitHub Actions secret: STRAVA_REFRESH_TOKEN");

  res.writeHead(200, { "content-type": "text/html" }).end(
    "<h2>Done. Copy the refresh_token from the terminal.</h2>"
  );
  server.close();
  process.exit(0);
});

server.listen(8787, () => console.log("Listening on http://localhost:8787"));
