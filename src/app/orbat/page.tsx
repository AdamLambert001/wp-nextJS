import { OrbatBoard } from "@/components/orbat/orbat-board";
import { getOrbatCapabilities } from "@/lib/orbat/permissions";
import { getAccess } from "@/lib/rbac/get-access";

export default async function OrbatPage() {
  const access = await getAccess();
  const initialCapabilities = getOrbatCapabilities(access.flags);

  return (
    <main className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">ORBAT</h1>
        <p className="mt-2 text-muted-foreground">
          Unit structure, billets, and assignments.
        </p>
      </div>
      <OrbatBoard initialCapabilities={initialCapabilities} />
    </main>
  );
}
