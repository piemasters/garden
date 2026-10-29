import { useMemo } from "react";
import { daySamples, midsummerSamples, sunVector } from "#/domain/sun";

export function useDaylight(latitude: number, longitude: number, month: number) {
  const samples = useMemo(() => midsummerSamples(latitude, longitude), [latitude, longitude]);
  const daylight = useMemo(
    () => daySamples(latitude, longitude, month, 15),
    [latitude, longitude, month],
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
  const shadeSamples = useMemo(
    () => daylight.filter((sample, index) => sample.altitude > 8 && index % 2 === 0),
    [daylight],
  );
  return { samples, sunArc, shadeSamples };
}
