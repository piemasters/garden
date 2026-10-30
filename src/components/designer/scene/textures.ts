import * as THREE from "three";
import { paintSurface } from "#/domain/surface";
import type { GroundSurface } from "#/domain/types";

export const SURFACE_ROUGHNESS: Record<GroundSurface, number> = {
  grass: 1,
  concrete: 0.9,
  paving: 0.72,
  gravel: 1,
  decking: 0.78,
  soil: 1,
  bark: 0.95,
};

export function surfaceTexture(surface: GroundSurface, repeat: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) paintSurface(context, surface);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
