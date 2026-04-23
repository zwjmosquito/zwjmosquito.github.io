export function mergeActivities(existing, incoming) {
  const filtered = incoming.filter((a) => a.type === "Ride");
  const byId = new Map();
  for (const a of existing) byId.set(a.id, a);
  for (const a of filtered) byId.set(a.id, a); // incoming overwrites
  return Array.from(byId.values());
}

export function recompute(activities) {
  const total_m = activities.reduce((sum, a) => sum + a.distance_m, 0);
  const total_km = Number((total_m / 1000).toFixed(2));
  const ride_count = activities.length;
  const last_ride_date = activities.length
    ? activities.reduce((max, a) => (a.start_date > max ? a.start_date : max), "1970-01-01")
    : null;
  return { total_distance_m: total_m, total_km, ride_count, last_ride_date };
}
