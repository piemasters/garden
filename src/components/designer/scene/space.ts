import * as THREE from "three";
import { slopeGradient } from "#/domain/slope";
import type { GroundSlope, Point } from "#/domain/types";

export const PLAN_CAMERA_POSITION: [number, number, number] = [0, 40, 0];
export const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function fromWorld(point: { x: number; z: number }): Point {
  return { x: point.x, y: -point.z };
}

/** Tips local up onto the slope normal. Null leaves the ground flat. */
export function tiltForSlope(slope: GroundSlope | undefined): THREE.Quaternion | null {
  if (!slope) return null;
  const gradient = slopeGradient(slope);
  if (!gradient) return null;
  const normal = new THREE.Vector3(-gradient.east, 1, gradient.north).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
}

export function fittedZoom(metres: number, width: number, height: number) {
  return Math.min(110, Math.max(8, Math.min(width, height) / (metres * 1.15)));
}

export function layOnSlope(
  geometry: THREE.BufferGeometry,
  slope: { east: number; north: number } | null,
) {
  if (!slope) return;
  const position = geometry.getAttribute("position");
  if (!(position instanceof THREE.BufferAttribute)) return;
  for (let index = 0; index < position.count; index += 1) {
    const east = position.getX(index);
    const north = position.getY(index);
    position.setZ(index, slope.east * east + slope.north * north);
  }
  position.needsUpdate = true;
  geometry.computeBoundingSphere();
}

export function plotOutline(boundary: Point[] | null): Point[] | null {
  return boundary && boundary.length >= 3 ? boundary : null;
}

export function counterClockwise(points: Point[]): Point[] {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum < 0 ? [...points].reverse() : points;
}

export function groundHeight(
  slope: { east: number; north: number } | null,
  east: number,
  north: number,
): number {
  if (!slope) return 0;
  return slope.east * east + slope.north * north;
}
