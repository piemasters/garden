import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { shadowFootprint, type SunSample } from "#/domain/sun";
import type { Point, ShadeBlock } from "#/domain/types";
import { layOnSlope } from "./space";

export function CastShade({
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
