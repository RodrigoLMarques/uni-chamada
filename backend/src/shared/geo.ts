const EARTH_RADIUS_M = 6371000;

export function distanceInMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
