import * as THREE from "three";
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
