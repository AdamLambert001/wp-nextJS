import { RanksBoard } from "@/components/ranks/ranks-board";

export default function RanksPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Ranks</h1>
        <p className="mt-2 text-muted-foreground">
          Rank structure, cooldowns, and progression requirements.
        </p>
      </div>
      <RanksBoard />
    </main>
  );
}
