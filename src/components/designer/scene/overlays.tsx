import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { centroid, lineEnds, scaleLength } from "#/domain/geometry";
import { useUnits } from "#/lib/units";
import type { Point, ShadeBlock } from "#/domain/types";
import type { SceneProps } from "./types";
import { groundHeight } from "./space";

export function DraftLine({
  points,
  closed,
  slope,
}: {
  points: Point[];
  closed: boolean;
  slope: { east: number; north: number } | null;
}) {
  if (points.length < 2) return null;
  const first = points[0];
  const line = closed && first ? [...points, first] : points;
  return (
    <Line
      points={line.map(
        (point) =>
          [point.x, groundHeight(slope, point.x, point.y) + 0.12, -point.y] as [
            number,
            number,
            number,
          ],
      )}
      color="#1e4632"
      lineWidth={2}
    />
  );
}

/** A fence or hedge is only a few centimetres wide, so the drag is drawn as a stroke. */
export function LineDraft({
  block,
  slope,
}: {
  block: ShadeBlock;
  slope: { east: number; north: number } | null;
}) {
  const [start, end] = lineEnds(block);
  const points = [
    [start.x, groundHeight(slope, start.x, start.y) + 0.3, -start.y],
    [end.x, groundHeight(slope, end.x, end.y) + 0.3, -end.y],
  ] as [number, number, number][];
  return (
    <group>
      <Line points={points} color="#ffffff" lineWidth={9} raycast={() => null} />
      <Line points={points} color="#1c2822" lineWidth={4} raycast={() => null} />
    </group>
  );
}

export function HandleTracker({
  points,
  ends,
  onSpots,
  pointerRef,
}: {
  points: Point[] | null;
  ends: SceneProps["handleEnds"];
  onSpots: SceneProps["onHandleSpots"];
  pointerRef: SceneProps["pointerRef"];
}) {
  const { camera, gl, size } = useThree();
  const last = useRef("");
  useEffect(() => {
    pointerRef.current = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = new THREE.Vector3();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x, y: -hit.z };
    };
  }, [camera, gl, pointerRef]);
  useFrame(() => {
    if (!points) {
      if (last.current !== "") {
        last.current = "";
        onSpots(null);
      }
      return;
    }
    const project = (point: Point) => {
      const projected = new THREE.Vector3(point.x, 0, -point.y).project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
      };
    };
    const center = project(centroid(points));
    // Keep Turn and Size a fixed distance apart on screen. Following the
    // corners makes them jump and overlap while the shape turns or grows.
    const gap = 72;
    const margin = 36;
    const [firstEnd, secondEnd] = ends ?? [];
    const endSpots =
      firstEnd && secondEnd
        ? ([project(firstEnd), project(secondEnd)] as [
            { x: number; y: number },
            { x: number; y: number },
          ])
        : undefined;
    const next = {
      center,
      turn: {
        x: center.x,
        y: center.y - gap >= margin ? center.y - gap : center.y + gap,
      },
      resize: {
        x: center.x + gap <= size.width - margin ? center.x + gap : center.x - gap,
        y: center.y,
      },
      ...(endSpots ? { ends: endSpots } : {}),
    };
    const endKey = endSpots
      ? endSpots.map((spot) => `${Math.round(spot.x)},${Math.round(spot.y)}`).join(":")
      : "";
    const key = `${Math.round(next.turn.x)},${Math.round(next.turn.y)},${Math.round(next.resize.x)},${Math.round(next.resize.y)},${endKey}`;
    if (key === last.current) return;
    last.current = key;
    onSpots(next);
  });
  return null;
}

export function NameTracker({
  beds,
  slope,
  onLabels,
}: {
  beds: SceneProps["bedNames"];
  slope: { east: number; north: number } | null;
  onLabels: SceneProps["onBedLabels"];
}) {
  const { camera, size } = useThree();
  const last = useRef("");
  useFrame(() => {
    if (!beds || beds.length === 0) {
      if (last.current !== "") {
        last.current = "";
        onLabels([]);
      }
      return;
    }
    const labels = beds.map((bed) => {
      const centre = centroid(bed.points);
      const projected = new THREE.Vector3(
        centre.x,
        groundHeight(slope, centre.x, centre.y),
        -centre.y,
      ).project(camera);
      return {
        id: bed.id,
        name: bed.name,
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
      };
    });
    const key = labels
      .map((label) => `${label.id}:${label.name}:${Math.round(label.x)},${Math.round(label.y)}`)
      .join("|");
    if (key === last.current) return;
    last.current = key;
    onLabels(labels);
  });
  return null;
}

export function MeasureLabel({
  text,
  at,
  slope,
}: {
  text: string;
  at: Point;
  slope: { east: number; north: number } | null;
}) {
  return (
    <Html
      position={[at.x, groundHeight(slope, at.x, at.y) + 0.4, -at.y]}
      center
      zIndexRange={[30, 0]}
      style={{ pointerEvents: "none" }}
    >
      <span className="rounded-full bg-ink px-2 py-1 text-xs whitespace-nowrap text-paper">
        {text}
      </span>
    </Html>
  );
}

export function PlanScale({ onScale }: { onScale?: (metres: number, pixels: number) => void }) {
  const { camera, size } = useThree();
  const { unit } = useUnits();
  const last = useRef("");
  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera) || !onScale) return;
    const worldWidth = (camera.right - camera.left) / camera.zoom;
    if (!Number.isFinite(worldWidth) || worldWidth <= 0) return;
    const metres = scaleLength(worldWidth, unit);
    const pixels = (metres / worldWidth) * size.width;
    const key = `${metres}:${Math.round(pixels)}`;
    if (key === last.current) return;
    last.current = key;
    onScale(metres, pixels);
  });
  return null;
}

export function GroundScale({ metres }: { metres: number }) {
  const { unit, length: lengthLabel } = useUnits();
  const metresLong = unit === "ft" ? 10 * 0.3048 : metres >= 40 ? 10 : 5;
  const x = -metres / 2 + 1.5;
  const z = metres / 2 - 1.6;
  return (
    <group position={[x, 0.2, z]}>
      <Line
        points={[
          [0, 0, 0],
          [metresLong, 0, 0],
        ]}
        color="#1c2822"
        lineWidth={2}
      />
      <Html position={[metresLong / 2, 0, -0.8]} center style={{ pointerEvents: "none" }}>
        <span className="rounded bg-paper/90 px-1.5 py-0.5 text-xs text-ink">
          {lengthLabel(metresLong)}
        </span>
      </Html>
    </group>
  );
}
