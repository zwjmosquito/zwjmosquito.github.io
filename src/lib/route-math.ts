export interface LngLat {
  lat: number;
  lng: number;
}
export interface Position extends LngLat {
  arrived: boolean;
}

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Given a route polyline as [[lng,lat], ...] and a distance in km,
 * returns the interpolated position along the polyline.
 */
export function positionAlongRoute(
  coords: [number, number][],
  targetKm: number
): Position {
  if (!coords.length) throw new Error("empty route");
  if (targetKm <= 0) {
    const [lng, lat] = coords[0];
    return { lat, lng, arrived: false };
  }

  let remaining = targetKm;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const segKm = haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    if (remaining <= segKm) {
      const t = segKm === 0 ? 0 : remaining / segKm;
      return {
        lat: lat1 + (lat2 - lat1) * t,
        lng: lng1 + (lng2 - lng1) * t,
        arrived: false,
      };
    }
    remaining -= segKm;
  }

  const [lng, lat] = coords[coords.length - 1];
  return { lat, lng, arrived: true };
}
