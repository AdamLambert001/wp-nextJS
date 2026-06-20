import { RadiosBoard } from "@/components/radios/radios-board";

export default function RadiosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Radios</h1>
        <p className="mt-2 text-muted-foreground">
          Short-range and long-range radio net reference.
        </p>
      </div>
      <RadiosBoard />
    </main>
  );
}
