const AREA = new Set([
  "road",
  "residential",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "service",
  "footway",
  "path",
  "track",
  "cycleway",
  "postcode",
  "suburb",
  "neighbourhood",
  "neighborhood",
  "city",
  "town",
  "village",
  "hamlet",
  "county",
  "state",
  "administrative",
  "living_street",
  "pedestrian",
  "locality",
  "municipality",
  "quarter",
  "borough",
  "district",
  "region",
  "country",
]);

export function isAreaResult(...kinds: Array<string | undefined>): boolean {
  return kinds.some((kind) => AREA.has((kind ?? "").toLowerCase()));
}

export function choiceMatchingAddress<T extends { label: string }>(
  address: string,
  choices: T[],
): T | null {
  const number = address.match(/^\s*(\d+[a-z]?)/i)?.[1]?.toLowerCase();
  const words = address
    .toLowerCase()
    .replace(/^\s*\d+[a-z]?/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 3);
  const hits = choices.filter((choice) => {
    const label = choice.label.toLowerCase();
    if (number) {
      const hasNumber = new RegExp(`\\b${number}\\b`).test(label);
      return hasNumber && words.every((word) => label.includes(word));
    }
    return words.some((word) => label.includes(word));
  });
  return hits.length === 1 ? (hits[0] ?? null) : null;
}
