import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { blockCorners } from "#/domain/geometry";
import type { ShadeBlock } from "#/domain/types";
import type { SceneProps } from "./types";
import { ShadeBody } from "./shade-shape";
import { fromWorld, groundHeight } from "./space";

export function BlockMesh({
  block,
  slope,
  selected,
  interactive,
  onSelect,
  onMove,
}: {
  block: ShadeBlock;
  slope: { east: number; north: number } | null;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onMove?: SceneProps["onMoveBed"];
}) {
  const { camera, gl } = useThree();
  const width = Math.max(block.width, 0.05);
  const depth = Math.max(block.depth, 0.05);
  const height = Math.max(block.height, 0.05);
  const yaw = block.rotation ?? 0;
  const seat = slope ? slopeSeat(block) : null;
  const rise = seat === "foundation" ? footprintRise(block, slope) : null;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const along = seat === "follow" && slope ? slope.east * cos + slope.north * sin : 0;
  const across = seat === "follow" && slope ? slope.east * sin - slope.north * cos : 0;
  const base = rise ? rise.high : slope ? groundHeight(slope, block.x, block.y) : 0;
  return (
    <group position={[block.x, base, -block.y]} rotation={[0, yaw, 0]}>
      {rise && rise.drop > 0.02 ? (
        <mesh position={[0, -rise.drop / 2, 0]} raycast={() => null}>
          <boxGeometry args={[width, rise.drop, depth]} />
          <meshStandardMaterial color="#b7b1a6" roughness={0.95} />
        </mesh>
      ) : null}
      <GroundSeat along={along} across={across}>
        <mesh
          position={[0, height / 2, 0]}
          visible={false}
          raycast={interactive ? undefined : () => null}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect(block.id);
            const point = fromWorld(event.point);
            if (!onMove) return;
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
          <boxGeometry args={[width, height, depth]} />
          <meshBasicMaterial />
        </mesh>
        <ShadeBody block={{ ...block, width, depth, height }} selected={selected} />
      </GroundSeat>
    </group>
  );
}

/**
 * How a block meets a slope. Houses, garages, sheds, and custom areas keep a
 * level floor on a foundation. Trees stand upright at the trunk. Fences and
 * hedges follow the fall.
 */
function slopeSeat(block: ShadeBlock): "foundation" | "upright" | "follow" {
  const shape = block.label?.replace(/ copy(?: \d+)?$/, "");
  if (shape === "Tree") return "upright";
  if (block.line || shape === "Hedge" || shape === "Fence") return "follow";
  return "foundation";
}

/** Floor at the uphill ground, and how far the base must reach the downhill ground. */
function footprintRise(
  block: ShadeBlock,
  slope: { east: number; north: number } | null,
): { high: number; drop: number } {
  if (!slope) return { high: 0, drop: 0 };
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;
  for (const corner of blockCorners(block)) {
    const height = groundHeight(slope, corner.x, corner.y);
    high = Math.max(high, height);
    low = Math.min(low, height);
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) return { high: 0, drop: 0 };
  return { high, drop: high - low };
}

/** Keeps walls upright while the base follows the slope. */
function GroundSeat({
  along,
  across,
  children,
}: {
  along: number;
  across: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    if (along === 0 && across === 0) {
      group.matrix.identity();
      group.matrixAutoUpdate = true;
      return;
    }
    group.matrixAutoUpdate = false;
    group.matrix.makeShear(along, 0, 0, 0, 0, across);
    group.updateMatrixWorld(true);
  }, [along, across]);
  return <group ref={ref}>{children}</group>;
}
