import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SURFACE_COLOR, bedSurface } from "#/domain/surface";
import type { Bed, Point } from "#/domain/types";
import type { SceneProps } from "./types";
import { counterClockwise, fromWorld, groundHeight, layOnSlope } from "./space";
import { SURFACE_ROUGHNESS, surfaceTexture } from "./textures";

export const RAISED_BED_M = 0.45;
export const RAISED_BOARD_M = 0.08;
/** How far the soil sits below the top of the boards. */
export const RAISED_LIP_M = 0.1;

export function BedMesh({
  bed,
  slope,
  raised,
  selected,
  interactive,
  onSurface,
  onMove,
}: {
  bed: Bed;
  slope: { east: number; north: number } | null;
  raised: boolean;
  selected: boolean;
  interactive: boolean;
  onSurface: SceneProps["onSurface"];
  onMove?: SceneProps["onMoveBed"];
}) {
  const { camera, gl } = useThree();
  const geometry = useMemo(() => {
    const outline = raised ? insetRing(bed.points, RAISED_BOARD_M) : bed.points;
    const shape = new THREE.Shape();
    outline.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();
    const next = new THREE.ShapeGeometry(shape);
    const position = next.getAttribute("position");
    if (position instanceof THREE.BufferAttribute) {
      const uv = new Float32Array(position.count * 2);
      for (let index = 0; index < position.count; index += 1) {
        uv[index * 2] = position.getX(index);
        uv[index * 2 + 1] = position.getY(index);
      }
      next.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    }
    layOnSlope(next, slope);
    return next;
  }, [bed.points, slope, raised]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const surface = bedSurface(bed.surface);
  const map = useMemo(() => (surface ? surfaceTexture(surface, 1) : null), [surface]);
  useEffect(() => () => map?.dispose(), [map]);
  const color = surface ? bedFill(SURFACE_COLOR[surface], selected) : bedFill(bed.color, selected);
  const walls = useMemo(
    () => (raised ? raisedWalls(bed.points, slope) : null),
    [raised, bed.points, slope],
  );
  useEffect(() => () => walls?.dispose(), [walls]);
  return (
    <group>
      {walls ? (
        <mesh geometry={walls} raycast={() => null}>
          <meshStandardMaterial color="#8d5b3c" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, raised ? RAISED_BED_M - RAISED_LIP_M : 0.04, 0]}
        raycast={interactive ? undefined : () => null}
        onPointerDown={(event) => {
          event.stopPropagation();
          const point = fromWorld(event.point);
          if (!onMove) {
            onSurface(point, "down");
            return;
          }
          onMove(point, "down");
          const read = (native: PointerEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            const x = ((native.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((native.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            const hit = new THREE.Vector3();
            if (
              !raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)
            ) {
              return null;
            }
            return { x: hit.x, y: -hit.z };
          };
          const move = (native: PointerEvent) => {
            const next = read(native);
            if (next) onMove(next, "move");
          };
          const up = (native: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            const next = read(native);
            if (next) onMove(next, "up");
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
      >
        <meshStandardMaterial
          key={surface ?? "colour"}
          color={color}
          map={map}
          roughness={surface ? SURFACE_ROUGHNESS[surface] : 1}
        />
      </mesh>
    </group>
  );
}

/** Selected beds stay the chosen colour, lightened so the selection is still visible. */
function bedFill(color: string | undefined, selected: boolean): string {
  const base = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#a67c52";
  if (!selected) return base;
  return `#${new THREE.Color(base).lerp(new THREE.Color("#fff8ee"), 0.32).getHexString()}`;
}

/** Timber sides around a bed. The top follows the ground so the boards stay a fixed height. */
function raisedWalls(points: Point[], slope: { east: number; north: number } | null) {
  const ring = counterClockwise(points);
  const positions: number[] = [];
  const push = (...corners: Array<readonly [number, number, number]>) => {
    const [a, b, c, d] = corners;
    if (!a || !b || !c || !d) return;
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if (!start || !end) continue;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const inset = {
      x: (-dy / length) * RAISED_BOARD_M,
      y: (dx / length) * RAISED_BOARD_M,
    };
    const innerStart = { x: start.x + inset.x, y: start.y + inset.y };
    const innerEnd = { x: end.x + inset.x, y: end.y + inset.y };
    const at = (point: Point, up: number): readonly [number, number, number] => [
      point.x,
      groundHeight(slope, point.x, point.y) + up,
      -point.y,
    ];
    const outerBaseStart = at(start, 0);
    const outerBaseEnd = at(end, 0);
    const outerTopStart = at(start, RAISED_BED_M);
    const outerTopEnd = at(end, RAISED_BED_M);
    const innerBaseStart = at(innerStart, 0);
    const innerBaseEnd = at(innerEnd, 0);
    const innerTopStart = at(innerStart, RAISED_BED_M);
    const innerTopEnd = at(innerEnd, RAISED_BED_M);
    push(outerBaseStart, outerBaseEnd, outerTopEnd, outerTopStart);
    push(innerBaseEnd, innerBaseStart, innerTopStart, innerTopEnd);
    push(outerTopStart, outerTopEnd, innerTopEnd, innerTopStart);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Pull a ring inward so the soil sits inside the boards. */
function insetRing(points: Point[], distance: number): Point[] {
  const ring = counterClockwise(points);
  if (ring.length < 3) return points;
  const edges = ring.map((start, index) => {
    const end = ring[(index + 1) % ring.length];
    return end ? offsetEdge(start, end, distance) : null;
  });
  const next: Point[] = [];
  for (let index = 0; index < ring.length; index += 1) {
    const previous = edges[(index - 1 + ring.length) % ring.length];
    const current = edges[index];
    const vertex = ring[index];
    if (!previous || !current || !vertex) continue;
    next.push(lineIntersect(previous[0], previous[1], current[0], current[1]) ?? vertex);
  }
  if (next.length < 3 || signedArea(next) < 0.05) return points;
  return next;
}

function offsetEdge(start: Point, end: Point, distance: number): [Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const x = (-dy / length) * distance;
  const y = (dx / length) * distance;
  return [
    { x: start.x + x, y: start.y + y },
    { x: end.x + x, y: end.y + y },
  ];
}

function lineIntersect(start: Point, end: Point, otherStart: Point, otherEnd: Point): Point | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const otherDx = otherEnd.x - otherStart.x;
  const otherDy = otherEnd.y - otherStart.y;
  const denominator = dx * otherDy - dy * otherDx;
  if (Math.abs(denominator) < 1e-8) return null;
  const t = ((otherStart.x - start.x) * otherDy - (otherStart.y - start.y) * otherDx) / denominator;
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function signedArea(points: Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
}
