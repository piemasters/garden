import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { distance, pointInPolygon } from "../../domain/geometry";
import {
  ASPECT_LABEL,
  KIND_LABEL,
  MOISTURE_LABEL,
  PH_LABEL,
  SOIL_LABEL,
  SUN_LABEL,
} from "../../domain/labels";
import { buildTimeline } from "../../domain/jobs";
import { getPlant, PLANTS } from "../../domain/plants";
import { aspectNote, recommendPlants } from "../../domain/recommend";
import { bedSun, daySamples, midsummerSamples, sunVector } from "../../domain/sun";
import {
  MONTH_NAMES,
  SUN_LEVELS,
  type Garden,
  type Point,
  type ShadeBlock,
  type SunLevel,
} from "../../domain/types";
import { useGarden } from "../../lib/use-garden";
import { fetchBuildings } from "../../server/site";
import { buttonClass, quietButtonClass } from "../chrome";
import { GardenCanvas } from "./garden-canvas";

type Tool = "select" | "bed" | "block";

export function GardenDesigner({ gardenId }: { gardenId: string }) {
  const { ready, garden, update } = useGarden(gardenId);
  if (!ready) return <p className="p-6 text-sm">Loading garden…</p>;
  if (!garden) {
    return (
      <p className="p-6">
        This garden is not saved in this browser.{" "}
        <Link to="/" className="text-leaf underline">
          Back to your gardens
        </Link>
      </p>
    );
  }
  return <DesignerBody garden={garden} update={update} />;
}

function DesignerBody({
  garden,
  update,
}: {
  garden: Garden;
  update: (recipe: (current: Garden) => Garden) => void;
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<Point[]>([]);
  const [blockStart, setBlockStart] = useState<Point | null>(null);
  const [blockDraft, setBlockDraft] = useState<ShadeBlock | null>(null);
  const blockId = useRef("");
  const [armedPlantId, setArmedPlantId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(garden.beds[0]?.id ?? null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [view, setView] = useState<"plan" | "orbit">("plan");
  const appliedBuildings = useRef(false);

  const buildings = useQuery({
    queryKey: ["buildings", garden.id],
    enabled: !garden.buildingsLoaded,
    queryFn: () =>
      fetchBuildings({
        data: { latitude: garden.site.latitude, longitude: garden.site.longitude },
      }),
  });

  useEffect(() => {
    if (garden.buildingsLoaded || appliedBuildings.current || !buildings.isFetched) return;
    appliedBuildings.current = true;
    const result = buildings.data;
    const buildingError =
      result == null
        ? "Building outlines could not be loaded. You can still draw shade blocks yourself."
        : result.ok
          ? null
          : result.error;
    update((current) => ({
      ...current,
      buildingsLoaded: true,
      buildingError,
      blocks: [
        ...(result?.ok ? result.blocks : []),
        ...current.blocks.filter((block) => block.source === "user"),
      ],
    }));
  }, [buildings.data, buildings.isFetched, garden.buildingsLoaded, update]);

  const samples = useMemo(
    () => midsummerSamples(garden.site.latitude, garden.site.longitude),
    [garden.site.latitude, garden.site.longitude],
  );
  const sunArc = useMemo(
    () =>
      daySamples(garden.site.latitude, garden.site.longitude, month, 15)
        .filter((sample) => sample.altitude > 5)
        .map((sample) => {
          const vector = sunVector(sample.azimuth, sample.altitude);
          const radius = 18;
          return [vector.x * radius, Math.max(0.5, vector.z * radius), -vector.y * radius] as [
            number,
            number,
            number,
          ];
        }),
    [garden.site.latitude, garden.site.longitude, month],
  );
  const plantsById = useMemo(() => new Map(PLANTS.map((plant) => [plant.id, plant])), []);
  const activeBed = garden.beds.find((bed) => bed.id === selectedBedId) ?? garden.beds[0] ?? null;
  const activeLight = activeBed ? resolvedLight(activeBed, samples, garden.blocks) : null;
  const recommendations = activeLight
    ? recommendPlants(PLANTS, garden.site, activeLight.light, garden.showUnsuitable)
    : [];
  const armed = armedPlantId ? getPlant(armedPlantId) : undefined;
  const selectedBlock = garden.blocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      event.preventDefault();
      if (selectedPlacementId) {
        update((current) => ({
          ...current,
          placements: current.placements.filter((item) => item.id !== selectedPlacementId),
        }));
        setSelectedPlacementId(null);
      } else if (selectedBlockId) {
        update((current) => ({
          ...current,
          blocks: current.blocks.filter((item) => item.id !== selectedBlockId),
        }));
        setSelectedBlockId(null);
      } else if (selectedBedId) {
        update((current) => ({
          ...current,
          beds: current.beds.filter((item) => item.id !== selectedBedId),
          placements: current.placements.filter((item) => item.bedId !== selectedBedId),
        }));
        setSelectedBedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBedId, selectedBlockId, selectedPlacementId, update]);

  function finishBed(points: Point[]) {
    if (points.length < 3) return;
    const bed = {
      id: crypto.randomUUID(),
      name: `Bed ${garden.beds.length + 1}`,
      points,
      lightOverride: null as SunLevel | null,
    };
    update((current) => ({ ...current, beds: [...current.beds, bed] }));
    setSelectedBedId(bed.id);
    setDraft([]);
    setTool("select");
  }

  function handleSurface(point: Point, phase: "down" | "move" | "up") {
    if (tool === "bed" && phase === "down") {
      const first = draft[0];
      if (first && draft.length >= 3 && distance(point, first) < 0.75) {
        finishBed(draft);
        return;
      }
      setDraft((points) => [...points, point]);
      return;
    }
    if (tool === "block") {
      if (phase === "down") {
        blockId.current = crypto.randomUUID();
        setBlockStart(point);
        setBlockDraft(blockBetween(blockId.current, point, point));
        return;
      }
      if (phase === "move" && blockStart) {
        setBlockDraft(blockBetween(blockId.current, blockStart, point));
        return;
      }
      if (phase === "up" && blockStart) {
        const block = blockBetween(blockId.current, blockStart, point);
        if (block.width >= 0.8 && block.depth >= 0.8) {
          update((current) => ({ ...current, blocks: [...current.blocks, block] }));
          setSelectedBlockId(block.id);
        }
        setBlockStart(null);
        setBlockDraft(null);
        setTool("select");
      }
      return;
    }
    if (phase !== "down") return;
    const bed = garden.beds.find((item) => pointInPolygon(point, item.points));
    if (armedPlantId && bed) {
      const placement = {
        id: crypto.randomUUID(),
        plantId: armedPlantId,
        bedId: bed.id,
        x: point.x,
        y: point.y,
      };
      update((current) => ({ ...current, placements: [...current.placements, placement] }));
      setSelectedBedId(bed.id);
      setSelectedPlacementId(placement.id);
      setArmedPlantId(null);
      return;
    }
    if (bed) {
      setSelectedBedId(bed.id);
      setSelectedPlacementId(null);
      setSelectedBlockId(null);
      return;
    }
    setSelectedBedId(null);
    setSelectedPlacementId(null);
    setSelectedBlockId(null);
  }

  const jobCount = buildTimeline(PLANTS, garden.placements, garden.site).length;

  return (
    <div className="grid min-h-[calc(100vh-4.25rem)] lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
      <aside className="space-y-4 border-b border-line p-4 lg:border-r lg:border-b-0">
        <div>
          <h1 className="text-3xl">{garden.site.name}</h1>
          <p className="text-sm text-ink/70">
            {garden.site.postcode} · {garden.site.region}
          </p>
          <p className="mt-2 text-sm">
            {SOIL_LABEL[garden.site.soil]} · {MOISTURE_LABEL[garden.site.moisture]} ·{" "}
            {PH_LABEL[garden.site.ph]} · {ASPECT_LABEL[garden.site.aspect]}
          </p>
          {garden.site.address ? (
            <p className="mt-2 text-sm text-ink/70">{garden.site.address}</p>
          ) : null}
          {garden.site.soilSuggestion ? (
            <p className="mt-2 text-xs text-ink/60">{garden.site.soilSuggestion.label}</p>
          ) : null}
          {garden.boundary && garden.boundary.length >= 3 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink/60">
                Property outline from HM Land Registry. It is the indicative freehold extent, not
                the legal title.
              </p>
              <button
                className={quietButtonClass}
                type="button"
                onClick={() => update((current) => ({ ...current, boundary: null }))}
              >
                Clear outline
              </button>
            </div>
          ) : null}
          {garden.attribution ? (
            <p className="mt-2 text-xs text-ink/50">{garden.attribution}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ToolButton current={tool} tool="select" onClick={setTool}>
            Select
          </ToolButton>
          <ToolButton current={tool} tool="bed" onClick={setTool}>
            Draw bed
          </ToolButton>
          <ToolButton current={tool} tool="block" onClick={setTool}>
            Shade block
          </ToolButton>
        </div>
        {tool === "bed" ? (
          <div className="text-sm">
            <p>
              Click the corners of a bed. Click the first point again, or finish when you have
              three.
            </p>
            <button
              className={`${quietButtonClass} mt-2`}
              type="button"
              disabled={draft.length < 3}
              onClick={() => finishBed(draft)}
            >
              Finish bed
            </button>
          </div>
        ) : null}
        {tool === "block" ? (
          <p className="text-sm">
            Drag a rectangle for a wall, fence or building. It casts shade on the beds.
          </p>
        ) : null}
        <p className="text-xs text-ink/60">
          {!garden.buildingsLoaded
            ? "Loading nearby buildings…"
            : garden.buildingError
              ? garden.buildingError
              : garden.blocks.some((block) => block.source === "osm")
                ? "Grey blocks are OpenStreetMap buildings. Heights are often a guess. Delete any that are wrong."
                : "No building outlines were added for this point. You can draw shade blocks yourself."}
        </p>
        <label className="block text-sm">
          Month
          <input
            className="mt-1 w-full"
            type="range"
            min={0}
            max={11}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          />
          <span className="font-medium">{MONTH_NAMES[month]}</span>
        </label>
        <div className="flex gap-2">
          <button
            className={view === "plan" ? buttonClass : quietButtonClass}
            type="button"
            onClick={() => setView("plan")}
          >
            Plan
          </button>
          <button
            className={view === "orbit" ? buttonClass : quietButtonClass}
            type="button"
            onClick={() => setView("orbit")}
          >
            3D
          </button>
        </div>
        <div>
          <h2 className="text-lg">Beds</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {garden.beds.map((bed) => {
              const light = resolvedLight(bed, samples, garden.blocks);
              return (
                <li key={bed.id}>
                  <button
                    className="text-left"
                    type="button"
                    onClick={() => setSelectedBedId(bed.id)}
                  >
                    <span className="font-medium">{bed.name}</span>
                    <span className="block text-ink/70">
                      {SUN_LABEL[light.light]} · {light.hours.toFixed(1)} h of midsummer sun
                      {bed.lightOverride ? " · override" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {garden.beds.length === 0 ? <li className="text-ink/60">No beds yet.</li> : null}
          </ul>
        </div>
        {activeBed && activeLight ? (
          <label className="block text-sm">
            Light for {activeBed.name}
            <select
              className="mt-1 w-full rounded-md border border-line bg-card px-2 py-2"
              value={activeBed.lightOverride ?? "calculated"}
              onChange={(event) => {
                const value = event.target.value;
                const lightOverride = value === "calculated" ? null : (value as SunLevel);
                update((current) => ({
                  ...current,
                  beds: current.beds.map((bed) =>
                    bed.id === activeBed.id ? { ...bed, lightOverride } : bed,
                  ),
                }));
              }}
            >
              <option value="calculated">
                Use the sun calculation ({SUN_LABEL[activeLight.light]})
              </option>
              {SUN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Override: {SUN_LABEL[level]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedBlock ? (
          <label className="block text-sm">
            Block height ({selectedBlock.height.toFixed(1)} m)
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={selectedBlock.height}
              onChange={(event) => {
                const height = Number(event.target.value);
                update((current) => ({
                  ...current,
                  blocks: current.blocks.map((block) =>
                    block.id === selectedBlock.id ? { ...block, height } : block,
                  ),
                }));
              }}
            />
            <button
              className={`${quietButtonClass} mt-2`}
              type="button"
              onClick={() => {
                update((current) => ({
                  ...current,
                  blocks: current.blocks.filter((block) => block.id !== selectedBlock.id),
                }));
                setSelectedBlockId(null);
              }}
            >
              Remove block
            </button>
          </label>
        ) : null}
        <p className="text-sm">
          <Link
            to="/gardens/$gardenId/jobs"
            params={{ gardenId: garden.id }}
            className="text-leaf underline"
          >
            {jobCount === 0
              ? "Jobs will appear once you place plants"
              : `${jobCount} jobs this year`}
          </Link>
        </p>
      </aside>

      <div className="relative h-[70vh] min-h-[28rem] lg:h-auto">
        {view === "plan" ? (
          <p className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 text-xs tracking-widest text-ink/70">
            NORTH
          </p>
        ) : null}
        {armed ? (
          <p className="absolute top-3 left-3 z-10 rounded-full bg-leaf px-3 py-1 text-sm text-white">
            Click a bed to plant {armed.commonName}
          </p>
        ) : null}
        <GardenCanvas
          beds={garden.beds}
          blocks={garden.blocks}
          placements={garden.placements}
          plantsById={plantsById}
          month={month}
          view={view}
          tool={tool}
          selectedBedId={activeBed?.id ?? null}
          selectedPlacementId={selectedPlacementId}
          selectedBlockId={selectedBlockId}
          draft={draft}
          blockDraft={blockDraft}
          boundary={garden.boundary ?? null}
          sunArc={sunArc}
          onSurface={handleSurface}
          onSelectPlacement={setSelectedPlacementId}
          onSelectBlock={(id) => {
            setSelectedBlockId(id);
            setSelectedPlacementId(null);
          }}
          onDrag={(id, point) => {
            update((current) => ({
              ...current,
              placements: current.placements.map((placement) =>
                placement.id === id ? { ...placement, x: point.x, y: point.y } : placement,
              ),
            }));
          }}
          onDrop={(id, point) => {
            update((current) => {
              const bed = current.beds.find((item) => pointInPolygon(point, item.points));
              if (!bed) {
                return {
                  ...current,
                  placements: current.placements.filter((placement) => placement.id !== id),
                };
              }
              return {
                ...current,
                placements: current.placements.map((placement) =>
                  placement.id === id
                    ? { ...placement, x: point.x, y: point.y, bedId: bed.id }
                    : placement,
                ),
              };
            });
            setSelectedPlacementId(null);
          }}
        />
      </div>

      <aside className="space-y-3 border-t border-line p-4 lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl">{activeBed ? `For ${activeBed.name}` : "Plants"}</h2>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={garden.showUnsuitable}
              onChange={(event) =>
                update((current) => ({ ...current, showUnsuitable: event.target.checked }))
              }
            />
            Show unsuitable
          </label>
        </div>
        <p className="text-xs text-ink/60">{aspectNote(garden.site.aspect)}</p>
        {!activeBed ? (
          <p className="text-sm">Draw a bed to see plants that fit its sun and your soil.</p>
        ) : null}
        <ul className="max-h-[70vh] space-y-2 overflow-auto">
          {recommendations.map((verdict) => (
            <li key={verdict.plant.id} className="rounded-md border border-line bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to="/plants/$plantId"
                    params={{ plantId: verdict.plant.id }}
                    className="font-medium hover:text-leaf"
                  >
                    {verdict.plant.commonName}
                  </Link>
                  <p className="text-xs text-ink/60">
                    {KIND_LABEL[verdict.plant.kind]} · {verdict.plant.hardiness}
                  </p>
                </div>
                {verdict.suitable && activeBed ? (
                  <button
                    className={quietButtonClass}
                    type="button"
                    onClick={() => setArmedPlantId(verdict.plant.id)}
                  >
                    Place
                  </button>
                ) : null}
              </div>
              {verdict.suitable ? null : (
                <ul className="mt-2 list-disc pl-4 text-xs text-clay">
                  {verdict.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {garden.placements.length > 0 ? (
          <div>
            <h2 className="text-lg">Planted</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {garden.placements.map((placement) => {
                const plant = getPlant(placement.plantId);
                if (!plant) return null;
                const look = plant.months[month];
                return (
                  <li key={placement.id} className="flex items-center justify-between gap-2">
                    <span>
                      {plant.commonName}
                      <span className="block text-xs text-ink/60">
                        {look?.flower ? look.flower : look?.foliage ? "In leaf" : "Dormant"}
                        {look?.scent ? " · scented" : ""}
                      </span>
                    </span>
                    <button
                      className="text-xs text-clay"
                      type="button"
                      onClick={() =>
                        update((current) => ({
                          ...current,
                          placements: current.placements.filter((item) => item.id !== placement.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ToolButton({
  current,
  tool,
  onClick,
  children,
}: {
  current: Tool;
  tool: Tool;
  onClick: (tool: Tool) => void;
  children: string;
}) {
  return (
    <button
      className={current === tool ? buttonClass : quietButtonClass}
      type="button"
      onClick={() => onClick(tool)}
    >
      {children}
    </button>
  );
}

function resolvedLight(
  bed: Garden["beds"][number],
  samples: ReturnType<typeof midsummerSamples>,
  blocks: ShadeBlock[],
) {
  const stats = bedSun(bed.points, samples, blocks);
  return { ...stats, light: bed.lightOverride ?? stats.light };
}

function blockBetween(id: string, start: Point, end: Point): ShadeBlock {
  return {
    id,
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
    width: Math.max(Math.abs(end.x - start.x), 0.4),
    depth: Math.max(Math.abs(end.y - start.y), 0.4),
    height: 6,
    source: "user",
    label: "Shade block",
  };
}
