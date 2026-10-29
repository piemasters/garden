import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MAP_FILL_CAP, planFill } from "#/domain/geometry";
import type { Placement, Plant, Point } from "#/domain/types";
import { groundHeight } from "./space";

export function FillSample({
  placement,
  bedPoints,
  slope,
  lift,
  plant,
  month,
  bedSelected,
  onSelectBed,
}: {
  placement: Placement;
  bedPoints: Point[];
  slope: { east: number; north: number } | null;
  lift: number;
  plant: Plant;
  month: number;
  bedSelected: boolean;
  onSelectBed: (id: string) => void;
}) {
  const spacing = placement.spacing ?? 0;
  const points = useMemo(
    () => (spacing > 0 ? planFill(bedPoints, spacing, [], MAP_FILL_CAP).points : []),
    [bedPoints, spacing],
  );
  return (
    <group>
      {points.map((point, index) => (
        <PlantMesh
          key={`${placement.id}:${index}`}
          placement={{ ...placement, x: point.x, y: point.y }}
          slope={slope}
          lift={lift}
          plant={plant}
          month={month}
          selected={false}
          bedSelected={bedSelected}
          interactive={false}
          onSelect={() => undefined}
          onSelectBed={onSelectBed}
          onDrag={() => undefined}
          onDrop={() => undefined}
        />
      ))}
    </group>
  );
}

export function PlantMesh({
  placement,
  slope,
  lift,
  plant,
  month,
  selected,
  bedSelected,
  interactive,
  onSelect,
  onSelectBed,
  onDrag,
  onDrop,
}: {
  placement: Placement;
  slope: { east: number; north: number } | null;
  lift: number;
  plant: Plant;
  month: number;
  selected: boolean;
  bedSelected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onSelectBed: (id: string) => void;
  onDrag: (id: string, point: Point) => void;
  onDrop: (id: string, point: Point) => void;
}) {
  const { camera, gl } = useThree();
  const look = plant.months[month];
  const height = (plant.heightM[0] + plant.heightM[1]) / 2;
  const spread = (plant.spreadM[0] + plant.spreadM[1]) / 2;
  const leaf = "#3f7d49";
  const flower = look?.flowerHex ?? leaf;
  const flowering = Boolean(look?.flower);
  const leafy = Boolean(look?.foliage);
  const pick = interactive ? undefined : () => null;
  return (
    <group
      position={[placement.x, groundHeight(slope, placement.x, placement.y) + lift, -placement.y]}
    >
      <IgnorePointer>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[Math.max(spread / 2 - 0.04, 0.04), spread / 2, 20]} />
          <meshBasicMaterial color={selected ? "#1e4632" : "#6d7a62"} />
        </mesh>
        <PlantBody
          habit={plant.habit}
          height={height}
          spread={spread}
          flowering={flowering}
          leafy={leafy}
          flower={flower}
          leaf={leaf}
        />
      </IgnorePointer>
      <group>
        <mesh
          position={[0, Math.max(height, 0.25) / 2, 0]}
          raycast={pick}
          onPointerDown={(event) => {
            event.stopPropagation();
            if (!bedSelected) {
              onSelectBed(placement.bedId);
              return;
            }
            onSelect(placement.id);
            const originX = event.nativeEvent.clientX;
            const originY = event.nativeEvent.clientY;
            let moved = false;
            let last = { x: placement.x, y: placement.y };
            const read = (native: PointerEvent) => {
              const rect = gl.domElement.getBoundingClientRect();
              const x = ((native.clientX - rect.left) / rect.width) * 2 - 1;
              const y = -((native.clientY - rect.top) / rect.height) * 2 + 1;
              const raycaster = new THREE.Raycaster();
              raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
              const hit = new THREE.Vector3();
              if (
                !raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)
              )
                return null;
              return { x: hit.x, y: -hit.z };
            };
            const move = (native: PointerEvent) => {
              if (!moved && Math.hypot(native.clientX - originX, native.clientY - originY) < 5)
                return;
              const point = read(native);
              if (!point) return;
              moved = true;
              last = point;
              onDrag(placement.id, point);
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
              if (moved) onDrop(placement.id, last);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        >
          <cylinderGeometry
            args={[
              Math.max(spread / 2, 0.12),
              Math.max(spread / 2, 0.12),
              Math.max(height, 0.3),
              12,
            ]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <PlantBody
          habit={plant.habit}
          height={height}
          spread={spread}
          flowering={flowering}
          leafy={leafy}
          flower={flower}
          leaf={leaf}
        />
      </group>
    </group>
  );
}

function IgnorePointer({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.raycast = () => null;
    });
  });
  return <group ref={ref}>{children}</group>;
}

function PlantBody({
  habit,
  height,
  spread,
  flowering,
  leafy,
  flower,
  leaf,
}: {
  habit: Plant["habit"];
  height: number;
  spread: number;
  flowering: boolean;
  leafy: boolean;
  flower: string;
  leaf: string;
}) {
  if (!flowering && !leafy) {
    return (
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[spread / 2, spread / 2, 0.05, 16]} />
        <meshStandardMaterial color="#8a7048" />
      </mesh>
    );
  }
  if (habit === "tree") {
    const crown = Math.min(spread / 2, height * 0.35);
    return (
      <group>
        <mesh position={[0, height * 0.28, 0]}>
          <cylinderGeometry args={[0.08, 0.14, height * 0.5, 8]} />
          <meshStandardMaterial color="#6b4a32" />
        </mesh>
        <mesh position={[0, height * 0.62, 0]}>
          <sphereGeometry args={[crown, 18, 14]} />
          <meshStandardMaterial color={flowering ? flower : leaf} />
        </mesh>
      </group>
    );
  }
  if (habit === "shrub") {
    return (
      <mesh position={[0, Math.max(height, 0.4) * 0.45, 0]}>
        <sphereGeometry args={[Math.max(spread / 2, 0.25), 18, 14]} />
        <meshStandardMaterial color={flowering ? flower : leaf} />
      </mesh>
    );
  }
  if (habit === "bulb") {
    return (
      <group>
        <mesh position={[0, leafy ? 0.12 : 0.04, 0]}>
          <cylinderGeometry args={[0.03, 0.05, leafy ? 0.22 : 0.05, 8]} />
          <meshStandardMaterial color={leafy ? leaf : "#8a7048"} />
        </mesh>
        {flowering ? (
          <mesh position={[0, Math.max(height, 0.2), 0]}>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshStandardMaterial color={flower} />
          </mesh>
        ) : null}
      </group>
    );
  }
  return (
    <mesh position={[0, Math.max(height, 0.25) * 0.45, 0]}>
      <sphereGeometry args={[Math.max(spread / 2, 0.15), 16, 12]} />
      <meshStandardMaterial color={flowering ? flower : leaf} />
    </mesh>
  );
}
