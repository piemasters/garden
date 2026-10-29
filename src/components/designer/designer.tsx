import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PLANTS } from "#/domain/plants";
import type { Garden, Point } from "#/domain/types";
import { useGarden } from "#/lib/use-garden";
import { DesignerAside } from "./panels/designer-aside";
import { PlanStage } from "./plan-stage";
import { useLoadedBuildings } from "./use-buildings";
import { useDaylight } from "./use-daylight";
import { useDrawing } from "./use-drawing";
import { useShapeEdits } from "./use-shape-edits";

export function GardenDesigner({ gardenId, view }: { gardenId: string; view: "plan" | "orbit" }) {
  const { ready, garden, update } = useGarden(gardenId);
  if (!ready) return <p className="min-h-0 flex-1 p-6 text-sm">Loading garden…</p>;
  if (!garden) {
    return (
      <p className="min-h-0 flex-1 p-6">
        This garden is not saved in this browser.{" "}
        <Link to="/" className="text-leaf underline">
          Back to your gardens
        </Link>
      </p>
    );
  }
  return <DesignerBody garden={garden} update={update} view={view} />;
}

function DesignerBody({
  garden,
  update,
  view,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
  view: "plan" | "orbit";
}) {
  const [armedPlantId, setArmedPlantId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(garden.beds[0]?.id ?? null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [scale, setScale] = useState<{ metres: number; pixels: number } | null>(null);
  const [bedLabels, setBedLabels] = useState<{ id: string; name: string; x: number; y: number }[]>(
    [],
  );
  const [handleSpots, setHandleSpots] = useState<{
    turn: { x: number; y: number };
    resize: { x: number; y: number };
    center: { x: number; y: number };
  } | null>(null);
  const pointerRef = useRef<(clientX: number, clientY: number) => Point | null>(() => null);

  useLoadedBuildings(garden, update);
  const { samples, sunArc, shadeSamples } = useDaylight(
    garden.site.latitude,
    garden.site.longitude,
    month,
  );
  const plantsById = useMemo(() => new Map(PLANTS.map((plant) => [plant.id, plant])), []);
  const activeBed = garden.beds.find((bed) => bed.id === selectedBedId) ?? garden.beds[0] ?? null;
  const drawing = useDrawing({
    garden,
    update,
    view,
    scale,
    selectedBedId,
    setSelectedBedId,
    selectedBlockId,
    setSelectedBlockId,
    setSelectedPlacementId,
    armedPlantId,
    setArmedPlantId,
    plantsById,
    activeBed,
  });
  const edits = useShapeEdits({
    garden,
    update,
    pointerRef,
    plantsById,
    selectedBedId,
    setSelectedBedId,
    selectedBlockId,
    setSelectedBlockId,
    selectedPlacementId,
    setSelectedPlacementId,
    setTool: drawing.setTool,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <DesignerAside
        garden={garden}
        update={update}
        view={view}
        month={month}
        onMonth={setMonth}
        panelExpanded={panelExpanded}
        onTogglePanel={() => setPanelExpanded((expanded) => !expanded)}
        samples={samples}
        activeBed={activeBed}
        selectedBedId={selectedBedId}
        selectedBlockId={selectedBlockId}
        onSelectBed={(id) => {
          setSelectedBedId(id);
          setSelectedBlockId(null);
        }}
        drawing={drawing}
        edits={edits}
        onArmPlant={setArmedPlantId}
      />
      <PlanStage
        garden={garden}
        update={update}
        view={view}
        month={month}
        samples={samples}
        sunArc={sunArc}
        shadeSamples={shadeSamples}
        scale={scale}
        onScale={(metres, pixels) => setScale({ metres, pixels })}
        bedLabels={bedLabels}
        onBedLabels={setBedLabels}
        handleSpots={handleSpots}
        onHandleSpots={setHandleSpots}
        pointerRef={pointerRef}
        panelExpanded={panelExpanded}
        armedPlantId={armedPlantId}
        selectedBedId={selectedBedId}
        setSelectedBedId={setSelectedBedId}
        selectedPlacementId={selectedPlacementId}
        setSelectedPlacementId={setSelectedPlacementId}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        activeBed={activeBed}
        plantsById={plantsById}
        drawing={drawing}
        edits={edits}
      />
    </div>
  );
}
