import {
  Html,
  Line,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import * as THREE from "three";
import { plotMetres } from "../../domain/boundary";
import { blockCorners, centroid, lineEnds, scaleLength } from "../../domain/geometry";
import { slopeGradient } from "../../domain/slope";
import { shadowFootprint, type SunSample } from "../../domain/sun";
import type {
  Bed,
  GroundSlope,
  GroundSurface,
  Placement,
  Plant,
  Point,
  ShadeBlock,
} from "../../domain/types";
import { SURFACE_COLOR, bedSurface } from "../../domain/surface";
import { useUnits } from "../units";
import { ShadeBody } from "./shade-shape";

const PLAN_CAMERA_POSITION: [number, number, number] = [0, 40, 0];
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

type PlanControls = {
  panByPixels: (dx: number, dy: number) => void;
  setGrabbing: (active: boolean) => void;
  refit: () => void;
};

export interface SceneProps {
  beds: Bed[];
  blocks: ShadeBlock[];
  placements: Placement[];
  plantsById: Map<string, Plant>;
  month: number;
  view: "plan" | "orbit";
  tool:
    | "select"
    | "bed"
    | "rect"
    | "angled"
    | "freeform"
    | "place"
    | "block"
    | "rotate"
    | "scale"
    | "move";
  selectedBedId: string | null;
  /** The bed the user has actually chosen. The highlight can fall back to another bed. */
  chosenBedId: string | null;
  selectedPlacementId: string | null;
  selectedBlockId: string | null;
  draft: Point[];
  preview: Point[] | null;
  previewClosed: boolean;
  measure: { text: string; at: Point } | null;
  blockDraft: ShadeBlock | null;
  boundary: Point[] | null;
  surface: GroundSurface;
  slope?: GroundSlope;
  sunArc: Array<[number, number, number]>;
  shadeSamples: SunSample[];
  onSurface: (point: Point, phase: "down" | "move" | "up") => void;
  onMoveBed?: (point: Point, phase: "down" | "move" | "up") => void;
  onSelectPlacement: (id: string) => void;
  onSelectBed: (id: string) => void;
  onDrag: (id: string, point: Point) => void;
  onDrop: (id: string, point: Point) => void;
  onSelectBlock: (id: string) => void;
  onScale?: (metres: number, pixels: number) => void;
  showHandles: boolean;
  onHandleSpots: (spots: { turn: Pixel; resize: Pixel; center: Pixel } | null) => void;
  handlePoints?: Point[] | null;
  pointerRef: { current: (clientX: number, clientY: number) => Point | null };
  bedNames: { id: string; name: string; points: Point[] }[] | null;
  onBedLabels: (labels: { id: string; name: string; x: number; y: number }[]) => void;
}

type Pixel = { x: number; y: number };

export function GardenScene(props: SceneProps) {
  const metres = plotMetres(props.boundary);
  const outline = plotOutline(props.boundary);
  const orbit = 12 * (metres / 32);
  const groundTilt = useMemo(() => tiltForSlope(props.slope), [props.slope]);
  const shadowSlope = props.view === "orbit" && props.slope ? slopeGradient(props.slope) : null;
  const planControls = useRef<PlanControls>({
    panByPixels: () => undefined,
    setGrabbing: () => undefined,
    refit: () => undefined,
  });
  return (
    <Canvas
      key={props.view}
      className="h-full w-full"
      style={{ touchAction: "none" }}
      gl={{ antialias: true }}
    >
      {props.view === "plan" ? (
        <OrthographicCamera
          makeDefault
          position={PLAN_CAMERA_POSITION}
          zoom={36}
          near={0.1}
          far={400}
          onUpdate={(camera) => {
            camera.up.set(0, 0, -1);
          }}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          position={[orbit, orbit * 0.9, orbit * 1.15]}
          fov={42}
          near={0.1}
          far={400}
          onUpdate={(camera) => camera.lookAt(0, 0, 0)}
        />
      )}
      {props.view === "plan" ? <PlanNavigation metres={metres} controls={planControls} /> : null}
      {props.view === "plan" ? (
        <PlanScale onScale={props.onScale} />
      ) : (
        <GroundScale metres={metres} />
      )}
      {props.view === "orbit" ? (
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.15}
          zoomToCursor
          screenSpacePanning
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />
      ) : null}
      <color attach="background" args={["#e7f0e4"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 14, 4]} intensity={1.1} />
      <hemisphereLight args={["#f4f1e8", "#6d8a62", 0.4]} />
      {props.view === "plan" ? (
        <gridHelper
          args={[metres, metres, "#8ea184", "#d7e3cf"]}
          position={[0, 0.01, 0]}
          raycast={() => null}
        />
      ) : (
        <OrbitGround
          metres={metres}
          tilt={groundTilt}
          boundary={props.boundary}
          surface={props.surface}
          tool={props.tool}
          onSurface={props.onSurface}
        />
      )}
      {props.view === "plan" ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
            <planeGeometry args={[metres + 16, metres + 16]} />
            <GroundCoat boundary={props.boundary} surface={props.surface} repeat={metres + 16} />
          </mesh>
          {outline ? <PlotFill points={outline} surface={props.surface} /> : null}
          <PlanGround
            metres={metres}
            tool={props.tool}
            controls={planControls}
            onSurface={props.onSurface}
          />
        </>
      ) : null}
      <NorthMark metres={metres} />
      <BoundaryLine points={props.boundary} slope={shadowSlope} />
      {props.sunArc.length > 1 ? (
        <Line points={props.sunArc} color="#e2b33a" lineWidth={2} />
      ) : null}
      <CastShade
        blocks={props.blockDraft ? [...props.blocks, props.blockDraft] : props.blocks}
        samples={props.shadeSamples}
        slope={shadowSlope}
      />
      {props.beds.map((bed) => (
        <BedMesh
          key={bed.id}
          bed={bed}
          slope={shadowSlope}
          selected={bed.id === props.selectedBedId}
          interactive={props.tool === "select"}
          onSurface={props.onSurface}
          onMove={props.onMoveBed}
        />
      ))}
      {(props.tool === "angled"
        ? (props.preview ?? props.draft)
        : props.tool === "bed"
          ? props.draft
          : []
      ).map((point, index) => (
        <mesh
          key={`${point.x},${point.y},${index}`}
          position={[point.x, groundHeight(shadowSlope, point.x, point.y) + 0.12, -point.y]}
        >
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#1e4632" />
        </mesh>
      ))}
      <DraftLine
        points={props.preview ?? props.draft}
        closed={props.previewClosed}
        slope={shadowSlope}
      />
      {props.measure ? (
        <MeasureLabel text={props.measure.text} at={props.measure.at} slope={shadowSlope} />
      ) : null}
      <HandleTracker
        points={
          props.showHandles
            ? (props.handlePoints ??
              props.beds.find((bed) => bed.id === props.selectedBedId)?.points ??
              null)
            : null
        }
        onSpots={props.onHandleSpots}
        pointerRef={props.pointerRef}
      />
      <NameTracker beds={props.bedNames} slope={shadowSlope} onLabels={props.onBedLabels} />
      {props.blocks.map((block) => (
        <BlockMesh
          key={block.id}
          block={block}
          slope={shadowSlope}
          selected={block.id === props.selectedBlockId}
          interactive={props.tool === "select"}
          onSelect={props.onSelectBlock}
          onMove={props.tool === "select" ? props.onMoveBed : undefined}
        />
      ))}
      {props.blockDraft ? (
        <BlockMesh
          block={props.blockDraft}
          slope={shadowSlope}
          selected
          interactive={false}
          onSelect={() => undefined}
        />
      ) : null}
      {props.blockDraft?.line ? <LineDraft block={props.blockDraft} slope={shadowSlope} /> : null}
      {props.placements.map((placement) => {
        const plant = props.plantsById.get(placement.plantId);
        if (!plant) return null;
        return (
          <PlantMesh
            key={placement.id}
            placement={placement}
            slope={shadowSlope}
            plant={plant}
            month={props.month}
            selected={placement.id === props.selectedPlacementId}
            bedSelected={placement.bedId === props.chosenBedId}
            interactive={props.tool === "select"}
            onSelect={props.onSelectPlacement}
            onSelectBed={props.onSelectBed}
            onDrag={props.onDrag}
            onDrop={props.onDrop}
          />
        );
      })}
    </Canvas>
  );
}

function fromWorld(point: { x: number; z: number }): Point {
  return { x: point.x, y: -point.z };
}

/** Tips local up onto the slope normal. Null leaves the ground flat. */
function tiltForSlope(slope: GroundSlope | undefined): THREE.Quaternion | null {
  if (!slope) return null;
  const gradient = slopeGradient(slope);
  if (!gradient) return null;
  const normal = new THREE.Vector3(-gradient.east, 1, gradient.north).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
}

function fittedZoom(metres: number, width: number, height: number) {
  return Math.min(110, Math.max(8, Math.min(width, height) / (metres * 1.15)));
}

function PlanNavigation({
  metres,
  controls,
}: {
  metres: number;
  controls: MutableRefObject<PlanControls>;
}) {
  const { camera, gl, size } = useThree();
  const target = useRef(new THREE.Vector3());
  const fitted = useRef(36);
  const space = useRef(false);
  const dragging = useRef(false);

  const apply = () => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const limit = metres;
    target.current.x = THREE.MathUtils.clamp(target.current.x, -limit, limit);
    target.current.z = THREE.MathUtils.clamp(target.current.z, -limit, limit);
    camera.position.set(target.current.x, 40, target.current.z);
    camera.up.set(0, 0, -1);
    camera.lookAt(target.current.x, 0, target.current.z);
    camera.updateProjectionMatrix();
  };

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    fitted.current = fittedZoom(metres, size.width, size.height);
    camera.zoom = fitted.current;
    target.current.set(0, 0, 0);
    apply();
  }, [camera, metres, size.height, size.width]);

  useFrame(apply);

  useEffect(() => {
    const panByPixels = (dx: number, dy: number) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return;
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const worldWidth = (camera.right - camera.left) / camera.zoom;
      const worldHeight = (camera.top - camera.bottom) / camera.zoom;
      target.current.x -= (dx / rect.width) * worldWidth;
      target.current.z -= (dy / rect.height) * worldHeight;
      apply();
    };
    const zoomAt = (event: WheelEvent) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return;
      const rect = gl.domElement.getBoundingClientRect();
      const before = groundAt(camera, event.clientX, event.clientY, rect);
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 8, 110);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      const after = groundAt(camera, event.clientX, event.clientY, rect);
      if (before && after) {
        target.current.x += before.x - after.x;
        target.current.z += before.z - after.z;
      }
      apply();
    };
    controls.current = {
      panByPixels,
      setGrabbing: (active) => {
        dragging.current = active;
        gl.domElement.style.cursor = active ? "grabbing" : space.current ? "grab" : "";
      },
      refit: () => {
        if (!(camera instanceof THREE.OrthographicCamera)) return;
        target.current.set(0, 0, 0);
        camera.zoom = fitted.current;
        apply();
      },
    };

    const onWheel = (event: WheelEvent) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return;
      event.preventDefault();
      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        dx *= 16;
        dy *= 16;
      } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        dx *= gl.domElement.clientWidth;
        dy *= gl.domElement.clientHeight;
      }
      // A sideways swipe still slides the plan. An up or down scroll zooms.
      if (!event.ctrlKey && !event.metaKey && Math.abs(dx) > Math.abs(dy)) {
        panByPixels(-dx, 0);
        return;
      }
      zoomAt(event);
    };

    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (event: PointerEvent) => {
      const middle = event.button === 1;
      const spaceDrag = event.button === 0 && space.current;
      if (!middle && !spaceDrag) return;
      event.preventDefault();
      event.stopPropagation();
      dragging.current = true;
      lastX = event.clientX;
      lastY = event.clientY;
      gl.domElement.style.cursor = "grabbing";
      const move = (native: PointerEvent) => {
        panByPixels(native.clientX - lastX, native.clientY - lastY);
        lastX = native.clientX;
        lastY = native.clientY;
      };
      const up = () => {
        dragging.current = false;
        gl.domElement.style.cursor = space.current ? "grab" : "";
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    const onAuxClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      if (event.code === "Space") {
        event.preventDefault();
        space.current = true;
        if (!dragging.current) gl.domElement.style.cursor = "grab";
        return;
      }
      const step = event.shiftKey ? 120 : 48;
      if (event.code === "ArrowLeft") panByPixels(-step, 0);
      else if (event.code === "ArrowRight") panByPixels(step, 0);
      else if (event.code === "ArrowUp") panByPixels(0, -step);
      else if (event.code === "ArrowDown") panByPixels(0, step);
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      space.current = false;
      if (!dragging.current) gl.domElement.style.cursor = "";
    };

    gl.domElement.addEventListener("wheel", onWheel, { passive: false });
    gl.domElement.addEventListener("pointerdown", onPointerDown, true);
    gl.domElement.addEventListener("auxclick", onAuxClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      gl.domElement.removeEventListener("wheel", onWheel);
      gl.domElement.removeEventListener("pointerdown", onPointerDown, true);
      gl.domElement.removeEventListener("auxclick", onAuxClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      gl.domElement.style.cursor = "";
    };
  }, [camera, controls, gl, metres]);

  return null;
}

function groundAt(camera: THREE.Camera, clientX: number, clientY: number, rect: DOMRect) {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(GROUND_PLANE, hit)) return null;
  return hit;
}

function isTyping(event: KeyboardEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function PlanGround({
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

function NorthMark({ metres }: { metres: number }) {
  return (
    <mesh position={[0, 0.2, -(metres / 2 - 0.8)]}>
      <coneGeometry args={[0.35, 0.9, 4]} />
      <meshStandardMaterial color="#1c2822" />
    </mesh>
  );
}

function CastShade({
  blocks,
  samples,
  slope,
}: {
  blocks: ShadeBlock[];
  samples: SunSample[];
  /** Uphill rise per metre. Null keeps the shadow on the flat ground. */
  slope: { east: number; north: number } | null;
}) {
  const patches = useMemo(() => {
    const next: { key: string; points: Point[] }[] = [];
    blocks.forEach((block, blockIndex) => {
      samples.forEach((sample, sampleIndex) => {
        const points = shadowFootprint(block, sample.azimuth, sample.altitude);
        if (points.length >= 3)
          next.push({ key: `${block.id}-${blockIndex}-${sampleIndex}`, points });
      });
    });
    return next;
  }, [blocks, samples]);
  return (
    <>
      {patches.map((patch) => (
        <ShadowPatch key={patch.key} points={patch.points} slope={slope} />
      ))}
    </>
  );
}

function ShadowPatch({
  points,
  slope,
}: {
  points: Point[];
  slope: { east: number; north: number } | null;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();
    const next = new THREE.ShapeGeometry(shape);
    layOnSlope(next, slope);
    return next;
  }, [points, slope]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.08, 0]}
      geometry={geometry}
      raycast={() => null}
    >
      <meshBasicMaterial
        color="#243044"
        transparent
        opacity={0.16}
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={slope ? -4 : 0}
        polygonOffsetUnits={slope ? -4 : 0}
      />
    </mesh>
  );
}

function BoundaryLine({
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

function BedMesh({
  bed,
  slope,
  selected,
  interactive,
  onSurface,
  onMove,
}: {
  bed: Bed;
  slope: { east: number; north: number } | null;
  selected: boolean;
  interactive: boolean;
  onSurface: SceneProps["onSurface"];
  onMove?: SceneProps["onMoveBed"];
}) {
  const { camera, gl } = useThree();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    bed.points.forEach((point, index) => {
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
  }, [bed.points, slope]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const surface = bedSurface(bed.surface);
  const map = useMemo(() => (surface ? surfaceTexture(surface, 1) : null), [surface]);
  useEffect(() => () => map?.dispose(), [map]);
  const color = surface ? bedFill(SURFACE_COLOR[surface], selected) : bedFill(bed.color, selected);
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.04, 0]}
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
          if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) {
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
  );
}

/** Selected beds stay the chosen colour, lightened so the selection is still visible. */
function bedFill(color: string | undefined, selected: boolean): string {
  const base = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#a67c52";
  if (!selected) return base;
  return `#${new THREE.Color(base).lerp(new THREE.Color("#fff8ee"), 0.32).getHexString()}`;
}

function DraftLine({
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
function LineDraft({
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

function HandleTracker({
  points,
  onSpots,
  pointerRef,
}: {
  points: Point[] | null;
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
    };
    const key = `${Math.round(next.turn.x)},${Math.round(next.turn.y)},${Math.round(next.resize.x)},${Math.round(next.resize.y)}`;
    if (key === last.current) return;
    last.current = key;
    onSpots(next);
  });
  return null;
}

function NameTracker({
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

function MeasureLabel({
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

function PlanScale({ onScale }: { onScale?: (metres: number, pixels: number) => void }) {
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

function GroundScale({ metres }: { metres: number }) {
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

function BlockMesh({
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
 * How a block meets a slope. Houses and garages keep a level floor on a foundation.
 * Trees stand upright on the ground at the trunk. Fences, hedges, and sheds follow the fall.
 */
function slopeSeat(block: ShadeBlock): "foundation" | "upright" | "follow" {
  if (block.source === "osm") return "foundation";
  const shape = block.label?.replace(/ copy(?: \d+)?$/, "");
  if (shape === "House" || shape === "Garage") return "foundation";
  if (shape === "Tree") return "upright";
  return "follow";
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

function layOnSlope(geometry: THREE.BufferGeometry, slope: { east: number; north: number } | null) {
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

const OUTSIDE_GROUND = "#d5e3c8";

const SURFACE_ROUGHNESS: Record<GroundSurface, number> = {
  grass: 1,
  concrete: 0.9,
  paving: 0.72,
  gravel: 1,
  decking: 0.78,
  soil: 1,
  bark: 0.95,
};

function plotOutline(boundary: Point[] | null): Point[] | null {
  return boundary && boundary.length >= 3 ? boundary : null;
}

/** Pale surround when the outline is filled. Grass with no outline keeps the original ground. */
function openGroundColor(boundary: Point[] | null, surface: GroundSurface): string {
  if (plotOutline(boundary) || surface === "grass") return OUTSIDE_GROUND;
  return SURFACE_COLOR[surface];
}

function PlotFill({ points, surface }: { points: Point[]; surface: GroundSurface }) {
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

function GroundCoat({
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

function counterClockwise(points: Point[]): Point[] {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) continue;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum < 0 ? [...points].reverse() : points;
}

/** One metre of surface pattern. UVs are in metres, so the texture repeats once per metre. */
function surfaceTexture(surface: GroundSurface, repeat: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) drawSurface(context, surface);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawSurface(context: CanvasRenderingContext2D, surface: GroundSurface) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 128);
  if (surface === "grass") {
    for (let index = 0; index < 90; index += 1) {
      context.fillStyle = `rgba(20, 50, 20, ${0.08 + Math.random() * 0.16})`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 7);
    }
    return;
  }
  if (surface === "concrete") {
    for (let index = 0; index < 140; index += 1) {
      context.fillStyle = `rgba(40, 40, 40, ${0.04 + Math.random() * 0.08})`;
      context.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    return;
  }
  if (surface === "paving") {
    context.strokeStyle = "rgba(40, 44, 48, 0.45)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, 64);
    context.lineTo(128, 64);
    context.moveTo(64, 0);
    context.lineTo(64, 128);
    context.stroke();
    return;
  }
  if (surface === "gravel" || surface === "soil" || surface === "bark") {
    const count = surface === "bark" ? 28 : 46;
    for (let index = 0; index < count; index += 1) {
      context.fillStyle = `rgba(30, 24, 18, ${0.12 + Math.random() * 0.28})`;
      context.beginPath();
      context.ellipse(
        Math.random() * 128,
        Math.random() * 128,
        3 + Math.random() * (surface === "bark" ? 10 : 6),
        2 + Math.random() * 4,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    return;
  }
  const board = 18;
  for (let y = 0; y < 128; y += board) {
    context.fillStyle = "rgba(40, 24, 12, 0.35)";
    context.fillRect(0, y, 128, 3);
  }
}

function OrbitGround({
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

function groundHeight(
  slope: { east: number; north: number } | null,
  east: number,
  north: number,
): number {
  if (!slope) return 0;
  return slope.east * east + slope.north * north;
}

function PlantMesh({
  placement,
  slope,
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
    <group position={[placement.x, groundHeight(slope, placement.x, placement.y), -placement.y]}>
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
