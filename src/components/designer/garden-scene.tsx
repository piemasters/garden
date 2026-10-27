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
import { centroid, lineEnds, scaleLength } from "../../domain/geometry";
import { shadowFootprint, type SunSample } from "../../domain/sun";
import type { Bed, Placement, Plant, Point, ShadeBlock } from "../../domain/types";
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
  const orbit = 12 * (metres / 32);
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
      <gridHelper
        args={[metres, metres, "#8ea184", "#d7e3cf"]}
        position={[0, 0.01, 0]}
        raycast={() => null}
      />
      {props.view === "plan" ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
            <planeGeometry args={[metres + 16, metres + 16]} />
            <meshStandardMaterial color="#d5e3c8" />
          </mesh>
          <PlanGround
            metres={metres}
            tool={props.tool}
            controls={planControls}
            onSurface={props.onSurface}
          />
        </>
      ) : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onPointerDown={(event) => {
            event.stopPropagation();
            props.onSurface(fromWorld(event.point), "down");
          }}
          onPointerMove={(event) => {
            if (props.tool !== "select") props.onSurface(fromWorld(event.point), "move");
          }}
          onPointerUp={(event) => {
            if (
              props.tool === "block" ||
              props.tool === "rect" ||
              props.tool === "freeform" ||
              props.tool === "place" ||
              props.tool === "rotate" ||
              props.tool === "scale" ||
              props.tool === "move"
            ) {
              props.onSurface(fromWorld(event.point), "up");
            }
          }}
        >
          <planeGeometry args={[metres + 16, metres + 16]} />
          <meshStandardMaterial color="#d5e3c8" />
        </mesh>
      )}
      <NorthMark metres={metres} />
      <BoundaryLine points={props.boundary} />
      {props.sunArc.length > 1 ? (
        <Line points={props.sunArc} color="#e2b33a" lineWidth={2} />
      ) : null}
      <CastShade
        blocks={props.blockDraft ? [...props.blocks, props.blockDraft] : props.blocks}
        samples={props.shadeSamples}
      />
      {props.beds.map((bed) => (
        <BedMesh
          key={bed.id}
          bed={bed}
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
        <mesh key={`${point.x},${point.y},${index}`} position={[point.x, 0.12, -point.y]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#1e4632" />
        </mesh>
      ))}
      <DraftLine points={props.preview ?? props.draft} closed={props.previewClosed} />
      {props.measure ? <MeasureLabel text={props.measure.text} at={props.measure.at} /> : null}
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
      <NameTracker beds={props.bedNames} onLabels={props.onBedLabels} />
      {props.blocks.map((block) => (
        <BlockMesh
          key={block.id}
          block={block}
          selected={block.id === props.selectedBlockId}
          interactive={props.tool === "select"}
          onSelect={props.onSelectBlock}
          onMove={props.tool === "select" ? props.onMoveBed : undefined}
        />
      ))}
      {props.blockDraft ? (
        <BlockMesh
          block={props.blockDraft}
          selected
          interactive={false}
          onSelect={() => undefined}
        />
      ) : null}
      {props.blockDraft?.line ? <LineDraft block={props.blockDraft} /> : null}
      {props.placements.map((placement) => {
        const plant = props.plantsById.get(placement.plantId);
        if (!plant) return null;
        return (
          <PlantMesh
            key={placement.id}
            placement={placement}
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

function CastShade({ blocks, samples }: { blocks: ShadeBlock[]; samples: SunSample[] }) {
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
    <group>
      {patches.map((patch) => (
        <ShadowPatch key={patch.key} points={patch.points} />
      ))}
    </group>
  );
}

function ShadowPatch({ points }: { points: Point[] }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.08, 0]}
      geometry={geometry}
      raycast={() => null}
    >
      <meshBasicMaterial color="#243044" transparent opacity={0.16} depthWrite={false} />
    </mesh>
  );
}

function BoundaryLine({ points }: { points: Point[] | null }) {
  if (!points || points.length < 3) return null;
  const first = points[0];
  if (!first) return null;
  const line = [...points, first].map(
    (point) => [point.x, 0.08, -point.y] as [number, number, number],
  );
  return <Line points={line} color="#8d5b3c" lineWidth={3} raycast={() => null} />;
}

function BedMesh({
  bed,
  selected,
  interactive,
  onSurface,
  onMove,
}: {
  bed: Bed;
  selected: boolean;
  interactive: boolean;
  onSurface: SceneProps["onSurface"];
  onMove?: SceneProps["onMoveBed"];
}) {
  const { camera, gl } = useThree();
  const shape = useMemo(() => {
    const next = new THREE.Shape();
    bed.points.forEach((point, index) => {
      if (index === 0) next.moveTo(point.x, point.y);
      else next.lineTo(point.x, point.y);
    });
    next.closePath();
    return next;
  }, [bed.points]);
  return (
    <mesh
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
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={bedFill(bed.color, selected)} />
    </mesh>
  );
}

/** Selected beds stay the chosen colour, lightened so the selection is still visible. */
function bedFill(color: string | undefined, selected: boolean): string {
  const base = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#a67c52";
  if (!selected) return base;
  return `#${new THREE.Color(base).lerp(new THREE.Color("#fff8ee"), 0.32).getHexString()}`;
}

function DraftLine({ points, closed }: { points: Point[]; closed: boolean }) {
  if (points.length < 2) return null;
  const first = points[0];
  const line = closed && first ? [...points, first] : points;
  return (
    <Line
      points={line.map((point) => [point.x, 0.12, -point.y] as [number, number, number])}
      color="#1e4632"
      lineWidth={2}
    />
  );
}

/** A fence or hedge is only a few centimetres wide, so the drag is drawn as a stroke. */
function LineDraft({ block }: { block: ShadeBlock }) {
  const [start, end] = lineEnds(block);
  const points = [
    [start.x, 0.3, -start.y],
    [end.x, 0.3, -end.y],
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
  onLabels,
}: {
  beds: SceneProps["bedNames"];
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
      const projected = new THREE.Vector3(centre.x, 0, -centre.y).project(camera);
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

function MeasureLabel({ text, at }: { text: string; at: Point }) {
  return (
    <Html
      position={[at.x, 0.4, -at.y]}
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
  selected,
  interactive,
  onSelect,
  onMove,
}: {
  block: ShadeBlock;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onMove?: SceneProps["onMoveBed"];
}) {
  const { camera, gl } = useThree();
  const width = Math.max(block.width, 0.05);
  const depth = Math.max(block.depth, 0.05);
  const height = Math.max(block.height, 0.05);
  return (
    <group position={[block.x, 0, -block.y]} rotation={[0, block.rotation ?? 0, 0]}>
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
    </group>
  );
}

function PlantMesh({
  placement,
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
    <group position={[placement.x, 0, -placement.y]}>
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
