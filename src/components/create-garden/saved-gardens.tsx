import { useRef, useState } from "react";
import { useGardenList } from "#/lib/use-garden";
import { loadGardens, upsertGarden } from "#/lib/gardens";
import { downloadGarden, gardenForImport, readGardenFile } from "#/lib/garden-transfer";
import { Link } from "@tanstack/react-router";
import { Card } from "#/components/generic/card";
import { Button } from "#/components/generic/button";

export const SavedGardens = () => {
  const { ready, gardens, refresh, remove } = useGardenList();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function importFile(file: File) {
    try {
      const result = readGardenFile(await file.text());
      if (!result.ok) {
        setNotice({ text: result.error, error: true });
        return;
      }
      const saved = gardenForImport(
        result.garden,
        loadGardens().map((garden) => garden.id),
      );
      upsertGarden(saved);
      refresh();
      setNotice({
        text:
          saved.id === result.garden.id
            ? `Imported ${saved.site.name}.`
            : `Imported ${saved.site.name} as a new copy. This browser already had that garden.`,
        error: false,
      });
    } catch {
      setNotice({ text: "That file could not be read.", error: true });
    }
  }

  return (
    <section>
      <h2 className="text-2xl">Saved in this browser</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-sm text-ink/70">
          Export a garden as a file, then import that file on another device.
        </p>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={!ready}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import a garden file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void importFile(file);
          }}
        />
      </div>
      {notice ? (
        <p className={`mt-3 text-sm ${notice.error ? "text-clay" : "text-leaf"}`}>{notice.text}</p>
      ) : null}
      {!ready ? <p className="mt-3 text-sm">Loading gardens…</p> : null}
      {ready && gardens.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">No gardens yet.</p>
      ) : null}
      {gardens.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {gardens.map((garden) => (
            <Card key={garden.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <Link
                  to="/gardens/$gardenId"
                  params={{ gardenId: garden.id }}
                  className="text-xl hover:text-leaf"
                >
                  {garden.site.name}
                </Link>
                <p className="text-sm text-ink/70 pb-2">
                  {garden.site.postcode} · {garden.beds.length} beds · {garden.placements.length}{" "}
                  plants
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => downloadGarden(garden)}>
                  Export
                </Button>
                {pendingDeleteId === garden.id ? (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        remove(garden.id);
                        setPendingDeleteId(null);
                      }}
                    >
                      Confirm delete
                    </Button>
                    <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="danger" onClick={() => setPendingDeleteId(garden.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
