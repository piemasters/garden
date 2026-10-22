import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { SceneProps } from "./garden-scene";

export function GardenCanvas(props: SceneProps) {
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);

  useEffect(() => {
    let active = true;
    void import("./garden-scene").then((module) => {
      if (active) setScene(() => module.GardenScene);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Scene) {
    return (
      <div className="grid h-full place-items-center text-sm text-ink/70">Preparing the plot…</div>
    );
  }
  return <Scene {...props} />;
}
