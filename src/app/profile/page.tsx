import { ProfileDirectory } from "@/components/profile/profile-directory";

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Profiles</h1>
        <p className="mt-2 text-muted-foreground">
          Personnel service records and public member directory.
        </p>
      </div>
      <ProfileDirectory />
    </main>
  );
}
