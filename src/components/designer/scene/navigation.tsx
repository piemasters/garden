import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { PlanControls } from "./types";
import { GROUND_PLANE, fittedZoom } from "./space";

export function PlanNavigation({
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
