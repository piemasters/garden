import { Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { SURFACE_COLOR } from "#/domain/surface";
import type { GroundSurface, Point } from "#/domain/types";
import type { PlanControls, SceneProps } from "./types";
import { counterClockwise, fromWorld, groundHeight, plotOutline } from "./space";
import { SURFACE_ROUGHNESS, surfaceTexture } from "./textures";

export function PlanGround({
  metres,
  tool,
  controls,
  onSurface,
}: {
  metres: number;
  tool: SceneProps["tool"];
  controls: MutableRefObject<PlanControls>;
  onSurface: SceneProps["onSurface"];
}) {
  const { gl } = useThree();
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
    point: Point;
  } | null>(null);
  const drawing =
    tool === "block" ||
    tool === "rect" ||
    tool === "freeform" ||
    tool === "place" ||
    tool === "rotate" ||
    tool === "scale" ||
    tool === "move";
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      onPointerOver={() => {
        if (tool === "select" && !drag.current) gl.domElement.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!drag.current) gl.domElement.style.cursor = "";
      }}
      onDoubleClick={(event) => {
        if (tool !== "select") return;
        event.stopPropagation();
        controls.current.refit();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const target = event.target as {
          setPointerCapture?: (pointerId: number) => void;
        } | null;
        try {
          target?.setPointerCapture?.(event.pointerId);
        } catch {
          // A synthetic pointer has nothing to capture. Move and release still run.
        }
        if (tool === "select" && event.button === 0) {
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
            point: fromWorld(event.point),
          };
          return;
        }
        onSurface(fromWorld(event.point), "down");
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (active && event.pointerId === active.id) {
          const dx = event.clientX - active.x;
          const dy = event.clientY - active.y;
          if (!active.moved && dx * dx + dy * dy < 25) return;
          active.moved = true;
          controls.current.setGrabbing(true);
          controls.current.panByPixels(dx, dy);
          active.x = event.clientX;
          active.y = event.clientY;
          return;
        }
        if (tool !== "select") onSurface(fromWorld(event.point), "move");
      }}
      onPointerUp={(event) => {
        const active = drag.current;
        if (active && event.pointerId === active.id) {
          drag.current = null;
          controls.current.setGrabbing(false);
          if (!active.moved) onSurface(active.point, "down");
          return;
        }
        if (drawing) onSurface(fromWorld(event.point), "up");
      }}
    >
      <planeGeometry args={[metres * 4, metres * 4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function NorthMark({ metres }: { metres: number }) {
  return (
    <mesh position={[0, 0.2, -(metres / 2 - 0.8)]}>
      <coneGeometry args={[0.35, 0.9, 4]} />
      <meshStandardMaterial color="#1c2822" />
    </mesh>
  );
}

export function BoundaryLine({
  points,
  slope,
}: {
  points: Point[] | null;
  slope: { east: number; north: number } | null;
}) {
  if (!points || points.length < 3) return null;
  const first = points[0];
  if (!first) return null;
  const line = [...points, first].map(
    (point) =>
      [point.x, groundHeight(slope, point.x, point.y) + 0.08, -point.y] as [number, number, number],
  );
  return <Line points={line} color="#8d5b3c" lineWidth={3} raycast={() => null} />;
}

const OUTSIDE_GROUND = "#d5e3c8";

function openGroundColor(boundary: Point[] | null, surface: GroundSurface): string {
  if (plotOutline(boundary) || surface === "grass") return OUTSIDE_GROUND;
  return SURFACE_COLOR[surface];
}

export function PlotFill({ points, surface }: { points: Point[]; surface: GroundSurface }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    counterClockwise(points).forEach((point, index) => {
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
    return next;
  }, [points]);
  const map = useMemo(() => surfaceTexture(surface, 1), [surface]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      raycast={() => null}
    >
      <meshStandardMaterial
        color={SURFACE_COLOR[surface]}
        map={map}
        roughness={SURFACE_ROUGHNESS[surface]}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function GroundCoat({
  boundary,
  surface,
  repeat,
}: {
  boundary: Point[] | null;
  surface: GroundSurface;
  repeat: number;
}) {
  const textured = !plotOutline(boundary) && surface !== "grass";
  const map = useMemo(
    () => (textured ? surfaceTexture(surface, repeat) : null),
    [textured, surface, repeat],
  );
  useEffect(() => () => map?.dispose(), [map]);
  return (
    <meshStandardMaterial
      color={openGroundColor(boundary, surface)}
      map={map}
      roughness={textured ? SURFACE_ROUGHNESS[surface] : 1}
    />
  );
}

export function OrbitGround({
  metres,
  tilt,
  boundary,
  surface,
  tool,
  onSurface,
}: {
  metres: number;
  tilt: THREE.Quaternion | null;
  boundary: Point[] | null;
  surface: GroundSurface;
  tool: SceneProps["tool"];
  onSurface: SceneProps["onSurface"];
}) {
  const outline = plotOutline(boundary);
  const surfaceMesh = (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSurface(fromWorld(event.point), "down");
      }}
      onPointerMove={(event) => {
        if (tool !== "select") onSurface(fromWorld(event.point), "move");
      }}
      onPointerUp={(event) => {
        if (
          tool === "block" ||
          tool === "rect" ||
          tool === "freeform" ||
          tool === "place" ||
          tool === "rotate" ||
          tool === "scale" ||
          tool === "move"
        ) {
          onSurface(fromWorld(event.point), "up");
        }
      }}
    >
      <planeGeometry args={[metres + 16, metres + 16]} />
      <GroundCoat boundary={boundary} surface={surface} repeat={metres + 16} />
    </mesh>
  );
  const fill = outline ? <PlotFill points={outline} surface={surface} /> : null;
  if (!tilt) {
    return (
      <>
        <gridHelper
          args={[metres, metres, "#8ea184", "#d7e3cf"]}
          position={[0, 0.01, 0]}
          raycast={() => null}
        />
        {surfaceMesh}
        {fill}
      </>
    );
  }
  return (
    <group quaternion={tilt}>
      {surfaceMesh}
      {fill}
      <gridHelper
        args={[metres, metres, "#8ea184", "#d7e3cf"]}
        position={[0, 0.012, 0]}
        raycast={() => null}
      />
    </group>
  );
}
