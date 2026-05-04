const EARTH_RADIUS_M = 6_371_000;

export async function hashIp(ip: string, dailySalt: string): Promise<string> {
  const data = new TextEncoder().encode(ip + dailySalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function fuzzCoordinates(
  lat: number,
  lng: number,
  fuzzMeters: number,
): { lat: number; lng: number } {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  // Random bearing 0–2π
  const bearing = ((bytes[0] * 256 + bytes[1]) / 65535) * 2 * Math.PI;
  // Random distance in [fuzzMeters, 2 * fuzzMeters] to guarantee minimum offset
  const distance = fuzzMeters + ((bytes[2] * 256 + bytes[3]) / 65535) * fuzzMeters;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const d = distance / EARTH_RADIUS_M;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing),
  );
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(newLatRad),
    );

  return {
    lat: parseFloat(((newLatRad * 180) / Math.PI).toFixed(6)),
    lng: parseFloat(((newLngRad * 180) / Math.PI).toFixed(6)),
  };
}
