import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "#/components/chrome";
import { CreateGarden } from "#/components/create-garden/create-garden";
import { SavedGardens } from "#/components/create-garden/saved-gardens";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Gardens · Garden" }] }),
});

function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <CreateGarden />
        <SavedGardens />
      </main>
    </>
  );
}
