import { Line } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ShadeBlock } from "../../domain/types";

type Size = { width: number; depth: number; height: number };

/** Decorative stand-in for a shade block. The hit box stays the plain footprint. */
export function ShadeBody({
  block,
  selected,
}: {
  block: ShadeBlock;
  selected: boolean;
}) {
  const width = Math.max(block.width, 0.05);
  const depth = Math.max(block.depth, 0.05);
  const height = Math.max(block.height, 0.05);
  const size = { width, depth, height };
  return (
    <group>
      <ShadeModel block={block} size={size} />
      {selected ? <Footprint width={width} depth={depth} /> : null}
    </group>
  );
}

function ShadeModel({ block, size }: { block: ShadeBlock; size: Size }) {
  if (block.label === "Tree") return <TreeShape {...size} />;
  if (block.label === "Hedge") return <HedgeShape {...size} />;
  if (block.label === "Fence") return <FenceShape {...size} />;
  if (block.label === "Garage") {
    return (
      <BuildingShape
        {...size}
        wall="#e6e4de"
        roof="#5e6568"
        door="#3e4348"
        rise={Math.min(0.45, size.height * 0.22)}
        porch={Math.min(0.7, size.depth * 0.22)}
        doorWidth={Math.min(size.width * 0.72, size.width - 0.3)}
      />
    );
  }
  if (block.label === "Shed") {
    return (
      <BuildingShape
        {...size}
        wall="#a67c52"
        roof="#3e5344"
        door="#5c4030"
        rise={size.height * 0.42}
        porch={Math.min(0.55, size.depth * 0.24)}
        doorWidth={Math.min(0.85, size.width * 0.38)}
      />
    );
  }
  if (block.label === "House" || block.source === "osm") {
    return (
      <BuildingShape
        {...size}
        wall={block.source === "osm" ? "#e7e4dc" : "#f4f0e6"}
        roof={block.source === "osm" ? "#7a736c" : "#5c5148"}
        door="#3d4a3a"
        rise={size.height * 0.4}
        porch={Math.min(1.15, size.depth * 0.2)}
        doorWidth={Math.min(1.15, Math.max(0.7, size.width * 0.16))}
        chimney={size.width >= 4 && size.height >= 3}
      />
    );
  }
  return <PlainBlock {...size} />;
}

function PlainBlock({ width, depth, height }: Size) {
  return (
    <mesh position={[0, height / 2, 0]} raycast={() => null}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color="#6e7c86" transparent opacity={0.88} />
    </mesh>
  );
}

function BuildingShape({
  width,
  depth,
  height,
  wall,
  roof,
  door,
  rise,
  porch,
  doorWidth,
  chimney = false,
}: Size & {
  wall: string;
  roof: string;
  door: string;
  rise: number;
  porch: number;
  doorWidth: number;
  chimney?: boolean;
}) {
  const roofRise = Math.min(Math.max(rise, 0.25), height * 0.62);
  const wallHeight = Math.max(height - roofRise, height * 0.35);
  const actualRise = height - wallHeight;
  const front = Math.min(porch, depth * 0.35);
  const roofDepth = Math.max(depth - front, 0.3);
  const roofZ = -(depth - roofDepth) / 2;
  return (
    <group>
      <mesh position={[0, wallHeight / 2, 0]} raycast={() => null}>
        <boxGeometry args={[width * 0.98, wallHeight, depth * 0.98]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <group position={[0, wallHeight, roofZ]}>
        <Gable width={width} depth={roofDepth} rise={actualRise} color={roof} />
        <mesh position={[0, actualRise, 0]} raycast={() => null}>
          <boxGeometry args={[width * 1.02, 0.1, 0.16]} />
          <meshStandardMaterial color={roof} roughness={0.8} />
        </mesh>
      </group>
      <mesh
        position={[0, wallHeight + 0.04, depth / 2 - front / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[doorWidth, Math.max(front * 0.72, 0.25)]} />
        <meshStandardMaterial color={door} roughness={0.7} />
      </mesh>
      <mesh
        position={[0, wallHeight * 0.42, depth / 2 + 0.03]}
        raycast={() => null}
      >
        <boxGeometry args={[doorWidth, wallHeight * 0.55, 0.06]} />
        <meshStandardMaterial color={door} roughness={0.7} />
      </mesh>
      {chimney ? (
        <mesh
          position={[
            width * 0.28,
            wallHeight + actualRise * 0.72,
            roofZ - roofDepth * 0.12,
          ]}
          raycast={() => null}
        >
          <boxGeometry args={[0.5, actualRise * 0.85, 0.5]} />
          <meshStandardMaterial color="#8d5b4a" roughness={0.95} />
        </mesh>
      ) : null}
    </group>
  );
}

function Gable({
  width,
  depth,
  rise,
  color,
}: {
  width: number;
  depth: number;
  rise: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const hw = width / 2;
    const hd = depth / 2;
    const next = new THREE.BufferGeometry();
    next.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -hw,
          0,
          hd,
          hw,
          0,
          hd,
          hw,
          rise,
          0,
          -hw,
          0,
          hd,
          hw,
          rise,
          0,
          -hw,
          rise,
          0,
          hw,
          0,
          -hd,
          -hw,
          0,
          -hd,
          -hw,
          rise,
          0,
          hw,
          0,
          -hd,
          -hw,
          rise,
          0,
          hw,
          rise,
          0,
          -hw,
          0,
          -hd,
          -hw,
          0,
          hd,
          -hw,
          rise,
          0,
          hw,
          0,
          hd,
          hw,
          0,
          -hd,
          hw,
          rise,
          0,
        ],
        3,
      ),
    );
    next.computeVertexNormals();
    return next;
  }, [width, depth, rise]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.85}
      />
    </mesh>
  );
}

function TreeShape({ width, depth, height }: Size) {
  const spread = Math.min(width, depth);
  const crownHeight = Math.min(spread * 0.72, height * 0.62);
  const crownCenter = height - crownHeight / 2;
  const trunkRadius = Math.min(0.28, Math.max(0.08, spread * 0.055));
  const trunkHeight = Math.max(crownCenter * 0.72, 0.2);
  return (
    <group>
      <mesh position={[0, trunkHeight / 2, 0]} raycast={() => null}>
        <cylinderGeometry
          args={[trunkRadius * 0.75, trunkRadius, trunkHeight, 8]}
        />
        <meshStandardMaterial color="#6b4a32" roughness={0.95} />
      </mesh>
      <mesh
        position={[0, crownCenter, 0]}
        scale={[width, crownHeight, depth]}
        raycast={() => null}
      >
        <sphereGeometry args={[0.5, 22, 16]} />
        <meshStandardMaterial color="#3f7d49" roughness={0.85} />
      </mesh>
    </group>
  );
}

function HedgeShape({ width, depth, height }: Size) {
  const cap = Math.min(depth / 2, height * 0.42);
  const body = Math.max(height - cap, 0.08);
  const core = Math.max(width - cap * 2, Math.min(width, 0.2));
  return (
    <group>
      <mesh position={[0, body / 2, 0]} raycast={() => null}>
        <boxGeometry args={[core, body, depth * 0.92]} />
        <meshStandardMaterial color="#2c6840" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, body, 0]}
        rotation={[0, 0, Math.PI / 2]}
        raycast={() => null}
      >
        <cylinderGeometry args={[cap, cap, width, 12]} />
        <meshStandardMaterial color="#3c7d49" roughness={0.85} />
      </mesh>
    </group>
  );
}

function FenceShape({ width, depth, height }: Size) {
  const postGap = 1.8;
  const posts = Math.max(2, Math.round(width / postGap) + 1);
  const paleGap = 0.14;
  const pales = Math.min(480, Math.max(2, Math.round(width / paleGap)));
  const boardDepth = Math.min(Math.max(depth * 0.45, 0.04), depth);
  return (
    <group>
      <RepeatedBoards
        count={posts}
        width={width}
        args={[0.12, height, Math.min(Math.max(depth * 0.7, 0.08), depth)]}
        color="#6b5344"
        y={height / 2}
      />
      <RepeatedBoards
        count={pales}
        width={width}
        args={[Math.min(0.07, paleGap * 0.5), height * 0.92, boardDepth]}
        color="#d2c0a0"
        y={height * 0.46}
      />
      <mesh position={[0, height * 0.38, 0]} raycast={() => null}>
        <boxGeometry args={[width, 0.08, Math.max(boardDepth * 0.45, 0.03)]} />
        <meshStandardMaterial color="#8a7158" roughness={0.9} />
      </mesh>
      <mesh position={[0, height * 0.78, 0]} raycast={() => null}>
        <boxGeometry args={[width, 0.08, Math.max(boardDepth * 0.45, 0.03)]} />
        <meshStandardMaterial color="#8a7158" roughness={0.9} />
      </mesh>
    </group>
  );
}

function RepeatedBoards({
  count,
  width,
  args,
  color,
  y,
}: {
  count: number;
  width: number;
  args: [number, number, number];
  color: string;
  y: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const step = count <= 1 ? 0 : width / (count - 1);
    const start = count <= 1 ? 0 : -width / 2;
    for (let index = 0; index < count; index += 1) {
      dummy.position.set(start + step * index, y, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, width, y]);
  return (
    <instancedMesh
      key={count}
      ref={ref}
      args={[undefined, undefined, count]}
      raycast={() => null}
    >
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  );
}

function Footprint({ width, depth }: { width: number; depth: number }) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const y = 0.12;
  return (
    <Line
      points={[
        [-halfW, y, -halfD],
        [halfW, y, -halfD],
        [halfW, y, halfD],
        [-halfW, y, halfD],
        [-halfW, y, -halfD],
      ]}
      color="#1e4632"
      lineWidth={2}
      raycast={() => null}
    />
  );
}
