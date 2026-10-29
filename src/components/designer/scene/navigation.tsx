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
    const setZoom = (clientX: number, clientY: number, nextZoom: number) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return;
      const rect = gl.domElement.getBoundingClientRect();
      const before = groundAt(camera, clientX, clientY, rect);
      camera.zoom = THREE.MathUtils.clamp(nextZoom, 8, 110);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      const after = groundAt(camera, clientX, clientY, rect);
      if (before && after) {
        target.current.x += before.x - after.x;
        target.current.z += before.z - after.z;
      }
      apply();
    };
    const zoomAt = (event: WheelEvent) => {
      if (!(camera instanceof THREE.OrthographicCamera)) return;
      setZoom(event.clientX, event.clientY, camera.zoom * (event.deltaY > 0 ? 0.92 : 1.08));
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

    const touches = new Map<number, { x: number; y: number }>();
    let pinch: {
      ids: [number, number];
      distance: number;
      zoom: number;
      midX: number;
      midY: number;
    } | null = null;
    let settling = false;
    let releasing = false;
    const overPlan = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };
    const fingerSpan = (firstId: number, secondId: number) => {
      const first = touches.get(firstId);
      const second = touches.get(secondId);
      if (!first || !second) return null;
      return {
        distance: Math.hypot(first.x - second.x, first.y - second.y) || 1,
        midX: (first.x + second.x) / 2,
        midY: (first.y + second.y) / 2,
      };
    };
    const releaseDrag = (pointerId: number, point: { x: number; y: number }) => {
      releasing = true;
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerId,
          clientX: point.x,
          clientY: point.y,
          pointerType: "touch",
        }),
      );
      releasing = false;
    };
    const onTouchDown = (event: PointerEvent) => {
      if (releasing || event.pointerType !== "touch" || !overPlan(event.clientX, event.clientY)) {
        return;
      }
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (touches.size < 2 || !(camera instanceof THREE.OrthographicCamera)) {
        if (settling) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      const [firstId, secondId] = [...touches.keys()];
      if (firstId == null || secondId == null) return;
      const first = touches.get(firstId);
      if (first && firstId !== event.pointerId) releaseDrag(firstId, first);
      const span = fingerSpan(firstId, secondId);
      if (!span) return;
      pinch = {
        ids: [firstId, secondId],
        distance: span.distance,
        zoom: camera.zoom,
        midX: span.midX,
        midY: span.midY,
      };
      settling = false;
      dragging.current = false;
      gl.domElement.style.cursor = "";
      event.preventDefault();
      event.stopPropagation();
    };
    const onTouchMove = (event: PointerEvent) => {
      if (releasing || !touches.has(event.pointerId)) return;
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (settling) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!pinch) return;
      const span = fingerSpan(pinch.ids[0], pinch.ids[1]);
      if (!span || !(camera instanceof THREE.OrthographicCamera)) return;
      event.preventDefault();
      event.stopPropagation();
      panByPixels(span.midX - pinch.midX, span.midY - pinch.midY);
      pinch.midX = span.midX;
      pinch.midY = span.midY;
      setZoom(span.midX, span.midY, pinch.zoom * (span.distance / pinch.distance));
    };
    const onTouchUp = (event: PointerEvent) => {
      if (releasing || !touches.has(event.pointerId)) return;
      const tracked = pinch?.ids.includes(event.pointerId) === true || settling;
      touches.delete(event.pointerId);
      if (pinch && !pinch.ids.every((id) => touches.has(id))) {
        pinch = null;
        settling = touches.size > 0;
      }
      if (touches.size === 0) settling = false;
      if (tracked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    gl.domElement.addEventListener("wheel", onWheel, { passive: false });
    gl.domElement.addEventListener("pointerdown", onPointerDown, true);
    gl.domElement.addEventListener("auxclick", onAuxClick);
    window.addEventListener("pointerdown", onTouchDown, { capture: true });
    window.addEventListener("pointermove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("pointerup", onTouchUp, { capture: true });
    window.addEventListener("pointercancel", onTouchUp, { capture: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      gl.domElement.removeEventListener("wheel", onWheel);
      gl.domElement.removeEventListener("pointerdown", onPointerDown, true);
      gl.domElement.removeEventListener("auxclick", onAuxClick);
      window.removeEventListener("pointerdown", onTouchDown, { capture: true });
      window.removeEventListener("pointermove", onTouchMove, { capture: true });
      window.removeEventListener("pointerup", onTouchUp, { capture: true });
      window.removeEventListener("pointercancel", onTouchUp, { capture: true });
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
