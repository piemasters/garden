import { useMemo } from "react";
import { daySamples, midsummerSamples, sunAt, sunVector } from "#/domain/sun";

export function useDaylight(latitude: number, longitude: number, month: number, hour: number) {
  const samples = useMemo(() => midsummerSamples(latitude, longitude), [latitude, longitude]);
  const daylight = useMemo(
    () => daySamples(latitude, longitude, month, 15),
    [latitude, longitude, month],
  );
  const sun = useMemo(
    () => sunAt(latitude, longitude, month, hour),
    [latitude, longitude, month, hour],
  );
  const sunArc = useMemo(
    () =>
      daylight
        .filter((sample) => sample.altitude > 5)
        .map((sample) => {
          const vector = sunVector(sample.azimuth, sample.altitude);
          const radius = 18;
          return [vector.x * radius, Math.max(0.5, vector.z * radius), -vector.y * radius] as [
            number,
            number,
            number,
          ];
        }),
    [daylight],
  );
  const shadeSamples = useMemo(() => (sun.altitude > 1 ? [sun] : []), [sun]);
  return { samples, sunArc, shadeSamples, sunUp: sun.altitude > 0 };
}
