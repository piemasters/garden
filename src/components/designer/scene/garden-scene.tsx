import { Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { plotMetres } from "#/domain/boundary";
import { slopeGradient } from "#/domain/slope";
import { BedMesh, RAISED_BED_M, RAISED_LIP_M } from "./beds";
import { BlockMesh } from "./blocks";
import { BoundaryLine, GroundCoat, NorthMark, OrbitGround, PlanGround, PlotFill } from "./ground";
import { PlanNavigation } from "./navigation";
import {
  DraftLine,
  GroundScale,
  HandleTracker,
  LineDraft,
  MeasureLabel,
  NameTracker,
  PlanScale,
} from "./overlays";
import { PlantMesh } from "./plants";
import { CastShade } from "./shade";
import { PLAN_CAMERA_POSITION, groundHeight, plotOutline, tiltForSlope } from "./space";
import type { PlanControls, SceneProps } from "./types";

export type { SceneProps };

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
          raised={props.view === "orbit" && bed.raised === true}
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
            lift={
              props.view === "orbit" &&
              props.beds.some((bed) => bed.id === placement.bedId && bed.raised)
                ? RAISED_BED_M - RAISED_LIP_M
                : 0
            }
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
