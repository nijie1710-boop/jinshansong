export const LOCATION_CACHE_KEY = "jss_home_location";

export type CachedLocation = {
  city?: string;
  district?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
};

function validCoordinate(value: unknown, maxAbs: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= maxAbs ? parsed : undefined;
}

export function readCachedLocation() {
  const cached = uni.getStorageSync(LOCATION_CACHE_KEY);
  if (!cached || typeof cached !== "object") {
    return null;
  }

  return cached as CachedLocation;
}

export function writeCachedLocation(location: CachedLocation) {
  uni.setStorageSync(LOCATION_CACHE_KEY, location);
}

export function cachedLocationQuery() {
  const cached = readCachedLocation();
  const latitude = validCoordinate(cached?.latitude, 90);
  const longitude = validCoordinate(cached?.longitude, 180);

  if (latitude === undefined || longitude === undefined) {
    return {};
  }

  return { latitude, longitude };
}
